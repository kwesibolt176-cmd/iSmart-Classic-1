import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { MerchantApiError, merchantRequest, toErrorResponse } from "../_shared/merchant-api-client.ts";
import { financialReference, normalizeProvider, requireClientRequestId } from "../_shared/financial-request.ts";
import { getMerchantSession, merchantRequestWithSessionRefresh, requirePortalUser, serviceClient } from "../_shared/merchant-session.ts";
import { normalizeVerifiedMsisdn, readVerificationProof, toMerchantMsisdn } from "../_shared/verification-proof.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const user = await requirePortalUser(req, supabase);
    const input = await req.json();
    const amount = Number(input.amount);
    if (!input.businessId || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000 || !/^\d{4,6}$/.test(String(input.pin || ""))) {
      return json({ success: false, error: "business, positive amount and transaction PIN are required" }, 400);
    }
    const requestId = requireClientRequestId(input.clientRequestId);
    const { data: owned, error: ownedError } = await supabase.from("business_profiles")
      .select("id,ismart_business_id,merchant_business_id")
      .eq("id", input.businessId).eq("user_id", user.id).maybeSingle();
    if (ownedError) throw ownedError;
    if (!owned) return json({ success: false, error: "Business access denied" }, 403);
    const session = await getMerchantSession(supabase, user.id);
    if (!session.business_id) return json({ success: false, error: "Merchant business is not linked" }, 409);
    const linkedBusinessId = owned.merchant_business_id || owned.ismart_business_id;
    if (!linkedBusinessId || linkedBusinessId !== session.business_id) {
      return json({ success: false, error: "Merchant session does not match this business" }, 403);
    }

    const reference = financialReference("PAY", requestId);
    const channel = String(input.channel || "MOBILE_MONEY").toUpperCase();
    if (!["MOBILE_MONEY", "BANK", "WALLET"].includes(channel)) {
      return json({ success: false, error: "Unsupported disbursement channel" }, 400);
    }
    if (channel === "BANK") {
      const bankProvider = normalizeProvider(input.bankCode);
      const methods = await merchantRequestWithSessionRefresh(supabase, session, (accessToken) =>
        merchantRequest<{ items?: Array<{ provider?: string; rail?: string }> }>(
          `/v1/businesses/${encodeURIComponent(session.business_id!)}/wallet/payment-methods`,
          { accessToken },
        )
      );
      const supported = (methods.items || []).some((method) =>
        String(method.rail || "").toLowerCase() === "disbursement" &&
        normalizeProvider(method.provider) === bankProvider
      );
      if (!supported) {
        throw new MerchantApiError(422, "unsupported_payment_rail", "Bank disbursement is not supported by the merchant payment processor");
      }
    }
    if (channel === "MOBILE_MONEY") {
      const provider = normalizeProvider(input.provider);
      const destination = normalizeVerifiedMsisdn(input.phoneNumber);
      const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const proof = secret ? await readVerificationProof(String(input.verificationProof || ""), secret) : null;
      if (
        !proof || proof.userId !== user.id || proof.businessId !== input.businessId ||
        proof.merchantBusinessId !== session.business_id || proof.provider !== provider ||
        proof.destination !== destination
      ) {
        throw new MerchantApiError(403, "verification_required", "Verify the mobile money number again before continuing");
      }
    }
    let result: Record<string, unknown>;
    if (channel === "WALLET") {
      const handle = String(input.handle || input.phoneNumber || "").trim();
      if (!handle) return json({ success: false, error: "Recipient handle is required" }, 400);
      result = await merchantRequestWithSessionRefresh(supabase, session, (accessToken) => merchantRequest(`/v1/businesses/${encodeURIComponent(session.business_id!)}/wallet/transfers`, {
        method: "POST",
        accessToken,
        idempotencyKey: `transfer:${reference}`,
        body: { reference, handle, amount: amount.toFixed(2), currency: input.currency || "GHS", pin: input.pin },
      }));
    } else {
      const destination = channel === "BANK"
        ? { type: "account", value: String(input.accountNumber || "") }
        : { type: "msisdn", value: toMerchantMsisdn(input.phoneNumber) };
      const provider = normalizeProvider(input.provider || input.bankCode);
      if (!destination.value || !provider) return json({ success: false, error: "Recipient account and provider are required" }, 400);
      result = await merchantRequestWithSessionRefresh(supabase, session, (accessToken) => merchantRequest(`/v1/businesses/${encodeURIComponent(session.business_id!)}/wallet/payouts`, {
        method: "POST",
        accessToken,
        idempotencyKey: `payout:${reference}`,
        body: {
          reference,
          amount: amount.toFixed(2),
          currency: String(input.currency || "GHS").toUpperCase(),
          provider,
          destination,
          note: String(input.narration || "Payment").slice(0, 50),
          pin: input.pin,
        },
      }));
    }

    const status = String(result.status || "accepted").toLowerCase();
    const completed = ["completed", "delivered"].includes(status);
    const row = {
      business_id: input.businessId,
      amount,
      fee: Number(result.fee || 0),
      total_amount: Number(result.payerAmount || amount),
      recipient_name: input.accountName || `${input.firstName || ""} ${input.lastName || ""}`.trim() || "Recipient",
      recipient_account: input.accountNumber || input.phoneNumber,
      recipient_phone: input.phoneNumber || null,
      recipient_bank_code: channel === "BANK" ? input.bankCode : null,
      recipient_bank_name: channel === "BANK" ? input.provider : null,
      reference,
      provider_reference: null,
      narration: input.narration || "Payment",
      status: ["failed", "declined"].includes(status) ? "failed" : completed ? "completed" : "processing",
      failure_reason: result.failureReason || null,
      processed_at: completed ? new Date().toISOString() : null,
      completed_at: completed ? new Date().toISOString() : null,
      metadata: { merchant_response: result, channel },
    };
    const { data: existing, error: lookupError } = await supabase.from("disbursements")
      .select("id,business_id").eq("reference", reference).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && existing.business_id !== input.businessId) {
      return json({ success: false, error: "Request reference conflict" }, 409);
    }
    const auditWrite = existing
      ? await supabase.from("disbursements").update(row).eq("id", existing.id).eq("business_id", input.businessId)
      : await supabase.from("disbursements").insert(row);
    if (auditWrite.error) {
      return json({ success: false, reference, error: "Transfer was accepted but its audit record could not be saved; contact support with the reference" }, 500);
    }
    return json({ success: !["failed", "declined"].includes(status), reference, message: "Transfer accepted for processing", data: result });
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});

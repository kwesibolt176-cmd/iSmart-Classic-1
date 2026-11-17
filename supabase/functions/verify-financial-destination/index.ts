import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { merchantRequest, toErrorResponse } from "../_shared/merchant-api-client.ts";
import { normalizeProvider } from "../_shared/financial-request.ts";
import { getMerchantSession, merchantRequestWithSessionRefresh, requirePortalUser, serviceClient } from "../_shared/merchant-session.ts";
import { issueVerificationProof, normalizeVerifiedMsisdn, toMerchantMsisdn } from "../_shared/verification-proof.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  try {
    const supabase = serviceClient();
    const user = await requirePortalUser(req, supabase);
    const input = await req.json();
    const businessId = String(input.businessId || "");
    const provider = normalizeProvider(input.provider);
    const destination = normalizeVerifiedMsisdn(input.phoneNumber);
    if (!businessId || !provider || !/^\+233\d{9}$/.test(destination)) {
      return json({ error: "business, provider and a valid Ghana phone number are required" }, 400);
    }

    const { data: business, error: businessError } = await supabase.from("business_profiles")
      .select("id,ismart_business_id,merchant_business_id")
      .eq("id", businessId).eq("user_id", user.id).maybeSingle();
    if (businessError) throw businessError;
    if (!business) return json({ error: "Business access denied" }, 403);

    const session = await getMerchantSession(supabase, user.id);
    if (!session.business_id) return json({ error: "Merchant business is not linked" }, 409);
    const linkedBusinessId = business.merchant_business_id || business.ismart_business_id;
    if (!linkedBusinessId || linkedBusinessId !== session.business_id) {
      return json({ error: "Merchant session does not match this business" }, 403);
    }

    const lookup = await merchantRequestWithSessionRefresh(supabase, session, (accessToken) =>
      merchantRequest<{ name: string; active: boolean; provider: string }>(
        `/v1/businesses/${encodeURIComponent(session.business_id!)}/wallet/party-lookups`,
        { accessToken, query: { provider, partyValue: toMerchantMsisdn(destination) } },
      ),
    );
    if (!lookup.active || !lookup.name) return json({ error: "The mobile money account is not active" }, 422);

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret) return json({ error: "Verification is temporarily unavailable" }, 503);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const verificationProof = await issueVerificationProof({
      purpose: "financial_destination",
      userId: user.id,
      businessId,
      merchantBusinessId: session.business_id,
      channel: "mobile",
      provider,
      destination,
      accountName: lookup.name,
      expiresAt,
    }, secret);

    return json({
      success: true,
      verificationProof,
      expiresAt: new Date(expiresAt).toISOString(),
      data: { accountName: lookup.name, accountname: lookup.name, provider: lookup.provider, active: lookup.active },
    });
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});

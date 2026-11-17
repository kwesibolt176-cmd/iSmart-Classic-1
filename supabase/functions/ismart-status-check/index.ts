import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { merchantRequest, toErrorResponse } from "../_shared/merchant-api-client.ts";
import { getMerchantSession, merchantRequestWithSessionRefresh, requirePortalUser, serviceClient } from "../_shared/merchant-session.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const mapStatus = (status: string) => {
  if (["settled", "delivered", "completed"].includes(status)) return "completed";
  if (["failed", "expired", "declined", "refunded"].includes(status)) return "failed";
  return "pending";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const input = req.method === "GET"
      ? Object.fromEntries(new URL(req.url).searchParams.entries())
      : await req.json();
    const reference = String(input.referenceId || input.reference || "").trim();
    if (!reference) return json({ success: false, error: "referenceId is required" }, 400);
    const supabase = serviceClient();
    const portalUser = await requirePortalUser(req, supabase);

    const { data: collection } = await supabase.from("collections")
      .select("id,business_id,status").eq("reference", reference).maybeSingle();
    const { data: payout } = collection ? { data: null } : await supabase.from("disbursements")
      .select("id,business_id,status,metadata").eq("reference", reference).maybeSingle();
    const record = collection || payout;
    if (!record) return json({ success: false, status: "pending", error: "Transaction was not found" }, 404);
    const { data: business } = await supabase.from("business_profiles")
      .select("user_id").eq("id", record.business_id).maybeSingle();
    if (!business) return json({ success: false, status: "pending", error: "Merchant was not found" }, 404);
    if (business.user_id !== portalUser.id) {
      return json({ success: false, error: "Transaction access is not permitted" }, 403);
    }
    const session = await getMerchantSession(supabase, business.user_id);
    if (!session.business_id) return json({ success: false, status: "pending", error: "Merchant business is not linked" }, 409);

    const resource = collection
      ? "collections"
      : (payout?.metadata as { channel?: string } | null)?.channel === "WALLET" ? "transfers" : "payouts";
    const data = await merchantRequestWithSessionRefresh(supabase, session, (accessToken) =>
      merchantRequest<Record<string, unknown>>(
        `/v1/businesses/${encodeURIComponent(session.business_id!)}/wallet/${resource}/${encodeURIComponent(reference)}`,
        { accessToken },
      ),
    );
    const rawStatus = String(data.status || "").toLowerCase();
    const status = mapStatus(rawStatus);
    if (collection) {
      await supabase.from("collections").update({
        status: status === "completed" ? "completed" : status,
        provider_reference: data.reference || null,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        failure_reason: status === "failed" ? data.failureReason || rawStatus : null,
      }).eq("id", collection.id);
    } else if (payout) {
      await supabase.from("disbursements").update({
        status: status === "completed" ? "completed" : status,
        failure_reason: status === "failed" ? data.failureReason || rawStatus : null,
        processed_at: status === "completed" ? new Date().toISOString() : null,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }).eq("id", payout.id);
    }
    return json({ success: true, reference, status, rawStatus });
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});

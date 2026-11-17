import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { MerchantApiError, merchantRequest, refreshMerchantSession } from "../_shared/merchant-api-client.ts";
import { serviceClient } from "../_shared/merchant-session.ts";
import { decryptSessionToken, encryptSessionToken, sessionEncryptionSecret } from "../_shared/session-crypto.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

const localStatus = (status: string) => {
  if (["settled", "delivered", "completed"].includes(status)) return "completed";
  if (["failed", "expired", "declined", "refunded"].includes(status)) return "failed";
  return "pending";
};

const reconciliationSecret = async () => {
  const configured = Deno.env.get("MERCHANT_RECONCILIATION_SECRET");
  if (configured) return configured;

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) return null;
  const source = new TextEncoder().encode(`merchant-reconciliation:v1:${serviceRoleKey}`);
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const expected = await reconciliationSecret();
  if (!expected || req.headers.get("X-Reconciliation-Secret") !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = serviceClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [collectionsResult, payoutsResult] = await Promise.all([
    supabase.from("collections").select("id,business_id,reference").in("status", ["pending", "processing"]).gte("created_at", cutoff).limit(100),
    supabase.from("disbursements").select("id,business_id,reference,metadata").in("status", ["pending", "processing"]).gte("created_at", cutoff).limit(100),
  ]);
  if (collectionsResult.error || payoutsResult.error) return json({ error: "could not load pending transactions" }, 500);

  const records = [
    ...(collectionsResult.data || []).map((item) => ({ ...item, rail: "collections", table: "collections" })),
    ...(payoutsResult.data || []).map((item) => ({
      ...item,
      rail: (item.metadata as { channel?: string } | null)?.channel === "WALLET" ? "transfers" : "payouts",
      table: "disbursements",
    })),
  ];
  const businessIds = [...new Set(records.map((item) => item.business_id))];
  const { data: businesses } = await supabase.from("business_profiles").select("id,user_id").in("id", businessIds);
  const ownerByBusiness = new Map((businesses || []).map((item) => [item.id, item.user_id]));
  const ownerIds = [...new Set(ownerByBusiness.values())];
  const { data: sessions } = await supabase.from("merchant_api_sessions")
    .select("user_id,business_id,access_token,refresh_token").in("user_id", ownerIds);
  const encryptionSecret = sessionEncryptionSecret();
  const decryptedSessions = await Promise.all((sessions || []).map(async (item) => ({
    ...item,
    access_token: await decryptSessionToken(item.access_token, encryptionSecret),
    refresh_token: await decryptSessionToken(item.refresh_token, encryptionSecret),
  })));
  const sessionByOwner = new Map(decryptedSessions.map((item) => [item.user_id, item]));

  let reconciled = 0;
  let failed = 0;
  for (const record of records) {
    const ownerId = ownerByBusiness.get(record.business_id);
    let session = ownerId ? sessionByOwner.get(ownerId) : undefined;
    if (!session?.business_id) { failed++; continue; }
    const path = `/v1/businesses/${encodeURIComponent(session.business_id)}/wallet/${record.rail}/${encodeURIComponent(record.reference)}`;
    try {
      let upstream;
      try {
        upstream = await merchantRequest<Record<string, unknown>>(path, { accessToken: session.access_token });
      } catch (error) {
        if (!(error instanceof Error) || !("status" in error) || (error as { status?: number }).status !== 401) throw error;
        let refreshed;
        try {
          refreshed = await refreshMerchantSession(session.refresh_token);
        } catch (refreshError) {
          if (refreshError instanceof MerchantApiError && [400, 401, 403].includes(refreshError.status)) {
            await supabase.from("merchant_api_sessions").delete().eq("user_id", session.user_id);
          }
          throw refreshError;
        }
        session = { ...session, access_token: refreshed.tokens.access_token, refresh_token: refreshed.tokens.refresh_token };
        const { error: updateError } = await supabase.from("merchant_api_sessions").update({
          access_token: await encryptSessionToken(session.access_token, encryptionSecret),
          refresh_token: await encryptSessionToken(session.refresh_token, encryptionSecret),
          access_expires_at: refreshed.tokens.expires_at || null,
          updated_at: new Date().toISOString(),
        }).eq("user_id", session.user_id);
        if (updateError) throw updateError;
        upstream = await merchantRequest<Record<string, unknown>>(path, { accessToken: session.access_token });
      }
      const rawStatus = String(upstream.status || "").toLowerCase();
      const status = localStatus(rawStatus);
      if (status !== "pending") {
        const update = record.table === "collections"
          ? { status, completed_at: status === "completed" ? new Date().toISOString() : null, failure_reason: status === "failed" ? String(upstream.failureReason || rawStatus) : null }
          : {
            status,
            processed_at: status === "completed" ? new Date().toISOString() : null,
            completed_at: status === "completed" ? new Date().toISOString() : null,
            failure_reason: status === "failed" ? String(upstream.failureReason || rawStatus) : null,
          };
        const { error } = await supabase.from(record.table).update(update).eq("id", record.id).in("status", ["pending", "processing"]);
        if (error) throw error;
        reconciled++;
      }
    } catch {
      failed++;
    }
  }
  return json({ checked: records.length, reconciled, failed });
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_BASE = "https://gateway.ismartpay.org/auth-service/api";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeNetwork = (operator?: string) => {
  const v = (operator || "").toLowerCase().trim();
  if (v.includes("mtn")) return "mtn";
  if (v.includes("telecel") || v.includes("vodafone")) return "telecel";
  if (v.includes("airtel") || v.includes("tigo") || v === "at") return "airteltigo";
  return v || "mtn";
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      channel,
      mobile_number,
      account_number,
      bank_code,
      operator,
      ismartAccessToken,
    } = body ?? {};

    let token: string | undefined =
      ismartAccessToken ||
      req.headers.get("x-ismart-token") ||
      undefined;

    // Fallback: use the platform API key when the caller has no live session
    let apiKey: string | undefined;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/system_settings?setting_key=eq.secret_ismart_ismart_api_key&select=setting_value`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
        );
        const rows = await res.json();
        let raw = Array.isArray(rows) ? rows[0]?.setting_value : null;
        if (typeof raw === "string") raw = raw.replace(/^"|"$/g, "").trim();
        if (raw) {
          try {
            apiKey = atob(raw);
          } catch {
            apiKey = raw; // already plaintext
          }
        }
      }
    } catch (e) {
      console.error("[iverify] api key lookup failed", e instanceof Error ? e.name : "unknown_error");
    }


    if (!token) token = apiKey;

    if (!token) {
      return json(
        { error: "Your session has expired. Please sign in again to verify accounts." },
        401,
      );
    }


    if (!channel || !["mobile", "bank"].includes(channel)) {
      return json({ error: "Invalid channel. Must be 'mobile' or 'bank'." }, 400);
    }

    let path: string;
    let payload: Record<string, string>;

    if (channel === "mobile") {
      if (!mobile_number) {
        return json({ error: "Mobile verification requires a phone number" }, 400);
      }
      path = "/account/verify-phone";
      payload = {
        phoneNumber: String(mobile_number).trim(),
        network: normalizeNetwork(operator),
      };
    } else {
      if (!account_number || !bank_code) {
        return json(
          { error: "Bank verification requires account_number and bank_code" },
          400,
        );
      }
      path = "/account/verify-bank";
      payload = {
        accountNumber: String(account_number).trim(),
        bankCode: String(bank_code).trim().toUpperCase(),
      };
    }

    const callUpstream = (bearer: string) =>
      fetch(`${GATEWAY_BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify(payload),
      });

    let upstream = await callUpstream(token);
    let rawText = await upstream.text();

    // Session token rejected — retry once with the platform API key
    if ((upstream.status === 401 || upstream.status === 403) && apiKey && apiKey !== token) {
      upstream = await callUpstream(apiKey);
      rawText = await upstream.text();
    }


    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return json(
        {
          error: "Verification service returned an invalid response",
        },
        upstream.ok ? 502 : upstream.status,
      );
    }

    const name = parsed?.data?.name;
    const code = parsed?.code;

    if (!upstream.ok || (code && code !== "00") || !name) {
      return json(
        {
          error:
            parsed?.message ||
            parsed?.error ||
            "Could not verify account details",
          code,
        },
        upstream.ok ? 422 : upstream.status,
      );
    }

    // Response shape kept backwards compatible with existing callers
    return json({
      success: true,
      code,
      message: parsed?.message,
      bank_name: parsed?.data?.bank_name ?? null,
      data: {
        name,
        accountname: name,
        account_name: name,
        accountName: name,
        network: parsed?.data?.network ?? null,
        bank_name: parsed?.data?.bank_name ?? null,
        bank_code: parsed?.data?.bank_code ?? null,
        internal: parsed?.data?.internal ?? false,
      },
    });
  } catch (error: any) {
    console.error("iVerify error:", error);
    return json({ error: error.message }, 500);
  }
});

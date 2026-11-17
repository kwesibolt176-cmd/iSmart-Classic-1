import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { merchantApiUrl, MerchantApiError, toErrorResponse } from "../_shared/merchant-api-client.ts";
import { getMerchantSession, refreshStoredMerchantSession, requirePortalUser, serviceClient } from "../_shared/merchant-session.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Type, Content-Length",
};

type BinaryOperation = { path: string; public?: boolean };
const operations: Record<string, BinaryOperation> = {
  businessLogo: { path: "/v1/businesses/{id}/logo/content" },
  invoicePdf: { path: "/v1/businesses/{id}/invoices/{invoiceId}/pdf" },
  publicCheckoutLogo: { path: "/v1/public/checkouts/{token}/logo", public: true },
  publicCheckoutInvoicePdf: { path: "/v1/public/checkouts/{token}/invoice.pdf", public: true },
};

const interpolate = (template: string, values: URLSearchParams) =>
  template.replace(/\{([A-Za-z]+)\}/g, (_, key: string) => {
    const value = values.get(key);
    if (!value) throw new MerchantApiError(400, "invalid_input", `missing path parameter: ${key}`);
    return encodeURIComponent(value);
  });

const relay = async (path: string, accessToken?: string) => {
  const response = await fetch(merchantApiUrl(path), {
    headers: {
      Accept: "application/pdf,image/png,image/jpeg,application/octet-stream",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  return response;
};

const responseFromUpstream = (response: Response) => {
  const headers = new Headers(corsHeaders);
  for (const name of ["Content-Type", "Content-Disposition", "Content-Length", "Content-Security-Policy", "Retry-After"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { status: response.status, headers });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return new Response("method not allowed", { status: 405, headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const operation = operations[url.searchParams.get("operation") || ""];
    if (!operation) throw new MerchantApiError(400, "invalid_operation", "unsupported binary operation");
    const path = interpolate(operation.path, url.searchParams);
    if (operation.public) return responseFromUpstream(await relay(path));

    const supabase = serviceClient();
    const user = await requirePortalUser(req, supabase);
    let session = await getMerchantSession(supabase, user.id);
    if (!session.business_id || url.searchParams.get("id") !== session.business_id) {
      throw new MerchantApiError(403, "forbidden", "business access is not permitted");
    }
    let response = await relay(path, session.access_token);
    if (response.status === 401) {
      await response.body?.cancel();
      session = await refreshStoredMerchantSession(supabase, session);
      response = await relay(path, session.access_token);
    }
    return responseFromUpstream(response);
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});

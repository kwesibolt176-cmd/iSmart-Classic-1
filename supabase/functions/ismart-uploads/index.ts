import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { merchantApiUrl, merchantRequest, toErrorResponse } from "../_shared/merchant-api-client.ts";
import { getMerchantSession, requirePortalUser, serviceClient } from "../_shared/merchant-session.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const findString = (value: unknown, keys: string[], depth = 0): string | undefined => {
  if (!value || typeof value !== "object" || depth > 5) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) if (typeof record[key] === "string") return record[key] as string;
  for (const nested of Object.values(record)) {
    const found = findString(nested, keys, depth + 1);
    if (found) return found;
  }
  return undefined;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const user = await requirePortalUser(req, supabase);
    const session = await getMerchantSession(supabase, user.id);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "A file is required" }, 400);
    if (file.size > 5 * 1024 * 1024) return json({ error: "File is too large — maximum size is 5MB" }, 400);
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      return json({ error: "Only JPEG, PNG and PDF files are supported" }, 415);
    }
    const target = String(form.get("target") || "");

    if (target === "logo") {
      if (!session.business_id) return json({ error: "Merchant business is not linked" }, 409);
      const upstream = new FormData();
      upstream.append("file", file, file.name);
      const response = await fetch(merchantApiUrl(`/v1/businesses/${encodeURIComponent(session.business_id)}/logo`), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: upstream,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) return json(payload || { error: "Logo upload failed" }, response.status);
      return json({ success: true, data: payload });
    }

    const documentType = String(form.get("document_type") || form.get("doc_type") || "");
    const claim = await merchantRequest<Record<string, unknown>>("/v1/compliance/documents", {
      method: "POST",
      accessToken: session.access_token,
      body: {
        document_type: documentType,
        part: form.get("part") || undefined,
        business_id: session.business_id || undefined,
        file_name: file.name,
        content_type: file.type,
        size: file.size,
      },
    });
    const uploadUrl = findString(claim, ["upload_url", "uploadUrl", "presigned_url", "presignedUrl", "url"]);
    const documentId = findString(claim, ["document_id", "documentId", "id"]);
    if (!uploadUrl || !documentId) return json({ error: "Document service did not return an upload ticket" }, 502);
    const uploaded = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploaded.ok) return json({ error: "Document upload failed" }, 502);
    const confirmed = await merchantRequest(`/v1/compliance/documents/${encodeURIComponent(documentId)}/confirm`, {
      method: "POST",
      accessToken: session.access_token,
    });
    return json({ success: true, data: confirmed });
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});

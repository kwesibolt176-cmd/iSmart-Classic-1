import { supabase } from "@/integrations/supabase/client";

const baseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const fetchMerchantBinary = async (
  operation: "businessLogo" | "invoicePdf" | "publicCheckoutLogo" | "publicCheckoutInvoicePdf",
  path: Record<string, string>,
) => {
  const url = new URL(`${baseUrl}/functions/v1/merchant-binary`);
  url.searchParams.set("operation", operation);
  Object.entries(path).forEach(([key, value]) => url.searchParams.set(key, value));
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(url, {
    headers: {
      apikey: publishableKey,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || `Download failed (${response.status})`);
  }
  return {
    blob: await response.blob(),
    contentType: response.headers.get("Content-Type") || "application/octet-stream",
    contentDisposition: response.headers.get("Content-Disposition"),
  };
};

export const downloadMerchantBinary = async (
  operation: Parameters<typeof fetchMerchantBinary>[0],
  path: Record<string, string>,
  fallbackName: string,
) => {
  const result = await fetchMerchantBinary(operation, path);
  const match = result.contentDisposition?.match(/filename="?([^";]+)"?/i);
  const objectUrl = URL.createObjectURL(result.blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = match?.[1] || fallbackName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

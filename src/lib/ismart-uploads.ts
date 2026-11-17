import { supabase } from "@/integrations/supabase/client";

export type KycDocumentType = "GHANA_CARD" | "PROOF_OF_ADDRESS" | "ENHANCED_DOC";
export type BusinessDocType = "COI_DOC" | "BRC_DOC" | "BL_DOC" | "OP_DOC" | "POA_DOC";
type UploadFields = Record<string, string>;

const uploadToMerchantApi = async (file: File, fields: UploadFields) => {
  const body = new FormData();
  body.append("file", file, file.name);
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));
  const { data, error } = await supabase.functions.invoke("ismart-uploads", { body });
  if (error) throw new Error(error.message || "Upload to iSmartPay failed");
  return data?.data;
};

export const uploadKycDocument = (
  file: File,
  documentType: KycDocumentType,
  part: "front" | "back" = "front",
  usertype: "customer" | "business_contact" = "business_contact",
) => uploadToMerchantApi(file, { target: "kyc_doc", document_type: documentType, part, usertype });

export const uploadBusinessDocument = (file: File, docType: BusinessDocType, businessId: string) =>
  uploadToMerchantApi(file, { target: "business_doc", doc_type: docType, businessId });

export const uploadBusinessLogo = (file: File, businessId: string) =>
  uploadToMerchantApi(file, { target: "logo", businessId });

export async function mirrorDocumentToISmart(key: string, file: File, businessIdOverride?: string) {
  const businessId = businessIdOverride || localStorage.getItem("ismart_business_id") || undefined;
  const normalizedKey = key.replace(/_verified$/, "");
  switch (normalizedKey) {
    case "ghana_card_front": return uploadKycDocument(file, "GHANA_CARD", "front");
    case "ghana_card_back": return uploadKycDocument(file, "GHANA_CARD", "back");
    case "certificate_of_incorporation": return businessId ? uploadBusinessDocument(file, "COI_DOC", businessId) : null;
    case "business_registration": return businessId ? uploadBusinessDocument(file, "BRC_DOC", businessId) : null;
    case "business_license": return businessId ? uploadBusinessDocument(file, "BL_DOC", businessId) : null;
    case "operating_permit": return businessId ? uploadBusinessDocument(file, "OP_DOC", businessId) : null;
    case "proof_of_address": return businessId ? uploadBusinessDocument(file, "POA_DOC", businessId) : null;
    default: return null;
  }
}

export type BulkPushResult = {
  total: number;
  pushed: string[];
  deferred: string[];
  failed: { key: string; error: string }[];
};

export async function bulkPushStoredDocuments(
  documents: Record<string, { path?: string; file_name?: string }> | null | undefined,
  businessIdOverride?: string,
): Promise<BulkPushResult> {
  const entries = Object.entries(documents || {}).filter(([, document]) => !!document?.path);
  const result: BulkPushResult = { total: entries.length, pushed: [], deferred: [], failed: [] };
  for (const [key, document] of entries) {
    try {
      const { data, error } = await supabase.storage.from("kyc-documents").download(document.path as string);
      if (error || !data) throw new Error(error?.message || "Stored file could not be read");
      const file = new File([data], document.file_name || `${key}.jpg`, { type: data.type || "application/octet-stream" });
      const mirrored = await mirrorDocumentToISmart(key, file, businessIdOverride);
      if (mirrored === null) result.deferred.push(key);
      else result.pushed.push(key);
    } catch (error) {
      result.failed.push({ key, error: error instanceof Error ? error.message : "Upload failed" });
    }
  }
  return result;
}

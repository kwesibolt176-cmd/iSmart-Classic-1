import { supabase } from "@/integrations/supabase/client";
import { callMerchantApi } from "@/lib/merchant-api";

const STORAGE_KEY = "ismart_business_id";

/**
 * Single source of truth for the iSmart business id. Checks localStorage first,
 * then the stored business profile, and keeps both in sync so KYC document
 * mirroring and business-info pushes never silently skip.
 */
export function resolveISmartBusinessId(profile?: any): string | null {
  const fromProfile = profile?.merchant_business_id || profile?.ismart_business_id || null;
  const fromStorage = localStorage.getItem(STORAGE_KEY);

  if (fromProfile && fromProfile !== fromStorage) {
    localStorage.setItem(STORAGE_KEY, fromProfile);
    return fromProfile;
  }
  return fromProfile || fromStorage || null;
}

/** Persist the iSmart business id on the profile so it survives new devices. */
export async function persistISmartBusinessId(userId: string, businessId: string) {
  if (!userId || !businessId) return;
  localStorage.setItem(STORAGE_KEY, businessId);
  await supabase
    .from("business_profiles")
    .update({ ismart_business_id: businessId, merchant_business_id: businessId } as any)
    .eq("user_id", userId);
}

const findBusinessId = (value: unknown, depth = 0): string | null => {
  if (!value || typeof value !== "object" || depth > 5) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["businessId", "business_id", "businessID", "id"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number") return String(candidate);
  }
  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") {
      const found = findBusinessId(nested, depth + 1);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Returns the iSmart business id, recovering it from the upstream profile and
 * backfilling it onto the business profile when it was never stored locally.
 */
export async function ensureISmartBusinessId(profile?: any): Promise<string | null> {
  const existing = resolveISmartBusinessId(profile);
  if (existing) return existing;

  try {
    const data = await callMerchantApi<Record<string, unknown>>("authMe");
    const businessId = findBusinessId(data);
    if (!businessId) return null;
    if (profile?.user_id) await persistISmartBusinessId(profile.user_id, businessId);
    else localStorage.setItem(STORAGE_KEY, businessId);
    return businessId;
  } catch {
    return null;
  }
}

/** Push business registration details to the iSmart business API. */
export async function pushBusinessInfoToISmart(
  businessId: string | null,
  data: Record<string, unknown>
) {
  if (!businessId) return { success: false, skipped: true } as const;
  return callMerchantApi("updateBusiness", { path: { id: businessId }, body: data });
}

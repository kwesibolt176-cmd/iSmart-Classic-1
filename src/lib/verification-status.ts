export interface VerificationFlags {
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  certificate_of_incorporation_verified?: boolean | null;
  ghana_card_front_verified?: boolean | null;
  ghana_card_back_verified?: boolean | null;
  business_registration_verified?: boolean | null;
  business_license_verified?: boolean | null;
  operating_permit_verified?: boolean | null;
  proof_of_address_verified?: boolean | null;
  identity_verified?: boolean | null;
  address_verified?: boolean | null;
  verification_level?: number | null;
  status?: string | null;
}

/**
 * Mirrors the `compute_verification_level` database trigger exactly so the
 * badge, the KYC page and the backend can never disagree on the level.
 */
export function deriveVerificationLevel(v?: VerificationFlags | null): number {
  if (!v) return 0;

  const l1 = Boolean(v.email_verified && v.phone_verified) || Boolean(v.identity_verified);
  const l2 =
    Boolean(v.certificate_of_incorporation_verified) &&
    Boolean(v.ghana_card_front_verified) &&
    Boolean(v.ghana_card_back_verified) &&
    Boolean(v.business_registration_verified);
  const l3 =
    Boolean(v.business_license_verified) &&
    Boolean(v.operating_permit_verified) &&
    Boolean(v.proof_of_address_verified);

  if (l1 && l2 && l3) return 3;
  if (l1 && l2) return 2;
  if (l1) return 1;
  return 0;
}

export function levelStepsCompleted(v?: VerificationFlags | null) {
  const level = deriveVerificationLevel(v);
  return {
    level,
    step1: level >= 1,
    step2: level >= 2,
    step3: level >= 3,
  };
}

/**
 * The Merchant API is authoritative whenever it returned a level. Local data
 * is only a fallback for offline/unavailable upstream requests.
 */
export function effectiveVerificationLevel(
  v?: VerificationFlags | null,
  upstreamLevel?: number | null
): number {
  const stored = Number(v?.verification_level ?? 0) || 0;
  if (upstreamLevel !== null && upstreamLevel !== undefined && Number.isFinite(Number(upstreamLevel))) {
    return Math.max(0, Math.floor(Number(upstreamLevel)));
  }
  return Math.max(stored, deriveVerificationLevel(v));
}

/** Parse both the current direct Merchant API contract and legacy envelopes. */
export function parseUpstreamVerification(response: any): {
  level: number;
  status?: string;
  tierName?: string;
  transactionLimit?: number;
  flags: VerificationFlags;
} | null {
  if (!response || response?.success === false) return null;
  const unwrapped = response?.data?.data ?? response?.data ?? response;
  const tier = unwrapped?.tier ?? unwrapped?.verificationTier ?? unwrapped?.verification_tier;
  const payload = typeof tier === "object" && tier !== null ? { ...unwrapped, ...tier } : unwrapped;
  const rawLevel = payload?.verificationLevel ?? payload?.verification_level ?? payload?.level ?? payload?.kycLevel ?? payload?.kyc_level;
  const level = Number(rawLevel);
  if (!Number.isFinite(level)) return null;
  const limit = Number(payload?.transactionLimit ?? payload?.transaction_limit ?? payload?.limit ?? NaN);
  return {
    level: Math.max(0, Math.floor(level)),
    status: typeof payload?.status === "string" ? payload.status : undefined,
    tierName: typeof payload?.name === "string" ? payload.name
      : typeof payload?.tierName === "string" ? payload.tierName
      : typeof payload?.tier_name === "string" ? payload.tier_name
      : undefined,
    transactionLimit: Number.isNaN(limit) ? undefined : limit,
    flags: {
      email_verified: payload?.emailVerified ?? payload?.email_verified ?? null,
      phone_verified: payload?.phoneVerified ?? payload?.phone_verified ?? null,
      identity_verified: payload?.identityVerified ?? payload?.identity_verified ?? null,
      business_registration_verified: payload?.businessRegistrationVerified ?? payload?.business_registration_verified ?? null,
      address_verified: payload?.addressVerified ?? payload?.address_verified ?? null,
    },
  };
}

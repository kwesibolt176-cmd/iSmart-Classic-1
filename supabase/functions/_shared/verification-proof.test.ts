import { describe, expect, it } from "vitest";
import { issueVerificationProof, normalizeVerifiedMsisdn, readVerificationProof, toMerchantMsisdn } from "./verification-proof";

const payload = {
  purpose: "financial_destination" as const,
  userId: "user-1",
  businessId: "business-1",
  merchantBusinessId: "merchant-1",
  channel: "mobile" as const,
  provider: "mtn",
  destination: "+233241234567",
  accountName: "Test Customer",
  expiresAt: Date.now() + 60_000,
};

describe("financial verification proofs", () => {
  it("authenticates an unchanged proof", async () => {
    const proof = await issueVerificationProof(payload, "secret");
    await expect(readVerificationProof(proof, "secret")).resolves.toEqual(payload);
  });

  it("rejects tampering and expiry", async () => {
    const proof = await issueVerificationProof(payload, "secret");
    await expect(readVerificationProof(`${proof}x`, "secret")).resolves.toBeNull();
    const expired = await issueVerificationProof({ ...payload, expiresAt: Date.now() - 1 }, "secret");
    await expect(readVerificationProof(expired, "secret")).resolves.toBeNull();
  });

  it("normalizes supported Ghana phone formats", () => {
    expect(normalizeVerifiedMsisdn("024 123 4567")).toBe("+233241234567");
    expect(normalizeVerifiedMsisdn("+233241234567")).toBe("+233241234567");
  });

  it("formats Merchant API MSISDNs without a leading plus sign", () => {
    expect(toMerchantMsisdn("054 785 1858")).toBe("233547851858");
    expect(toMerchantMsisdn("+233547851858")).toBe("233547851858");
  });
});

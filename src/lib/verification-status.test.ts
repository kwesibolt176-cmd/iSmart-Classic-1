import { describe, expect, it } from "vitest";
import { effectiveVerificationLevel, parseUpstreamVerification } from "./verification-status";

describe("Merchant verification status", () => {
  it("parses the direct Merchant API response", () => {
    expect(parseUpstreamVerification({
      verificationLevel: 2,
      tier: { name: "Tier 2", transactionLimit: "50000" },
      status: "verified",
    })).toMatchObject({ level: 2, tierName: "Tier 2", transactionLimit: 50000 });
  });

  it("continues to parse legacy response envelopes", () => {
    expect(parseUpstreamVerification({ success: true, data: { verification_level: 1 } })?.level).toBe(1);
  });

  it("treats the live Merchant API level as authoritative", () => {
    expect(effectiveVerificationLevel({ verification_level: 3 }, 1)).toBe(1);
  });

  it("falls back to local verification only when upstream is unavailable", () => {
    expect(effectiveVerificationLevel({ verification_level: 2 }, null)).toBe(2);
  });
});

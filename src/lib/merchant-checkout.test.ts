import { describe, expect, it } from "vitest";
import { buildCheckoutRequest, checkoutEligibilityMessage } from "./merchant-checkout";

describe("Merchant hosted checkout", () => {
  it("builds a reusable fixed-amount checkout using decimal strings", () => {
    expect(buildCheckoutRequest({ reference: "PL_123", title: "Invoice", fixedAmount: true, amount: 12.5 }))
      .toMatchObject({ amountType: "fixed", amount: "12.50", currency: "GHS", usage: "reusable" });
  });

  it("omits the amount for an open checkout", () => {
    expect(buildCheckoutRequest({ reference: "PL_123", title: "Donation", fixedAmount: false }).amount).toBeNull();
  });

  it("explains an ineligible verification tier", () => {
    expect(checkoutEligibilityMessage({
      enabled: false, ready: false, environment: "live", eligible: { ok: false, reason: "tier_below_2" },
    })).toContain("tier 2");
  });
});

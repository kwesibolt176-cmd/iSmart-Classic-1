import { describe, expect, it } from "vitest";
import { normalizeLoyaltyBenefits } from "./loyalty-benefits";

describe("normalizeLoyaltyBenefits", () => {
  it("trims entries and removes blank lines", () => {
    expect(normalizeLoyaltyBenefits(" Priority support \n\n Free delivery\r\n  ")).toEqual([
      "Priority support",
      "Free delivery",
    ]);
  });
});

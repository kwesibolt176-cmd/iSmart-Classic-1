import { describe, expect, it } from "vitest";
import { joinMerchantApiUrl } from "./merchant-api-url";

describe("joinMerchantApiUrl", () => {
  it("preserves the production API prefix", () => {
    expect(joinMerchantApiUrl("https://merchant.ismartghana.com/api", "/v1/auth/me").toString())
      .toBe("https://merchant.ismartghana.com/api/v1/auth/me");
  });

  it("supports a host-only staging base", () => {
    expect(joinMerchantApiUrl("https://stgmerchant-api.ismartghana.com/", "v1/auth/me").toString())
      .toBe("https://stgmerchant-api.ismartghana.com/v1/auth/me");
  });
});

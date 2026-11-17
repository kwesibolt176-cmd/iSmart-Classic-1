import { describe, expect, it } from "vitest";
import { resolveCampaignVariables } from "./campaign-html";

describe("resolveCampaignVariables", () => {
  it("resolves both supported placeholder styles", () => {
    expect(
      resolveCampaignVariables("Hello {{customer_name}} from {business_name}", {
        customer_name: "Ama",
        business_name: "iSmart",
      }),
    ).toBe("Hello Ama from iSmart");
  });

  it("uses an empty value for unknown placeholders", () => {
    expect(resolveCampaignVariables("Points: {{points_balance}}", {})).toBe("Points: ");
  });
});

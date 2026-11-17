import { describe, expect, it } from "vitest";
import { walletBalanceFromProvisioning } from "./merchant-wallet-utils";

describe("walletBalanceFromProvisioning", () => {
  it("reads the GHS balance from the main Merchant wallet account", () => {
    expect(walletBalanceFromProvisioning({
      reference: "wallet-1",
      status: "ready",
      accounts: [{ name: "main", status: "active", balances: { GHS: "125.75" } }],
    })).toBe(125.75);
  });

  it("does not turn a missing remote balance into zero", () => {
    expect(walletBalanceFromProvisioning({ reference: "wallet-1", status: "ready", accounts: [] })).toBeNull();
  });
});

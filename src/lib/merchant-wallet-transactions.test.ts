import { describe, expect, it } from "vitest";
import { mergeWalletTransactions, normalizeMerchantWalletTransactions } from "./merchant-wallet-transactions";

describe("merchant wallet transactions", () => {
  it("normalizes a paginated Merchant API response", () => {
    const result = normalizeMerchantWalletTransactions({
      items: [{
        id: "txn-1",
        rail: "payout",
        amount: { amount: "101.75", currency: "GHS" },
        fee: "1.75",
        reference: "PAY-001",
        state: "COMPLETED",
        createdAt: "2026-10-17T12:00:00.000Z",
      }],
    });

    expect(result).toEqual([expect.objectContaining({
      id: "api-txn-1",
      transaction_type: "disbursement",
      amount: 101.75,
      fee: 1.75,
      reference: "PAY-001",
      status: "completed",
      source: "merchant_api",
    })]);
  });

  it("prefers the Merchant API record when a local reference is duplicated", () => {
    const api = normalizeMerchantWalletTransactions({ items: [{
      id: "remote", reference: "same-ref", type: "collection", amount: "20", status: "completed",
      created_at: "2026-10-17T12:00:00.000Z",
    }] });
    const local = [{ ...api[0], id: "local", amount: 10, status: "pending", source: "local" as const }];

    expect(mergeWalletTransactions(api, local)).toHaveLength(1);
    expect(mergeWalletTransactions(api, local)[0]).toMatchObject({ id: "api-remote", amount: 20, status: "completed" });
  });
});

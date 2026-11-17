import { describe, expect, it } from "vitest";
import { buildAccountingMonths, merchantNetCashFlow, percentageChange } from "./accounting";

describe("accounting calculations", () => {
  it("buckets sales, invoice receipts and expenses once by month", () => {
    const months = buildAccountingMonths(
      [{ amount: "100", date: "2026-10-02T12:00:00Z" }],
      [{ amount: 25, date: "2026-10-03T12:00:00Z" }],
      [{ amount: 40, date: "2026-10-04T12:00:00Z" }],
      new Date("2026-10-16T12:00:00Z"),
    );
    expect(months.at(-1)).toMatchObject({ key: "2026-10", revenue: 125, expenses: 40 });
  });

  it("uses authoritative Merchant API rails for net wallet cash flow", () => {
    expect(merchantNetCashFlow({ totals: [
      { rail: "collection", currency: "GHS", volume: "200" },
      { rail: "payout", currency: "GHS", volume: "50" },
      { rail: "utility", currency: "GHS", volume: "20" },
    ] })).toBe(130);
  });

  it("does not claim a percentage when there is no comparison baseline", () => {
    expect(percentageChange(100, 0)).toBeNull();
  });
});

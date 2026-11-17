import { format, startOfMonth, subMonths } from "date-fns";

export type DatedAmount = { amount: number | string; date: string };
export type AccountingMonth = { key: string; name: string; revenue: number; expenses: number };
export type MerchantTransactionSummary = {
  totals?: Array<{ rail?: string; currency?: string; volume?: number | string }>;
};

const monthKey = (date: Date) => format(date, "yyyy-MM");

export const buildAccountingMonths = (
  transactions: DatedAmount[],
  invoiceReceipts: DatedAmount[],
  expenses: DatedAmount[],
  now = new Date(),
): AccountingMonth[] => {
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = subMonths(startOfMonth(now), 11 - index);
    return { key: monthKey(date), name: format(date, "MMM"), revenue: 0, expenses: 0 };
  });
  const byMonth = new Map(months.map((month) => [month.key, month]));
  for (const item of [...transactions, ...invoiceReceipts]) {
    const month = byMonth.get(monthKey(new Date(item.date)));
    if (month) month.revenue += Number(item.amount) || 0;
  }
  for (const item of expenses) {
    const month = byMonth.get(monthKey(new Date(item.date)));
    if (month) month.expenses += Number(item.amount) || 0;
  }
  return months;
};

export const merchantNetCashFlow = (summary: MerchantTransactionSummary, currency = "GHS") => {
  const total = (rails: string[]) => (summary.totals || [])
    .filter((item) => item.currency === currency && item.rail && rails.includes(item.rail))
    .reduce((sum, item) => sum + (Number(item.volume) || 0), 0);
  return total(["collection"]) - total(["payout", "utility", "transfer"]);
};

export const percentageChange = (current: number, previous: number) =>
  previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;

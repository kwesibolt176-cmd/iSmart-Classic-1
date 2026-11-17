import { useEffect, useState } from "react";
import { startOfMonth, subMonths } from "date-fns";
import { Download, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { ExpensesList, type Expense } from "@/components/ExpensesList";
import { SalesChart } from "@/components/SalesChart";
import { StatsCard } from "@/components/StatsCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { supabase } from "@/integrations/supabase/client";
import { buildAccountingMonths, merchantNetCashFlow, percentageChange, type MerchantTransactionSummary } from "@/lib/accounting";
import { callMerchantApi } from "@/lib/merchant-api";

type Stats = {
  totalRevenue: number; totalExpenses: number; netProfit: number; cashFlow: number | null;
  revenueChange: number | null; expensesChange: number | null; profitChange: number | null; cashFlowChange: number | null;
};

const emptyStats: Stats = {
  totalRevenue: 0, totalExpenses: 0, netProfit: 0, cashFlow: null,
  revenueChange: null, expensesChange: null, profitChange: null, cashFlowChange: null,
};

export const Accounting = () => {
  const { profile } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [months, setMonths] = useState<Array<{ name: string; revenue: number; expenses: number }>>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!profile?.user_id) return;
    const fetchAccountingData = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const rangeStart = startOfMonth(subMonths(now, 11));
        const currentStart = startOfMonth(now);
        const previousStart = startOfMonth(subMonths(now, 1));
        const merchantBusinessId = profile.merchant_business_id || profile.ismart_business_id;
        const [transactionsResult, invoicesResult, expensesResult, currentMerchant, previousMerchant] = await Promise.all([
          supabase.from("transactions").select("amount, transaction_date").eq("user_id", profile.user_id)
            .eq("status", "completed").gte("transaction_date", rangeStart.toISOString()),
          supabase.from("invoices").select("paid_amount, payment_date").eq("user_id", profile.user_id)
            .in("status", ["paid", "partially_paid"]).not("payment_date", "is", null)
            .gte("payment_date", rangeStart.toISOString()),
          supabase.from("expenses").select("id, category, amount, expense_date, description").eq("user_id", profile.user_id)
            .gte("expense_date", rangeStart.toISOString()).order("expense_date", { ascending: false }),
          merchantBusinessId ? callMerchantApi<MerchantTransactionSummary>("transactionSummary", {
            path: { id: merchantBusinessId },
            query: { from: currentStart.toISOString(), to: now.toISOString(), bucket: "day", excludeSettlements: true },
          }) : Promise.resolve(null),
          merchantBusinessId ? callMerchantApi<MerchantTransactionSummary>("transactionSummary", {
            path: { id: merchantBusinessId },
            query: { from: previousStart.toISOString(), to: currentStart.toISOString(), bucket: "day", excludeSettlements: true },
          }) : Promise.resolve(null),
        ]);
        const databaseError = transactionsResult.error || invoicesResult.error || expensesResult.error;
        if (databaseError) throw databaseError;

        const accountingMonths = buildAccountingMonths(
          (transactionsResult.data || []).map((item) => ({ amount: item.amount, date: item.transaction_date })),
          (invoicesResult.data || []).map((item) => ({ amount: item.paid_amount || 0, date: item.payment_date! })),
          (expensesResult.data || []).map((item) => ({ amount: item.amount, date: item.expense_date })),
          now,
        );
        const current = accountingMonths.at(-1)!;
        const previous = accountingMonths.at(-2)!;
        const currentProfit = current.revenue - current.expenses;
        const previousProfit = previous.revenue - previous.expenses;
        const cashFlow = currentMerchant ? merchantNetCashFlow(currentMerchant) : null;
        const previousCashFlow = previousMerchant ? merchantNetCashFlow(previousMerchant) : null;
        setMonths(accountingMonths.map(({ name, revenue, expenses }) => ({ name, revenue, expenses })));
        setRecentExpenses((expensesResult.data || []).slice(0, 10) as Expense[]);
        setStats({
          totalRevenue: current.revenue, totalExpenses: current.expenses, netProfit: currentProfit, cashFlow,
          revenueChange: percentageChange(current.revenue, previous.revenue),
          expensesChange: percentageChange(current.expenses, previous.expenses),
          profitChange: percentageChange(currentProfit, previousProfit),
          cashFlowChange: cashFlow === null || previousCashFlow === null ? null : percentageChange(cashFlow, previousCashFlow),
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Accounting data could not be loaded");
      } finally {
        setLoading(false);
      }
    };
    void fetchAccountingData();
  }, [profile?.user_id, profile?.merchant_business_id, profile?.ismart_business_id]);

  const formatChange = (change: number | null) => change === null
    ? "No prior-month baseline"
    : `${change >= 0 ? "+" : ""}${change.toFixed(1)}% from last month`;

  if (loading) return <div className="flex min-h-[60vh] flex-1 items-center justify-center"><LoadingSpinner size="large" /></div>;

  return <div className="flex-1 overflow-auto bg-background/50">
    <PageHeader title="Accounting" description="Merchant-wide financial overview and reports" rightContent={
      <Button className="gap-2" disabled><Download className="h-4 w-4" />Export Report</Button>
    } />
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      {error && <Alert variant="destructive"><AlertTitle>Accounting data unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {!error && <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          <StatsCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} change={formatChange(stats.revenueChange)} />
          <StatsCard title="Total Expenses" value={formatCurrency(stats.totalExpenses)} icon={TrendingDown} change={formatChange(stats.expensesChange)} />
          <StatsCard title="Net Profit" value={formatCurrency(stats.netProfit)} icon={TrendingUp} change={formatChange(stats.profitChange)} />
          <StatsCard title="Wallet Cash Flow" value={stats.cashFlow === null ? "Unavailable" : formatCurrency(stats.cashFlow)} icon={Wallet} change={formatChange(stats.cashFlowChange)} />
        </div>
        <p className="text-xs text-muted-foreground">Revenue combines completed POS sales and recorded invoice receipts. Wallet cash flow is sourced from iSmart collections less payouts, utilities and transfers.</p>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><SalesChart data={months} /></div>
          <div><ExpensesList expenses={recentExpenses} /></div>
        </div>
      </>}
    </div>
  </div>;
};

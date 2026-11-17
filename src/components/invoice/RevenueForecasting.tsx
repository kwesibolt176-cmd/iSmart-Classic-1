import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { format, addDays, addWeeks, addMonths, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";

interface ForecastData {
  period: string;
  expected: number;
  recurring: number;
  outstanding: number;
}

export const RevenueForecasting = () => {
  const { user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [totals, setTotals] = useState({
    thisMonth: 0,
    nextMonth: 0,
    outstanding: 0,
    trend: 0,
  });

  useEffect(() => {
    if (user?.id) fetchForecastData();
  }, [user?.id]);

  const fetchForecastData = async () => {
    // Fetch outstanding invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total, paid_amount, due_date, status")
      .eq("user_id", user!.id)
      .in("status", ["sent", "partially_paid", "overdue"]);

    // Fetch recurring invoices
    const { data: recurring } = await supabase
      .from("recurring_invoices")
      .select("total, frequency, next_invoice_date")
      .eq("user_id", user!.id)
      .eq("is_active", true);

    // Calculate forecast for next 3 months
    const today = new Date();
    const months: ForecastData[] = [];

    for (let i = 0; i < 3; i++) {
      const monthDate = addMonths(today, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      let outstanding = 0;
      let recurringTotal = 0;

      // Calculate outstanding invoices due this month
      invoices?.forEach((inv) => {
        const dueDate = new Date(inv.due_date);
        if (dueDate >= monthStart && dueDate <= monthEnd) {
          outstanding += inv.total - (inv.paid_amount || 0);
        }
      });

      // Calculate recurring invoices for this month
      recurring?.forEach((ri) => {
        let nextDate = new Date(ri.next_invoice_date);
        while (nextDate <= monthEnd) {
          if (nextDate >= monthStart && nextDate <= monthEnd) {
            recurringTotal += ri.total;
          }
          // Advance to next occurrence
          switch (ri.frequency) {
            case "weekly":
              nextDate = addWeeks(nextDate, 1);
              break;
            case "biweekly":
              nextDate = addWeeks(nextDate, 2);
              break;
            case "monthly":
              nextDate = addMonths(nextDate, 1);
              break;
            case "quarterly":
              nextDate = addMonths(nextDate, 3);
              break;
            case "yearly":
              nextDate = addMonths(nextDate, 12);
              break;
            default:
              nextDate = addMonths(nextDate, 1);
          }
        }
      });

      months.push({
        period: format(monthDate, "MMMM yyyy"),
        expected: outstanding + recurringTotal,
        recurring: recurringTotal,
        outstanding,
      });
    }

    setForecast(months);

    // Calculate totals
    const totalOutstanding = invoices?.reduce((sum, inv) => sum + (inv.total - (inv.paid_amount || 0)), 0) || 0;
    const thisMonth = months[0]?.expected || 0;
    const nextMonth = months[1]?.expected || 0;
    const trend = thisMonth > 0 ? ((nextMonth - thisMonth) / thisMonth) * 100 : 0;

    setTotals({
      thisMonth,
      nextMonth,
      outstanding: totalOutstanding,
      trend,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenue Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-lg font-bold">{formatCurrency(totals.thisMonth, { decimals: 0 })}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <Calendar className="h-5 w-5 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Next Month</p>
            <p className="text-lg font-bold">{formatCurrency(totals.nextMonth, { decimals: 0 })}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-yellow-500/10">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-yellow-600" />
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold">{formatCurrency(totals.outstanding, { decimals: 0 })}</p>
          </div>
          <div className={`text-center p-4 rounded-lg ${totals.trend >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {totals.trend >= 0 ? (
              <ArrowUp className="h-5 w-5 mx-auto mb-2 text-green-600" />
            ) : (
              <ArrowDown className="h-5 w-5 mx-auto mb-2 text-red-600" />
            )}
            <p className="text-xs text-muted-foreground">Trend</p>
            <p className={`text-lg font-bold ${totals.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.trend >= 0 ? '+' : ''}{totals.trend.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">3-Month Forecast</h4>
          {forecast.map((month, index) => (
            <div key={month.period} className="p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{month.period}</span>
                <span className="font-bold text-primary">
                  {formatCurrency(month.expected)}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Outstanding: {formatCurrency(month.outstanding)}</span>
                <span>Recurring: {formatCurrency(month.recurring)}</span>
              </div>
              {index === 0 && (
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${month.expected > 0 ? Math.min((month.outstanding / month.expected) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

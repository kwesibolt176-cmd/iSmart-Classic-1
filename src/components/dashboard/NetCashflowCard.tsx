import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { useISmartAPI } from "@/hooks/use-ismart-api";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetCashflowCard({ initialIncoming, initialOutgoing }: { initialIncoming?: number; initialOutgoing?: number }) {
  const { profile, showBalance } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const { getDashboardMetrics } = useISmartAPI();
  const hasInitial = initialIncoming !== undefined && initialOutgoing !== undefined;
  const [loading, setLoading] = useState(!hasInitial);
  const [stats, setStats] = useState({
    incoming: initialIncoming ?? 0,
    outgoing: initialOutgoing ?? 0,
    netCashflow: (initialIncoming ?? 0) - (initialOutgoing ?? 0),
  });

  useEffect(() => {
    if (profile?.id) {
      fetchCashflowStats(hasInitial);
    }
  }, [profile?.id]);

  const fetchCashflowStats = async (silent = false) => {
    if (!profile?.id) return;
    if (!silent) setLoading(true);

    try {
      // Try iSmart first
      const ismartResult = await getDashboardMetrics();
      if (ismartResult?.success && ismartResult?.data) {
        const wrapper = ismartResult.data as Record<string, unknown>;
        const metrics = (wrapper.data || wrapper) as Record<string, unknown>;
        const incoming = Number(metrics.total_collection ?? 0);
        const outgoing = Number(metrics.total_disbursement ?? 0);
        const netCashflow = Number(metrics.net_cash_flow ?? (incoming - outgoing));
        if (incoming > 0 || outgoing > 0) {
          setStats({ incoming, outgoing, netCashflow });
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("iSmart cashflow unavailable:", err);
    }

    // Fallback to local DB
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [collectionsRes, disbursementsRes] = await Promise.all([
        supabase
          .from("collections")
          .select("net_amount")
          .eq("business_id", profile.id)
          .eq("status", "completed")
          .gte("created_at", startOfMonth.toISOString()),
        supabase
          .from("disbursements")
          .select("amount")
          .eq("business_id", profile.id)
          .eq("status", "completed")
          .gte("created_at", startOfMonth.toISOString()),
      ]);

      const incoming = collectionsRes.data?.reduce((sum, c) => sum + Number(c.net_amount), 0) || 0;
      const outgoing = disbursementsRes.data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      setStats({
        incoming,
        outgoing,
        netCashflow: incoming - outgoing,
      });
    } catch (error) {
      console.error("Error fetching cashflow stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const isPositive = stats.netCashflow >= 0;

  return (
    <Card className="group hover:shadow-md transition-all duration-300 border-border bg-card relative overflow-hidden h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 p-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            isPositive 
              ? "bg-emerald-100 dark:bg-emerald-900/30" 
              : "bg-red-100 dark:bg-red-900/30"
          )}>
            {isPositive 
              ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> 
              : <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            }
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Cashflow
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 px-4 pb-4">
        <div className="space-y-3">
          <div>
            <div className={cn(
              "text-xl font-bold tracking-tight tabular-nums mb-1",
              isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
            )}>
              {loading ? "..." : (showBalance ? `${isPositive ? '+' : '-'}${formatCurrency(Math.abs(stats.netCashflow))}` : "****")}
            </div>
            <span className="text-xs text-muted-foreground">This month</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowDownLeft className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-muted-foreground">In</p>
              </div>
              <p className="text-xs font-semibold text-foreground truncate tabular-nums">
                {loading ? "..." : (showBalance ? formatCurrency(stats.incoming) : "****")}
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpRight className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                <p className="text-xs text-muted-foreground">Out</p>
              </div>
              <p className="text-xs font-semibold text-foreground truncate tabular-nums">
                {loading ? "..." : (showBalance ? formatCurrency(stats.outgoing) : "****")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

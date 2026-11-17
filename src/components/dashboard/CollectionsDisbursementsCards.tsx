import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { useISmartAPI } from "@/hooks/use-ismart-api";
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TotalCollectionsCard({ initialValue }: { initialValue?: number }) {
  const { profile, showBalance } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const { getDashboardMetrics } = useISmartAPI();
  const [loading, setLoading] = useState(initialValue === undefined);
  const [total, setTotal] = useState(initialValue ?? 0);
  const [source, setSource] = useState<"ismart" | "local">("local");

  useEffect(() => {
    if (profile?.id) {
      fetchTotal(initialValue !== undefined);
    }
  }, [profile?.id]);

  const fetchTotal = async (silent = false) => {
    if (!profile?.id) return;
    if (!silent) setLoading(true);

    try {
      // Try iSmart API first
      const ismartResult = await getDashboardMetrics();
      if (ismartResult?.success && ismartResult?.data) {
        const wrapper = ismartResult.data as Record<string, unknown>;
        const metrics = (wrapper.data || wrapper) as Record<string, unknown>;
        const totalCollections = Number(metrics.total_collection ?? metrics.totalCollections ?? metrics.total_collections ?? 0);
        if (totalCollections > 0) {
          setTotal(totalCollections);
          setSource("ismart");
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("iSmart collections data unavailable, falling back to local:", err);
    }

    // Fallback to local DB
    try {
      const { data } = await supabase
        .from("collections")
        .select("net_amount")
        .eq("business_id", profile.id)
        .eq("status", "completed");

      setTotal(data?.reduce((sum, c) => sum + Number(c.net_amount), 0) || 0);
      setSource("local");
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-300 border-border bg-card relative overflow-hidden h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 p-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <ArrowDownLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Collections
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 px-4 pb-4">
        <div className="text-xl font-bold tracking-tight text-foreground tabular-nums mb-1">
          {loading ? "..." : (showBalance ? formatCurrency(total) : "****")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {total > 0 ? "All-time total" : "No collections yet"}
          </span>
          {source === "ismart" && total > 0 && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground">Live</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TotalDisbursementsCard({ initialValue }: { initialValue?: number }) {
  const { profile, showBalance } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const { getDashboardMetrics } = useISmartAPI();
  const [loading, setLoading] = useState(initialValue === undefined);
  const [total, setTotal] = useState(initialValue ?? 0);
  const [source, setSource] = useState<"ismart" | "local">("local");

  useEffect(() => {
    if (profile?.id) {
      fetchTotal(initialValue !== undefined);
    }
  }, [profile?.id]);

  const fetchTotal = async (silent = false) => {
    if (!profile?.id) return;
    if (!silent) setLoading(true);

    try {
      // Try iSmart API first
      const ismartResult = await getDashboardMetrics();
      if (ismartResult?.success && ismartResult?.data) {
        const wrapper = ismartResult.data as Record<string, unknown>;
        const metrics = (wrapper.data || wrapper) as Record<string, unknown>;
        const totalDisbursements = Number(metrics.total_disbursement ?? metrics.totalDisbursements ?? metrics.total_disbursements ?? 0);
        if (totalDisbursements > 0) {
          setTotal(totalDisbursements);
          setSource("ismart");
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("iSmart disbursements data unavailable, falling back to local:", err);
    }

    // Fallback to local DB
    try {
      const { data } = await supabase
        .from("disbursements")
        .select("amount")
        .eq("business_id", profile.id)
        .eq("status", "completed");

      setTotal(data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0);
      setSource("local");
    } catch (error) {
      console.error("Error fetching disbursements:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-300 border-border bg-card relative overflow-hidden h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 p-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <ArrowUpRight className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Disbursements
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 px-4 pb-4">
        <div className="text-xl font-bold tracking-tight text-foreground tabular-nums mb-1">
          {loading ? "..." : (showBalance ? formatCurrency(total) : "****")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {total > 0 ? "All-time total" : "No payouts yet"}
          </span>
          {source === "ismart" && total > 0 && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground">Live</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  ShoppingBag,
  Users,
  TrendingUp,
  Clock,
  RefreshCcw,
} from "lucide-react";

interface RealTimeStats {
  ordersToday: number;
  revenueToday: number;
  activeUsers: number;
  newSignups: number;
  pendingSupport: number;
  lastUpdated: Date;
}

export const RealTimeMetricsCard = () => {
  const [stats, setStats] = useState<RealTimeStats>({
    ordersToday: 0,
    revenueToday: 0,
    activeUsers: 0,
    newSignups: 0,
    pendingSupport: 0,
    lastUpdated: new Date(),
  });
  const [loading, setLoading] = useState(true);

  const fetchRealTimeStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Orders today
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Revenue today
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount")
        .gte("transaction_date", today.toISOString().split("T")[0])
        .eq("status", "completed");

      const revenueToday = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // New signups today
      const { count: signupsCount } = await supabase
        .from("business_profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Active users (businesses with activity in last 24 hours - approximate via orders)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("user_id")
        .gte("created_at", yesterday.toISOString());

      const activeUsers = new Set(recentOrders?.map((o) => o.user_id) || []).size;

      // Pending support tickets
      const { count: supportCount } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      setStats({
        ordersToday: ordersCount || 0,
        revenueToday,
        activeUsers,
        newSignups: signupsCount || 0,
        pendingSupport: supportCount || 0,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error fetching real-time stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTimeStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRealTimeStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    {
      label: "Orders Today",
      value: stats.ordersToday,
      icon: ShoppingBag,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Revenue Today",
      value: `GH₵${stats.revenueToday.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Active Users (24h)",
      value: stats.activeUsers,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "New Signups",
      value: stats.newSignups,
      icon: TrendingUp,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Pending Support",
      value: stats.pendingSupport,
      icon: Clock,
      color: stats.pendingSupport > 5 ? "text-destructive" : "text-muted-foreground",
      bg: stats.pendingSupport > 5 ? "bg-destructive/10" : "bg-muted/50",
    },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Real-Time Activity</h3>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse mr-1" />
            Live
          </Badge>
        </div>
        <button
          onClick={fetchRealTimeStats}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg ${metric.bg}`}
            >
              <Icon className={`w-5 h-5 ${metric.color}`} />
              <span className="text-lg font-bold text-foreground">{metric.value}</span>
              <span className="text-xs text-muted-foreground text-center">{metric.label}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-right mt-3">
        Last updated: {stats.lastUpdated.toLocaleTimeString()}
      </p>
    </Card>
  );
};

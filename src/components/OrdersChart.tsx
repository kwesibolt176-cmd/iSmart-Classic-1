import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";

interface ChartData {
  day: string;
  orders: number;
}

export const OrdersChart = () => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWeeklyOrders();
    }
  }, [user, currentLocation]);

  const fetchWeeklyOrders = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      weekAgo.setHours(0, 0, 0, 0);

      let query = supabase
        .from("orders")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString())
        .in("status", ["completed", "served"]);

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const counts: Record<string, number> = {};

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekAgo);
        date.setDate(date.getDate() + i);
        const dayName = dayNames[date.getDay()];
        counts[dayName] = 0;
      }

      (orders || []).forEach((order) => {
        const date = new Date(order.created_at);
        const dayName = dayNames[date.getDay()];
        counts[dayName] = (counts[dayName] || 0) + 1;
      });

      const chartData = Object.entries(counts).map(([day, orders]) => ({
        day,
        orders,
      }));

      setData(chartData);
    } catch (error) {
      console.error("Error fetching weekly orders:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-card)] h-full min-h-[340px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all duration-300 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Weekly Orders</h3>
      </div>
      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%" className="sm:hidden">
          <BarChart data={data}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                color: "hsl(var(--foreground))",
                fontSize: "12px",
              }}
              cursor={{ fill: "hsl(var(--muted))" }}
            />
            <Bar
              dataKey="orders"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height="100%" className="hidden sm:block">
          <BarChart data={data}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                color: "hsl(var(--foreground))",
              }}
              cursor={{ fill: "hsl(var(--muted))" }}
            />
            <Bar
              dataKey="orders"
              fill="hsl(var(--primary))"
              radius={[8, 8, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

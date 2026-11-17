import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";
import { Loader2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, subWeeks, startOfWeek, endOfWeek } from "date-fns";

interface TimeData {
  label: string;
  revenue: number;
  orders: number;
}

export const TimeReportCard = () => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const { currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<TimeData[]>([]);
  const [weeklyData, setWeeklyData] = useState<TimeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<TimeData[]>([]);

  useEffect(() => {
    if (user) {
      fetchTimeData();
    }
  }, [user?.id, currentLocation]);

  const fetchTimeData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const now = new Date();

      // Fetch transactions for the past month
      const monthAgo = subDays(now, 30);

      let query = supabase
        .from("transactions")
        .select("amount, transaction_date")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("transaction_date", monthAgo.toISOString())
        .lte("transaction_date", now.toISOString());

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { data: transactions } = await query;

      // Process daily data (today by hours)
      const today = startOfDay(now);
      const hourlyMap: Record<string, { revenue: number; orders: number }> = {};
      const hours = ["9am", "12pm", "3pm", "6pm", "9pm"];
      hours.forEach(h => hourlyMap[h] = { revenue: 0, orders: 0 });

      (transactions || []).forEach(t => {
        const date = new Date(t.transaction_date);
        if (date >= today) {
          const hour = date.getHours();
          let label = "9am";
          if (hour >= 21) label = "9pm";
          else if (hour >= 18) label = "6pm";
          else if (hour >= 15) label = "3pm";
          else if (hour >= 12) label = "12pm";

          hourlyMap[label].revenue += Number(t.amount);
          hourlyMap[label].orders += 1;
        }
      });

      setDailyData(hours.map(h => ({
        label: h,
        revenue: hourlyMap[h].revenue,
        orders: hourlyMap[h].orders,
      })));

      // Process weekly data (last 7 days)
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const weeklyMap: Record<string, { revenue: number; orders: number }> = {};
      days.forEach(d => weeklyMap[d] = { revenue: 0, orders: 0 });

      (transactions || []).forEach(t => {
        const date = new Date(t.transaction_date);
        if (date >= subDays(now, 7)) {
          const dayName = format(date, "EEE");
          if (weeklyMap[dayName]) {
            weeklyMap[dayName].revenue += Number(t.amount);
            weeklyMap[dayName].orders += 1;
          }
        }
      });

      setWeeklyData(days.map(d => ({
        label: d,
        revenue: weeklyMap[d].revenue,
        orders: weeklyMap[d].orders,
      })));

      // Process monthly data (4 weeks)
      const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const monthlyMap: Record<string, { revenue: number; orders: number }> = {};
      weekLabels.forEach(w => monthlyMap[w] = { revenue: 0, orders: 0 });

      (transactions || []).forEach(t => {
        const date = new Date(t.transaction_date);
        const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        let weekLabel = "Week 4";
        if (daysAgo < 7) weekLabel = "Week 4";
        else if (daysAgo < 14) weekLabel = "Week 3";
        else if (daysAgo < 21) weekLabel = "Week 2";
        else weekLabel = "Week 1";

        monthlyMap[weekLabel].revenue += Number(t.amount);
        monthlyMap[weekLabel].orders += 1;
      });

      setMonthlyData(weekLabels.map(w => ({
        label: w,
        revenue: monthlyMap[w].revenue,
        orders: monthlyMap[w].orders,
      })));

    } catch (error) {
      console.error("Error fetching time data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base sm:text-lg">Time-Based Analytics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] sm:h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-foreground text-base sm:text-lg">Time-Based Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
            <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <ResponsiveContainer width="100%" height={200} className="sm:hidden">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name={`Revenue (${currencySymbol})`} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={220} className="hidden sm:block">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name={`Revenue (${currencySymbol})`} />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--secondary))" strokeWidth={2} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <ResponsiveContainer width="100%" height={200} className="sm:hidden">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name={`Revenue (${currencySymbol})`} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={220} className="hidden sm:block">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name={`Revenue (${currencySymbol})`} />
                <Bar dataKey="orders" fill="hsl(var(--secondary))" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <ResponsiveContainer width="100%" height={200} className="sm:hidden">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name={`Revenue (${currencySymbol})`} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={220} className="hidden sm:block">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name={`Revenue (${currencySymbol})`} />
                <Bar dataKey="orders" fill="hsl(var(--secondary))" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

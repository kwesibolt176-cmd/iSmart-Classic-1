import { useEffect, useState } from "react";
import { TrendingUp, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from "@/hooks/use-currency";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// Super admin uses GHS as platform default currency for aggregate analytics
const PLATFORM_CURRENCY = "GHS";
const platformSymbol = getCurrencySymbol(PLATFORM_CURRENCY);
const formatPlatformCurrency = (amount: number) => formatCurrencyUtil(amount, PLATFORM_CURRENCY);

export const RevenueAnalyticsTab = () => {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyGrowth, setMonthlyGrowth] = useState(0);
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [revenueByTier, setRevenueByTier] = useState<any[]>([]);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchRevenueAnalytics();
  }, []);

  const fetchRevenueAnalytics = async () => {
    try {
      // Fetch all transactions
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("amount, created_at, user_id");

      if (txError) throw txError;

      // Calculate total revenue
      const total = transactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
      setTotalRevenue(total);

      // Revenue by month
      const monthlyRevenue: Record<string, number> = {};
      transactions?.forEach((tx) => {
        const month = new Date(tx.created_at).toLocaleString("default", { month: "short", year: "2-digit" });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(tx.amount);
      });

      const revenueData = Object.entries(monthlyRevenue)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([month, revenue]) => ({
          month,
          revenue,
        }));

      setRevenueByMonth(revenueData);

      // Calculate monthly growth
      if (revenueData.length >= 2) {
        const lastMonth = revenueData[revenueData.length - 1].revenue;
        const prevMonth = revenueData[revenueData.length - 2].revenue;
        const growth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;
        setMonthlyGrowth(growth);
      }

      // Fetch subscriptions for revenue by tier
      const { data: subscriptions } = await supabase
        .from("user_subscriptions")
        .select(`
          user_id,
          subscription_plans (name, price_monthly)
        `);

      const tierRevenue: Record<string, number> = {};
      subscriptions?.forEach((sub: any) => {
        const planName = sub.subscription_plans?.name || "No Plan";
        const price = sub.subscription_plans?.price_monthly || 0;
        tierRevenue[planName] = (tierRevenue[planName] || 0) + price;
      });

      const tierData = Object.entries(tierRevenue).map(([name, revenue]) => ({
        name,
        revenue,
      }));

      setRevenueByTier(tierData);

      // Calculate average order value
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total");

      if (!ordersError && orders && orders.length > 0) {
        const totalOrderValue = orders.reduce((sum, order) => sum + Number(order.total), 0);
        setAvgOrderValue(totalOrderValue / orders.length);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPlatformCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All-time platform revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyGrowth.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Month-over-month growth</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPlatformCurrency(avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">Average transaction value</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analytics</CardTitle>
          <CardDescription>Track revenue trends and distribution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Monthly Revenue Trend */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${platformSymbol}${value.toFixed(2)}`} />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Tier */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Revenue by Subscription Tier</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByTier}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${platformSymbol}${value.toFixed(2)}`} />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

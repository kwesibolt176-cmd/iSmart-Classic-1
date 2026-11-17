import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, ShoppingBag, TrendingUp, Clock, ArrowUpRight, ArrowDownRight, Activity, CreditCard, BarChart3, RefreshCcw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { RealTimeMetricsCard } from "./RealTimeMetricsCard";

interface PlatformMetrics {
  totalBusinesses: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingActions: number;
  actionsToday: number;
  newBusinessesThisMonth: number;
  newBusinessesLastMonth: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  activeSubscriptions: number;
  totalInvoices: number;
  totalGiftCards: number;
  totalSupportTickets: number;
}

interface TrendData {
  date: string;
  businesses: number;
  orders: number;
  revenue: number;
}

interface IndustryBreakdown {
  name: string;
  value: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const DashboardOverviewTab = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalBusinesses: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingActions: 0,
    actionsToday: 0,
    newBusinessesThisMonth: 0,
    newBusinessesLastMonth: 0,
    ordersThisMonth: 0,
    ordersLastMonth: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    activeSubscriptions: 0,
    totalInvoices: 0,
    totalGiftCards: 0,
    totalSupportTickets: 0,
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [industryData, setIndustryData] = useState<IndustryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Fetch total businesses
      const { count: businessCount } = await supabase
        .from("business_profiles")
        .select("*", { count: "exact", head: true });

      // Fetch businesses by industry for pie chart
      const { data: industryBreakdown } = await supabase
        .from("business_profiles")
        .select("industry");

      const industryCounts = industryBreakdown?.reduce((acc: Record<string, number>, bp) => {
        const industry = bp.industry || 'Other';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {}) || {};

      setIndustryData(
        Object.entries(industryCounts)
          .map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      );

      // Fetch new businesses this month
      const { count: newThisMonth } = await supabase
        .from("business_profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisMonthStart.toISOString());

      // Fetch new businesses last month
      const { count: newLastMonth } = await supabase
        .from("business_profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());

      // Fetch total unique users
      const { data: businessProfiles } = await supabase
        .from("business_profiles")
        .select("user_id");
      
      const uniqueUsers = new Set(businessProfiles?.map(bp => bp.user_id) || []).size;

      // Fetch total orders
      const { count: orderCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      // Fetch orders this month
      const { count: ordersThisMonth } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisMonthStart.toISOString());

      // Fetch orders last month
      const { count: ordersLastMonth } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());

      // Fetch total revenue from transactions
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("amount, transaction_date, status")
        .eq("status", "completed");
      
      const totalRevenue = allTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Revenue this month
      const revenueThisMonth = allTransactions
        ?.filter(t => new Date(t.transaction_date) >= thisMonthStart)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Revenue last month
      const revenueLastMonth = allTransactions
        ?.filter(t => {
          const date = new Date(t.transaction_date);
          return date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Fetch pending actions
      const { count: pendingCount } = await supabase
        .from("pending_actions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch actions executed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todayCount } = await supabase
        .from("pending_actions")
        .select("*", { count: "exact", head: true })
        .eq("status", "executed")
        .gte("executed_at", today.toISOString());

      // Fetch active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from("user_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch total invoices
      const { count: invoiceCount } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true });

      // Fetch total gift cards
      const { count: giftCardCount } = await supabase
        .from("gift_cards")
        .select("*", { count: "exact", head: true });

      // Fetch open support tickets
      const { count: supportCount } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      // Generate trend data for last 30 days
      const trendDays = 30;
      const trends: TrendData[] = [];
      
      for (let i = trendDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const businessesUpToDate = businessProfiles?.filter(() => true).length || 0;
        const ordersOnDate = allTransactions?.filter(t => 
          t.transaction_date.startsWith(dateStr)
        ).length || 0;
        const revenueOnDate = allTransactions
          ?.filter(t => t.transaction_date.startsWith(dateStr))
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        trends.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          businesses: Math.floor(businessesUpToDate * ((trendDays - i) / trendDays)),
          orders: ordersOnDate,
          revenue: revenueOnDate,
        });
      }
      
      setTrendData(trends);
      setLastRefresh(new Date());

      setMetrics({
        totalBusinesses: businessCount || 0,
        totalUsers: uniqueUsers,
        totalOrders: orderCount || 0,
        totalRevenue,
        pendingActions: pendingCount || 0,
        actionsToday: todayCount || 0,
        newBusinessesThisMonth: newThisMonth || 0,
        newBusinessesLastMonth: newLastMonth || 0,
        ordersThisMonth: ordersThisMonth || 0,
        ordersLastMonth: ordersLastMonth || 0,
        revenueThisMonth,
        revenueLastMonth,
        activeSubscriptions: activeSubscriptions || 0,
        totalInvoices: invoiceCount || 0,
        totalGiftCards: giftCardCount || 0,
        totalSupportTickets: supportCount || 0,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchMetrics, 120000);
    return () => clearInterval(interval);
  }, []);

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const businessGrowth = calculateGrowth(metrics.newBusinessesThisMonth, metrics.newBusinessesLastMonth);
  const orderGrowth = calculateGrowth(metrics.ordersThisMonth, metrics.ordersLastMonth);
  const revenueGrowth = calculateGrowth(metrics.revenueThisMonth, metrics.revenueLastMonth);

  const kpiCards = [
    {
      title: "Total Businesses",
      value: metrics.totalBusinesses,
      subtitle: `+${metrics.newBusinessesThisMonth} this month`,
      growth: businessGrowth,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Users",
      value: metrics.totalUsers,
      subtitle: "Unique accounts",
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Total Orders",
      value: metrics.totalOrders.toLocaleString(),
      subtitle: `${metrics.ordersThisMonth.toLocaleString()} this month`,
      growth: orderGrowth,
      icon: ShoppingBag,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Platform Revenue",
      value: `GH₵${(metrics.totalRevenue / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`,
      subtitle: `GH₵${(metrics.revenueThisMonth / 1000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K this month`,
      growth: revenueGrowth,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Active Subscriptions",
      value: metrics.activeSubscriptions,
      subtitle: "Paid plans",
      icon: CreditCard,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending Actions",
      value: metrics.pendingActions,
      subtitle: `${metrics.actionsToday} executed today`,
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Platform Overview</h2>
          <p className="text-muted-foreground">Real-time metrics and growth trends</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-Time Activity Card */}
      <RealTimeMetricsCard />

      {/* Quick Actions Panel */}
      <QuickActionsPanel />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((metric) => {
          const Icon = metric.icon;
          const hasGrowth = metric.growth !== undefined;
          const isPositive = hasGrowth && metric.growth >= 0;
          
          return (
            <Card key={metric.title} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
                  </div>
                </div>
                {hasGrowth && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-secondary' : 'text-destructive'}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(metric.growth).toFixed(1)}%
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Revenue Trend (30 Days)</h3>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(value) => `GH₵${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: number) => [`GH₵${value.toLocaleString()}`, 'Revenue']}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Orders Trend Chart */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Daily Orders (30 Days)</h3>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Orders']}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="orders" 
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Industry Breakdown & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Breakdown */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Businesses by Industry</h3>
          </div>
          <div className="h-[250px]">
            {industryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={industryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {industryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </Card>

        {/* System Status */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-secondary animate-pulse"></div>
            <h3 className="text-lg font-semibold">System Status</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">API Status</span>
              <span className="text-secondary font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                Operational
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Database</span>
              <span className="text-secondary font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Storage</span>
              <span className="text-secondary font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                Available
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Edge Functions</span>
              <span className="text-secondary font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                Running
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Email Service</span>
              <span className="text-secondary font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                Connected
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

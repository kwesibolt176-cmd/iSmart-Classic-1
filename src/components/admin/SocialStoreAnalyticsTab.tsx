import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Store, Eye, ShoppingCart, TrendingUp, Users, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { formatCurrency } from "@/hooks/use-currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StoreStatsRaw {
  businessName: string;
  businessUserId: string;
  totalVisits: number;
  uniqueVisitors: Set<string>;
  totalOrders: number;
  totalRevenue: number;
}

interface StoreStats {
  businessName: string;
  businessUserId: string;
  totalVisits: number;
  uniqueVisitors: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
}

interface VisitTrend {
  date: string;
  visits: number;
  orders: number;
}

interface DeviceBreakdown {
  name: string;
  value: number;
}

export const SocialStoreAnalyticsTab = () => {
  const [loading, setLoading] = useState(true);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  const [visitTrends, setVisitTrends] = useState<VisitTrend[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdown[]>([]);
  const [totals, setTotals] = useState({
    totalVisits: 0,
    uniqueVisitors: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const { toast } = useToast();

  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all storefront visits
      const { data: visits, error: visitsError } = await supabase
        .from("storefront_visits")
        .select("*")
        .order("visited_at", { ascending: false });

      if (visitsError) throw visitsError;

      // Fetch all social media orders
      const { data: orders, error: ordersError } = await supabase
        .from("social_media_orders")
        .select("*");

      if (ordersError) throw ordersError;

      // Fetch business profiles
      const { data: businesses, error: businessError } = await supabase
        .from("business_profiles")
        .select("user_id, business_name");

      if (businessError) throw businessError;

      const businessMap = new Map(businesses?.map(b => [b.user_id, b.business_name]) || []);

      // Calculate per-store stats
      const statsMap = new Map<string, StoreStatsRaw>();

      visits?.forEach((visit: any) => {
        const existing = statsMap.get(visit.business_user_id) || {
          businessName: businessMap.get(visit.business_user_id) || "Unknown",
          businessUserId: visit.business_user_id,
          totalVisits: 0,
          uniqueVisitors: new Set<string>(),
          totalOrders: 0,
          totalRevenue: 0,
        };
        existing.totalVisits++;
        existing.uniqueVisitors.add(visit.visitor_id);
        statsMap.set(visit.business_user_id, existing);
      });

      orders?.forEach((order: any) => {
        const existing = statsMap.get(order.user_id);
        if (existing) {
          existing.totalOrders++;
          existing.totalRevenue += Number(order.total_amount) || 0;
        }
      });

      // Convert to array and calculate conversion rates
      const statsArray: StoreStats[] = Array.from(statsMap.values()).map(stat => ({
        businessName: stat.businessName,
        businessUserId: stat.businessUserId,
        totalVisits: stat.totalVisits,
        uniqueVisitors: stat.uniqueVisitors.size,
        totalOrders: stat.totalOrders,
        totalRevenue: stat.totalRevenue,
        conversionRate: stat.totalVisits > 0 
          ? ((stat.totalOrders / stat.totalVisits) * 100)
          : 0,
      }));

      setStoreStats(statsArray.sort((a, b) => b.totalRevenue - a.totalRevenue));

      // Calculate totals
      const allUniqueVisitors = new Set(visits?.map((v: any) => v.visitor_id) || []);
      setTotals({
        totalVisits: visits?.length || 0,
        uniqueVisitors: allUniqueVisitors.size,
        totalOrders: orders?.length || 0,
        totalRevenue: orders?.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0) || 0,
      });

      // Calculate visit trends (last 30 days)
      const last30Days: Record<string, { visits: number; orders: number }> = {};
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split("T")[0];
        last30Days[key] = { visits: 0, orders: 0 };
      }

      visits?.forEach((visit: any) => {
        const date = new Date(visit.visited_at).toISOString().split("T")[0];
        if (last30Days[date]) {
          last30Days[date].visits++;
        }
      });

      orders?.forEach((order: any) => {
        const date = new Date(order.created_at).toISOString().split("T")[0];
        if (last30Days[date]) {
          last30Days[date].orders++;
        }
      });

      const trendsData = Object.entries(last30Days).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ...data,
      }));

      setVisitTrends(trendsData);

      // Device breakdown
      const deviceCounts: Record<string, number> = {};
      visits?.forEach((visit: any) => {
        const device = visit.device_type || "unknown";
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });

      setDeviceBreakdown(
        Object.entries(deviceCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );

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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold">{totals.totalVisits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unique Visitors</p>
                <p className="text-2xl font-bold">{totals.uniqueVisitors.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <ShoppingCart className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totals.totalOrders.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalRevenue, "GHS")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Visit & Order Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Visits & Orders (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={visitTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="visits" stroke="#8b5cf6" strokeWidth={2} name="Visits" />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Device Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-Store Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Store Performance
          </CardTitle>
          <CardDescription>
            Analytics breakdown by business storefront
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Unique Visitors</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No storefront data yet
                  </TableCell>
                </TableRow>
              ) : (
                storeStats.map((stat) => (
                  <TableRow key={stat.businessUserId}>
                    <TableCell className="font-medium">{stat.businessName}</TableCell>
                    <TableCell className="text-right">{stat.totalVisits.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{stat.uniqueVisitors.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{stat.totalOrders.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(stat.totalRevenue, "GHS")}</TableCell>
                    <TableCell className="text-right">
                      <span className={stat.conversionRate > 5 ? "text-green-500" : "text-muted-foreground"}>
                        {stat.conversionRate.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

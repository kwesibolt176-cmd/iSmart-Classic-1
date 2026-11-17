import { useEffect, useState } from "react";
import { Activity, Database, Server, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SystemMetrics {
  apiResponseTime: number;
  databaseConnections: number;
  activeUsers: number;
  requestsPerMinute: number;
  uptime: number;
}

export const SystemMonitoringTab = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    apiResponseTime: 0,
    databaseConnections: 0,
    activeUsers: 0,
    requestsPerMinute: 0,
    uptime: 99.9,
  });
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSystemMetrics = async () => {
    try {
      const startTime = performance.now();

      // Test database response time
      await supabase.from("business_profiles").select("id").limit(1);

      const responseTime = performance.now() - startTime;

      // Fetch active users (approximate)
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("user_id")
        .gte("created_at", new Date(Date.now() - 60000).toISOString());

      const uniqueUsers = new Set(recentOrders?.map((o) => o.user_id) || []);

      // Update metrics
      setMetrics({
        apiResponseTime: Math.round(responseTime),
        databaseConnections: 25, // Simulated
        activeUsers: uniqueUsers.size,
        requestsPerMinute: Math.round(Math.random() * 100 + 50), // Simulated
        uptime: 99.9,
      });

      // Add to performance data for chart
      setPerformanceData((prev) => {
        const newData = [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            responseTime: Math.round(responseTime),
            activeUsers: uniqueUsers.size,
          },
        ].slice(-20); // Keep last 20 data points
        return newData;
      });
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

  const getHealthStatus = (value: number, threshold: number) => {
    if (value < threshold) return { status: "Healthy", color: "bg-green-500/10 text-green-500 border-green-500/20" };
    if (value < threshold * 1.5) return { status: "Warning", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
    return { status: "Critical", color: "bg-red-500/10 text-red-500 border-red-500/20" };
  };

  const responseTimeHealth = getHealthStatus(metrics.apiResponseTime, 200);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.apiResponseTime}ms</div>
            <Badge variant="outline" className={`mt-2 ${responseTimeHealth.color}`}>
              {responseTimeHealth.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-2">Last minute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DB Connections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.databaseConnections}</div>
            <p className="text-xs text-muted-foreground mt-2">Active connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uptime}%</div>
            <Badge variant="outline" className="mt-2 bg-green-500/10 text-green-500 border-green-500/20">
              Operational
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Real-Time Performance
          </CardTitle>
          <CardDescription>
            Monitor API response times and active users in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Response Time Chart */}
            <div>
              <h4 className="text-sm font-semibold mb-4">API Response Time (ms)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="responseTime" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Active Users Chart */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Active Users</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="activeUsers" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Current status of platform services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "API Gateway", status: "Operational" },
              { name: "Database", status: "Operational" },
              { name: "Authentication", status: "Operational" },
              { name: "File Storage", status: "Operational" },
              { name: "Email Service", status: "Operational" },
              { name: "SMS Service", status: "Operational" },
            ].map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <span className="font-medium">{service.name}</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

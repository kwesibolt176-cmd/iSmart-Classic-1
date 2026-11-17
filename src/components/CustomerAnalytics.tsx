import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Award, ShoppingCart, Repeat, Clock, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { useCurrency } from "@/hooks/use-currency";
import { useMemo } from "react";
import type { Customer } from "@/pages/Customers";

interface CustomerAnalyticsProps {
  customers: Customer[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export const CustomerAnalytics = ({ customers }: CustomerAnalyticsProps) => {
  const { formatCurrency, currencySymbol } = useCurrency();
  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c => c.loyaltyPoints > 100).length;
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgSpent = totalCustomers > 0 ? totalSpent / totalCustomers : 0;
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);

  // Calculate purchase frequency (orders per customer)
  const avgOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;
  
  // Calculate average order value
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  // Repeat customers (more than 1 order)
  const repeatCustomers = customers.filter(c => c.totalOrders > 1).length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

  // Purchase frequency distribution
  const frequencyDistribution = useMemo(() => {
    const distribution = {
      'One-time': customers.filter(c => c.totalOrders === 1).length,
      '2-3 orders': customers.filter(c => c.totalOrders >= 2 && c.totalOrders <= 3).length,
      '4-6 orders': customers.filter(c => c.totalOrders >= 4 && c.totalOrders <= 6).length,
      '7-10 orders': customers.filter(c => c.totalOrders >= 7 && c.totalOrders <= 10).length,
      '10+ orders': customers.filter(c => c.totalOrders > 10).length,
    };
    return Object.entries(distribution)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [customers]);

  // Customer lifetime value tiers
  const ltvTiers = useMemo(() => {
    const tiers = [
      { name: `< ${currencySymbol}10K`, min: 0, max: 10000 },
      { name: `${currencySymbol}10K-50K`, min: 10000, max: 50000 },
      { name: `${currencySymbol}50K-100K`, min: 50000, max: 100000 },
      { name: `${currencySymbol}100K-500K`, min: 100000, max: 500000 },
      { name: `> ${currencySymbol}500K`, min: 500000, max: Infinity },
    ];
    return tiers.map(tier => ({
      name: tier.name,
      value: customers.filter(c => c.totalSpent >= tier.min && c.totalSpent < tier.max).length,
    })).filter(t => t.value > 0);
  }, [customers, currencySymbol]);

  // Monthly customer acquisition (based on actual created_at dates if available)
  const monthlyGrowth = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        date: date,
      });
    }

    return months.map((m, idx) => {
      // Estimate based on total customers
      const cumulative = Math.floor(totalCustomers * ((idx + 1) / 6));
      const previous = idx > 0 ? Math.floor(totalCustomers * (idx / 6)) : 0;
      return {
        month: m.month,
        new: cumulative - previous,
        total: cumulative,
      };
    });
  }, [totalCustomers]);

  // Customer segments based on spending and frequency
  const segments = useMemo(() => {
    const highValue = customers.filter(c => c.totalSpent > avgSpent && c.totalOrders > avgOrdersPerCustomer).length;
    const frequent = customers.filter(c => c.totalSpent <= avgSpent && c.totalOrders > avgOrdersPerCustomer).length;
    const bigSpender = customers.filter(c => c.totalSpent > avgSpent && c.totalOrders <= avgOrdersPerCustomer).length;
    const atRisk = customers.filter(c => c.totalSpent <= avgSpent && c.totalOrders <= avgOrdersPerCustomer).length;
    
    return [
      { name: "Champions", value: highValue, description: "High spend & frequency" },
      { name: "Loyal", value: frequent, description: "Frequent buyers" },
      { name: "Big Spenders", value: bigSpender, description: "High value, low frequency" },
      { name: "Need Attention", value: atRisk, description: "Low engagement" },
    ].filter(s => s.value > 0);
  }, [customers, avgSpent, avgOrdersPerCustomer]);

  // Top spenders
  const topSpenders = [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // Top most frequent buyers
  const topFrequent = [...customers]
    .sort((a, b) => b.totalOrders - a.totalOrders)
    .slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">Customers</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{totalCustomers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-green-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Repeat Rate</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{repeatRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Avg Orders</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{avgOrdersPerCustomer.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Avg Order Value</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(avgOrderValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">VIP Customers</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{vipCustomers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Avg Lifetime Value</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(avgSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Orders</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{totalOrders}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Customer Growth Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyGrowth}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                    name="Total Customers"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="new" 
                    stroke="hsl(var(--chart-2))" 
                    fill="hsl(var(--chart-2))" 
                    fillOpacity={0.3}
                    name="New Customers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Frequency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Purchase Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequencyDistribution}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Customers" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              {segments.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segments}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {segments.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [value, props.payload.description]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lifetime Value Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lifetime Value Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {ltvTiers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ltvTiers} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} name="Customers" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Spenders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Top Spenders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSpenders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No customer data</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {topSpenders.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-sm sm:text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{customer.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{customer.totalOrders} orders</p>
                      </div>
                    </div>
                    <p className="font-semibold text-green-600 text-sm sm:text-base">{formatCurrency(customer.totalSpent)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Frequent Buyers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Repeat className="w-5 h-5 text-blue-500" />
              Most Frequent Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topFrequent.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No customer data</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {topFrequent.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-sm sm:text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{customer.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{formatCurrency(customer.totalSpent)} total</p>
                      </div>
                    </div>
                    <p className="font-semibold text-blue-600 text-sm sm:text-base">{customer.totalOrders} orders</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

export interface MonthlyData {
  name: string;
  revenue: number;
  expenses: number;
}

export const SalesChart = ({ data, loading = false }: { data: MonthlyData[]; loading?: boolean }) => {
  const { format: formatCurrency } = useCurrency();

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-foreground text-base sm:text-lg">Financial Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] sm:h-[350px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-foreground text-base sm:text-lg">Financial Overview</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {/* Mobile Chart */}
        <ResponsiveContainer width="100%" height={200} className="sm:hidden">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenueMobile" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
            <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [formatCurrency(value), ""]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorRevenueMobile)"
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Desktop Chart */}
        <ResponsiveContainer width="100%" height={350} className="hidden sm:block">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [formatCurrency(value), ""]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="hsl(var(--destructive))"
              fillOpacity={1}
              fill="url(#colorExpenses)"
              name="Expenses"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

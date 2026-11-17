import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { Download, FileText, TrendingUp, Calculator, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { format, startOfYear, endOfYear } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Receipt, ShieldCheck } from "lucide-react";

interface TaxRecord {
  id: string;
  transaction_id: string;
  net_amount: number;
  nhil_amount: number;
  getfund_amount: number;
  vat_amount: number;
  total_tax: number;
  gross_amount: number;
  tax_rule_version: string;
  vat_registered_at_time: boolean;
  computed_at: string;
}

interface MonthlyTaxData {
  month: string;
  vat: number;
  nhil: number;
  getfund: number;
  total_tax: number;
  net_sales: number;
}

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

export const TaxReports = () => {
  const { user } = useBusiness();
  const { formatCurrency } = useCurrency();
  const { hasAccess } = useFeatureAccess();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyTaxData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [totals, setTotals] = useState({
    net_sales: 0,
    vat: 0,
    nhil: 0,
    getfund: 0,
    total_tax: 0,
  });

  // Check feature access
  const hasTaxReportsAccess = hasAccess("tax_reports");

  useEffect(() => {
    if (user && hasTaxReportsAccess) {
      fetchTaxData();
    } else {
      setLoading(false);
    }
  }, [user?.id, selectedYear, hasTaxReportsAccess]);

  const fetchTaxData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const yearStart = startOfYear(new Date(parseInt(selectedYear), 0, 1));
      const yearEnd = endOfYear(new Date(parseInt(selectedYear), 0, 1));

      // Fetch all tax records for the year
      const { data, error } = await supabase
        .from("transaction_tax_records" as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("computed_at", yearStart.toISOString())
        .lte("computed_at", yearEnd.toISOString())
        .order("computed_at", { ascending: false });

      if (error) throw error;

      const taxRecords = (data || []) as unknown as TaxRecord[];
      setRecords(taxRecords);

      // Aggregate by month
      const monthlyAgg: Record<string, MonthlyTaxData> = {};
      let totalNet = 0, totalVat = 0, totalNhil = 0, totalGetfund = 0, totalTax = 0;

      taxRecords.forEach((record) => {
        const month = format(new Date(record.computed_at), "MMM yyyy");
        
        if (!monthlyAgg[month]) {
          monthlyAgg[month] = {
            month,
            vat: 0,
            nhil: 0,
            getfund: 0,
            total_tax: 0,
            net_sales: 0,
          };
        }

        monthlyAgg[month].vat += Number(record.vat_amount);
        monthlyAgg[month].nhil += Number(record.nhil_amount);
        monthlyAgg[month].getfund += Number(record.getfund_amount);
        monthlyAgg[month].total_tax += Number(record.total_tax);
        monthlyAgg[month].net_sales += Number(record.net_amount);

        totalNet += Number(record.net_amount);
        totalVat += Number(record.vat_amount);
        totalNhil += Number(record.nhil_amount);
        totalGetfund += Number(record.getfund_amount);
        totalTax += Number(record.total_tax);
      });

      setMonthlyData(Object.values(monthlyAgg).reverse());
      setTotals({
        net_sales: totalNet,
        vat: totalVat,
        nhil: totalNhil,
        getfund: totalGetfund,
        total_tax: totalTax,
      });
    } catch (error: any) {
      console.error("Error fetching tax data:", error);
      toast({
        title: "Error",
        description: "Failed to load tax reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const headers = ["Date", "Transaction ID", "Net Amount", "NHIL", "GETFund", "VAT", "Total Tax", "Gross Amount"];
    const rows = records.map(r => [
      format(new Date(r.computed_at), "yyyy-MM-dd HH:mm"),
      r.transaction_id,
      r.net_amount.toFixed(2),
      r.nhil_amount.toFixed(2),
      r.getfund_amount.toFixed(2),
      r.vat_amount.toFixed(2),
      r.total_tax.toFixed(2),
      r.gross_amount.toFixed(2),
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-report-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: "Tax report downloaded as CSV" });
  };

  const exportJson = () => {
    const exportData = {
      year: selectedYear,
      totals,
      monthly_breakdown: monthlyData,
      transactions: records,
      generated_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-report-${selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: "Tax report downloaded as JSON" });
  };

  // Pie chart data for tax composition
  const pieData = [
    { name: "VAT (15%)", value: totals.vat, color: CHART_COLORS[0] },
    { name: "NHIL (2.5%)", value: totals.nhil, color: CHART_COLORS[1] },
    { name: "GETFund (2.5%)", value: totals.getfund, color: CHART_COLORS[2] },
  ].filter(d => d.value > 0);

  if (!hasTaxReportsAccess) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Card className="max-w-xl mx-auto">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Tax Reports Not Available</h2>
            <p className="text-muted-foreground">
              Tax reporting is currently being configured by the platform administrator.
              Please check back later or contact support for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Tax Reports"
        description="GRA-compliant tax computation records and aggregations"
        rightContent={
          <div className="flex items-center gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2026, 2025, 2024].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchTaxData} disabled={loading} className="bg-card">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-colors shadow-sm bg-card">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Net Sales</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xl font-bold">{formatCurrency(totals.net_sales)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-[hsl(217_91%_60%)]/20 transition-colors shadow-sm bg-card">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">VAT (15%)</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[hsl(217_91%_60%)]/10 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-[hsl(217_91%_60%)]" />
                </div>
                <p className="text-xl font-bold">{formatCurrency(totals.vat)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-amber-500/20 transition-colors shadow-sm bg-card">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">NHIL (2.5%)</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Calculator className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-xl font-bold">{formatCurrency(totals.nhil)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-purple-500/20 transition-colors shadow-sm bg-card">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">GETFund (2.5%)</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Calculator className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-xl font-bold">{formatCurrency(totals.getfund)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/20 transition-colors shadow-sm bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Total Tax</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xl font-bold text-primary">{formatCurrency(totals.total_tax)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="charts" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <FileText className="w-4 h-4" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-6">
            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Tax Trend</CardTitle>
                <CardDescription>Tax breakdown by month for {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--popover))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px" 
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="vat" name="VAT" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="nhil" name="NHIL" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="getfund" name="GETFund" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No tax records for {selectedYear}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Tax Composition Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tax Composition</CardTitle>
                  <CardDescription>Breakdown of total taxes collected</CardDescription>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Net Sales vs Tax Line Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sales vs Tax Trend</CardTitle>
                  <CardDescription>Net sales compared to total tax</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="net_sales" 
                          name="Net Sales" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total_tax" 
                          name="Total Tax" 
                          stroke="hsl(var(--destructive))" 
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            {/* Export Buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={exportCsv} disabled={records.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportJson} disabled={records.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>

            {/* Transaction Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>NHIL</TableHead>
                      <TableHead>GETFund</TableHead>
                      <TableHead>VAT</TableHead>
                      <TableHead>Total Tax</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No tax records found for {selectedYear}
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.slice(0, 100).map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">
                            {format(new Date(record.computed_at), "MMM dd, HH:mm")}
                          </TableCell>
                          <TableCell>{formatCurrency(record.net_amount)}</TableCell>
                          <TableCell>{formatCurrency(record.nhil_amount)}</TableCell>
                          <TableCell>{formatCurrency(record.getfund_amount)}</TableCell>
                          <TableCell>{formatCurrency(record.vat_amount)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(record.total_tax)}</TableCell>
                          <TableCell>{formatCurrency(record.gross_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={record.vat_registered_at_time ? "default" : "secondary"}>
                              {record.vat_registered_at_time ? "VAT Reg" : "Non-VAT"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {records.length > 100 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t">
                    Showing first 100 of {records.length} records. Export for full data.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TaxReports;

import { useState, useRef, useMemo } from "react";
import { Download, Calendar, TrendingUp, Wallet, Receipt, FileText, Loader2, BarChart3, PieChart, Activity, Users, ShoppingCart, CreditCard, Smartphone, Target, Filter, ChevronDown, Eye, EyeOff, RefreshCw, Mail, Printer, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionHistory } from "@/components/TransactionHistory";
import { CashReconciliation } from "@/components/CashReconciliation";
import { EmployeeSalesCard } from "@/components/EmployeeSalesCard";
import { ItemSalesCard } from "@/components/ItemSalesCard";
import { TimeReportCard } from "@/components/TimeReportCard";
import { EmployeeLeaderboard } from "@/components/EmployeeLeaderboard";
import { EndOfDayChecklist } from "@/components/EndOfDayChecklist";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export const Reports = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [reportType, setReportType] = useState("sales");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { profile, user } = useBusiness();
  const { toast } = useToast();
  const { format: formatCurrency, currencySymbol } = useCurrency();
  const reportRef = useRef<HTMLDivElement>(null);

  const stats = useDashboardStats(
    dateRange?.from && dateRange?.to
      ? { start: dateRange.from, end: dateRange.to }
      : undefined
  );

  const cashPercentage = stats.totalSales > 0
    ? ((stats.cashSales / stats.totalSales) * 100).toFixed(0)
    : "0";
  const cardPercentage = stats.totalSales > 0
    ? ((stats.cardSales / stats.totalSales) * 100).toFixed(0)
    : "0";
  const mobilePercentage = stats.totalSales > 0
    ? ((stats.mobileMoney / stats.totalSales) * 100).toFixed(0)
    : "0";

  const paymentMethods = useMemo(() => [
    { name: "Cash", value: stats.cashSales, percentage: cashPercentage, icon: Coins, color: "green" },
    { name: "Card", value: stats.cardSales, percentage: cardPercentage, icon: CreditCard, color: "blue" },
    { name: "Mobile Money", value: stats.mobileMoney, percentage: mobilePercentage, icon: Smartphone, color: "orange" },
  ], [stats.cashSales, stats.cardSales, stats.mobileMoney, cashPercentage, cardPercentage, mobilePercentage]);

  const quickDateRanges = [
    { label: "Today", value: { from: new Date(), to: new Date() } },
    { label: "Yesterday", value: { from: new Date(Date.now() - 86400000), to: new Date(Date.now() - 86400000) } },
    { label: "Last 7 Days", value: { from: new Date(Date.now() - 604800000), to: new Date() } },
    { label: "Last 30 Days", value: { from: new Date(Date.now() - 2592000000), to: new Date() } },
    { label: "This Month", value: { from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date() } },
    { label: "Last Month", value: { from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), to: new Date(new Date().getFullYear(), new Date().getMonth(), 0) } },
  ];

  const handleApplyDateRange = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      setDateRange(tempDateRange);
      setIsDatePickerOpen(false);
      toast({
        title: "Date range applied",
        description: `Showing data from ${format(tempDateRange.from, "MMM d")} to ${format(tempDateRange.to, "MMM d, yyyy")}`,
      });
    }
  };

  const handleCancelDateRange = () => {
    setTempDateRange(dateRange);
    setIsDatePickerOpen(false);
  };

  const dateLabel = dateRange?.from && dateRange?.to
    ? dateRange.from.toDateString() === dateRange.to.toDateString()
      ? format(dateRange.from, "MMM d, yyyy")
      : `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
    : "Select dates";

  const handleExportPDF = async () => {
    if (!user || !dateRange?.from || !dateRange?.to) {
      toast({
        title: "Error",
        description: "Please select a date range first",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      // Fetch transactions for the date range
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", dateRange.from.toISOString())
        .lte("transaction_date", dateRange.to.toISOString())
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      // Generate HTML content for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sales Report - ${profile?.business_name || "Business"}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .business-name { font-size: 24px; font-weight: bold; color: #4f46e5; }
    .date-range { color: #6b7280; font-size: 14px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1a1a1a; margin-top: 5px; }
    .stat-change { font-size: 12px; color: #10b981; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    tr:nth-child(even) { background: #f9fafb; }
    .total-row { font-weight: bold; background: #eef2ff !important; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="business-name">${profile?.business_name || "Business"}</div>
      <div class="date-range">Sales Report: ${dateLabel}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 12px; color: #6b7280;">Generated: ${format(new Date(), "MMM d, yyyy HH:mm")}</div>
    </div>
  </div>

  <h2>Summary</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Sales</div>
      <div class="stat-value">${currencySymbol}${stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Cash Sales</div>
      <div class="stat-value">${currencySymbol}${stats.cashSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-change">${cashPercentage}% of total</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Card Sales</div>
      <div class="stat-value">${currencySymbol}${stats.cardSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-change">${cardPercentage}% of total</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Mobile Money</div>
      <div class="stat-value">${currencySymbol}${stats.mobileMoney.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-change">${mobilePercentage}% of total</div>
    </div>
  </div>

  <h2>Transactions</h2>
  <table>
    <thead>
      <tr>
        <th>Transaction #</th>
        <th>Date</th>
        <th>Payment Method</th>
        <th>Amount</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${(transactions || []).map(t => `
        <tr>
          <td>${t.transaction_number}</td>
          <td>${format(new Date(t.transaction_date), "MMM d, yyyy HH:mm")}</td>
          <td>${t.payment_method}</td>
          <td>${currencySymbol}${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${t.status}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="3"><strong>Total</strong></td>
        <td><strong>${currencySymbol}${stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
        <td>${(transactions || []).length} transactions</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>${profile?.business_name || "Business"}</p>
    <p>Report generated by POS System</p>
  </div>
</body>
</html>
      `;

      // Create a blob and download
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      // Open in new window for printing
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast({
        title: "Report Generated",
        description: "Print dialog opened. Save as PDF using your browser's print function.",
      });

    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <PageHeader
        title="Business Analytics"
        description="Advanced insights and comprehensive reporting for data-driven decisions."
        rightContent={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="gap-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-primary/5 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-md font-semibold">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </Button>
            <Button size="sm" onClick={handleExportPDF} disabled={exporting} className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{exporting ? "Generating..." : "Export"}</span>
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-700" ref={reportRef}>
        {/* Date Range and Quick Actions */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <BarChart3 className="w-7 h-7 text-primary" />
                  Performance Dashboard
                </h3>
                <p className="text-sm text-muted-foreground">
                  Reporting period: <span className="font-semibold text-foreground">{dateLabel}</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* Quick Date Ranges */}
                <Select value={dateLabel} onValueChange={(value) => {
                  const range = quickDateRanges.find(r => r.label === value);
                  if (range) setDateRange(range.value);
                }}>
                  <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-slate-800 border-2 border-primary/20 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-md">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-xl">
                    {quickDateRanges.map((range) => (
                      <SelectItem key={range.label} value={range.label} className="hover:bg-primary/10 focus:bg-primary/10">{range.label}</SelectItem>
                    ))}
                    {!quickDateRanges.some(r => r.label === dateLabel) && (
                      <SelectItem value={dateLabel} className="hidden">{dateLabel}</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {/* Custom Date Range */}
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="gap-2 bg-white dark:bg-slate-800 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-md font-semibold"
                      onClick={() => {
                        setTempDateRange(dateRange);
                        setIsDatePickerOpen(true);
                      }}
                    >
                      <Calendar className="w-4 h-4" />
                      Custom Range
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 shadow-2xl rounded-xl" align="end">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary/5 to-primary/10">
                      <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Select Date Range
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tempDateRange?.from && tempDateRange?.to ? (
                          <>
                            {format(tempDateRange.from, "MMM d, yyyy")} - {format(tempDateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          "Choose start and end dates"
                        )}
                      </p>
                    </div>
                    <div className="p-3">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={tempDateRange?.from}
                        selected={tempDateRange}
                        onSelect={setTempDateRange}
                        numberOfMonths={2}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelDateRange}
                        className="flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApplyDateRange}
                        disabled={!tempDateRange?.from || !tempDateRange?.to}
                        className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                      >
                        Apply Range
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-primary/5 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200">
                      <SelectValue placeholder="Report type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-xl">
                      <SelectItem value="sales" className="hover:bg-primary/10 focus:bg-primary/10">Sales Reports</SelectItem>
                      <SelectItem value="inventory" className="hover:bg-primary/10 focus:bg-primary/10">Inventory Reports</SelectItem>
                      <SelectItem value="employee" className="hover:bg-primary/10 focus:bg-primary/10">Employee Reports</SelectItem>
                      <SelectItem value="financial" className="hover:bg-primary/10 focus:bg-primary/10">Financial Reports</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="gap-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 font-semibold">
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Data</span>
                  </Button>
                  <Button variant="outline" className="gap-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-semibold">
                    <Mail className="w-4 h-4" />
                    <span>Email Report</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-slate-300/50 dark:border-slate-600/50 p-1 rounded-xl shadow-lg">
            <TabsTrigger
              value="overview"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 font-semibold"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 font-semibold"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Sales Analysis</span>
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 font-semibold"
            >
              <Activity className="w-4 h-4" />
              <span>Transactions</span>
            </TabsTrigger>
            <TabsTrigger
              value="employees"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 font-semibold"
            >
              <Users className="w-4 h-4" />
              <span>Employees</span>
            </TabsTrigger>
            <TabsTrigger
              value="operations"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 font-semibold"
            >
              <Target className="w-4 h-4" />
              <span>Operations</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white dark:bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                      <TrendingUp className="h-7 w-7 text-white" />
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">
                      Revenue
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <p className="text-3xl font-bold text-foreground tabular-nums">
                      {stats.loading ? "..." : formatCurrency(stats.totalSales)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-sm text-muted-foreground">Gross Sales</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white dark:bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-500/80 rounded-xl shadow-lg">
                      <Wallet className="h-7 w-7 text-white" />
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 font-semibold">
                      Cash
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <p className="text-3xl font-bold text-foreground tabular-nums">
                      {stats.loading ? "..." : formatCurrency(stats.cashSales)}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Cash Sales</p>
                      <span className="text-sm font-semibold text-green-600">{cashPercentage}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white dark:bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-500/80 rounded-xl shadow-lg">
                      <CreditCard className="h-7 w-7 text-white" />
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
                      Cards
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <p className="text-3xl font-bold text-foreground tabular-nums">
                      {stats.loading ? "..." : formatCurrency(stats.cardSales)}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Card Sales</p>
                      <span className="text-sm font-semibold text-blue-600">{cardPercentage}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white dark:bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-500/80 rounded-xl shadow-lg">
                      <Smartphone className="h-7 w-7 text-white" />
                    </div>
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-semibold">
                      Mobile Money
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <p className="text-3xl font-bold text-foreground tabular-nums">
                      {stats.loading ? "..." : formatCurrency(stats.mobileMoney)}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">MoMo Sales</p>
                      <span className="text-sm font-semibold text-purple-600">{mobilePercentage}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clean Payment Methods Breakdown */}
            <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 py-4 px-5 sm:px-6">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-muted-foreground" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    
                    const solidColorClass = 
                      method.color === 'green' ? 'bg-emerald-500' :
                      method.color === 'blue' ? 'bg-blue-500' : 'bg-orange-500';
                      
                    const iconColorClass = 
                      method.color === 'green' ? 'text-emerald-600 dark:text-emerald-500' :
                      method.color === 'blue' ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500';

                    const percentageValue = parseFloat(method.percentage) || 0;

                    return (
                      <div key={method.name} className="p-4 sm:p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                            <Icon className={`h-4 w-4 ${iconColorClass}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{method.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{method.percentage}% of total revenue</p>
                          </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-2 max-w-xs w-full sm:ml-auto">
                          <div className="flex justify-between sm:justify-end">
                            <span className="text-sm font-medium tabular-nums">{formatCurrency(method.value)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${solidColorClass} rounded-full`}
                              style={{ width: `${percentageValue}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Analysis Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmployeeSalesCard />
              <ItemSalesCard />
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <TransactionHistory dateRange={dateRange} />
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <EmployeeLeaderboard />
            <TimeReportCard />
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CashReconciliation />
              </div>
              <div>
                <EndOfDayChecklist />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

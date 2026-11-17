import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Download, FileText, Calendar, Clock, CheckCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { format, addDays, addWeeks, addMonths } from "date-fns";

interface ScheduledReport {
  id: string;
  name: string;
  report_type: string;
  frequency: string;
  table_name: string;
  last_run_at: string | null;
  next_run_at: string | null;
  is_active: boolean;
}

export const ExportReportingTab = () => {
  const [exporting, setExporting] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [dateRange, setDateRange] = useState("last_30_days");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReportDialog, setShowNewReportDialog] = useState(false);
  const [newReportName, setNewReportName] = useState("");
  const [newReportTable, setNewReportTable] = useState("");
  const [newReportFrequency, setNewReportFrequency] = useState("daily");
  const [creating, setCreating] = useState(false);
  const [quickReportLoading, setQuickReportLoading] = useState<string | null>(null);

  const exportTables = [
    { value: "orders", label: "Orders" },
    { value: "transactions", label: "Transactions" },
    { value: "customers", label: "Customers" },
    { value: "inventory_items", label: "Inventory" },
    { value: "invoices", label: "Invoices" },
    { value: "business_profiles", label: "Businesses" },
    { value: "staff", label: "Staff" },
    { value: "audit_logs", label: "Audit Logs" },
  ];

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  const fetchScheduledReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scheduled_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScheduledReports(data || []);
    } catch (error) {
      console.error("Error fetching scheduled reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedTable) {
      toast.error("Please select a table to export");
      return;
    }

    setExporting(true);

    try {
      let query = supabase.from(selectedTable as any).select("*");
      
      // Apply date range filter if applicable
      if (dateRange === "last_7_days") {
        query = query.gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      } else if (dateRange === "last_30_days") {
        query = query.gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      } else if (dateRange === "last_90_days") {
        query = query.gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      }

      const { data, error } = await query.limit(10000);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const csv = Papa.unparse(data, { header: includeHeaders });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedTable}_export_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();

      toast.success(`Exported ${data.length} records`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const generateQuickReport = async (reportType: string) => {
    setQuickReportLoading(reportType);
    
    try {
      let data: any[] = [];
      let filename = "";

      switch (reportType) {
        case "revenue": {
          const { data: transactions, error } = await supabase
            .from("transactions")
            .select("transaction_date, amount, payment_method, status")
            .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .order("transaction_date", { ascending: false });
          if (error) throw error;
          
          const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          const byPaymentMethod: Record<string, number> = {};
          transactions?.forEach(t => {
            byPaymentMethod[t.payment_method] = (byPaymentMethod[t.payment_method] || 0) + Number(t.amount);
          });

          data = [
            { metric: "Total Revenue (30 days)", value: totalRevenue },
            ...Object.entries(byPaymentMethod).map(([method, amount]) => ({
              metric: `Revenue by ${method}`, value: amount
            })),
            { metric: "Total Transactions", value: transactions?.length || 0 },
          ];
          filename = "revenue_summary";
          break;
        }

        case "user_growth": {
          const { data: businesses, error } = await supabase
            .from("business_profiles")
            .select("created_at, business_name, industry, plan_tier")
            .order("created_at", { ascending: false });
          if (error) throw error;

          const last30Days = businesses?.filter(b => 
            new Date(b.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length || 0;
          const last7Days = businesses?.filter(b => 
            new Date(b.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length || 0;

          data = [
            { metric: "Total Businesses", value: businesses?.length || 0 },
            { metric: "New (Last 7 days)", value: last7Days },
            { metric: "New (Last 30 days)", value: last30Days },
          ];
          filename = "user_growth_report";
          break;
        }

        case "transactions": {
          const { data: transactions, error } = await supabase
            .from("transactions")
            .select("*")
            .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .order("transaction_date", { ascending: false });
          if (error) throw error;

          data = transactions || [];
          filename = "transaction_analysis";
          break;
        }

        case "subscriptions": {
          const { data: subs, error } = await supabase
            .from("user_subscriptions")
            .select("*, subscription_plans(name)")
            .order("created_at", { ascending: false });
          if (error) throw error;

          const active = subs?.filter(s => s.status === "active").length || 0;
          const cancelled = subs?.filter(s => s.status === "cancelled").length || 0;

          data = [
            { metric: "Total Subscriptions", value: subs?.length || 0 },
            { metric: "Active", value: active },
            { metric: "Cancelled", value: cancelled },
          ];
          filename = "subscription_metrics";
          break;
        }

        case "inventory": {
          const { data: items, error } = await supabase
            .from("inventory_items")
            .select("name, quantity, price, low_stock_threshold, is_active");
          if (error) throw error;

          const lowStock = items?.filter(i => i.quantity <= (i.low_stock_threshold || 10)).length || 0;
          const totalValue = items?.reduce((sum, i) => sum + (i.quantity * Number(i.price)), 0) || 0;

          data = [
            { metric: "Total Products", value: items?.length || 0 },
            { metric: "Low Stock Items", value: lowStock },
            { metric: "Total Inventory Value", value: totalValue },
          ];
          filename = "inventory_status";
          break;
        }
      }

      if (data.length === 0) {
        toast.error("No data available for this report");
        return;
      }

      const csv = Papa.unparse(data, { header: true });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();

      toast.success("Report generated successfully");
    } catch (error) {
      console.error("Quick report error:", error);
      toast.error("Failed to generate report");
    } finally {
      setQuickReportLoading(null);
    }
  };

  const createScheduledReport = async () => {
    if (!newReportName || !newReportTable) {
      toast.error("Please fill in all fields");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const now = new Date();
      let nextRun: Date;
      switch (newReportFrequency) {
        case "daily": nextRun = addDays(now, 1); break;
        case "weekly": nextRun = addWeeks(now, 1); break;
        case "monthly": nextRun = addMonths(now, 1); break;
        default: nextRun = addDays(now, 1);
      }

      const { error } = await supabase
        .from("scheduled_reports")
        .insert({
          name: newReportName,
          report_type: "export",
          table_name: newReportTable,
          frequency: newReportFrequency,
          next_run_at: nextRun.toISOString(),
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Scheduled report created");
      setShowNewReportDialog(false);
      setNewReportName("");
      setNewReportTable("");
      setNewReportFrequency("daily");
      fetchScheduledReports();
    } catch (error: any) {
      console.error("Error creating scheduled report:", error);
      toast.error(error.message || "Failed to create report");
    } finally {
      setCreating(false);
    }
  };

  const deleteScheduledReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Report deleted");
      fetchScheduledReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    }
  };

  const toggleReportActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("scheduled_reports")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(isActive ? "Report paused" : "Report activated");
      fetchScheduledReports();
    } catch (error) {
      console.error("Error toggling report:", error);
      toast.error("Failed to update report");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Export Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" /> Export Data
            </CardTitle>
            <CardDescription>Export data tables to CSV format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Table</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a table..." />
                </SelectTrigger>
                <SelectContent>
                  {exportTables.map((table) => (
                    <SelectItem key={table.value} value={table.value}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="headers"
                checked={includeHeaders}
                onCheckedChange={(checked) => setIncludeHeaders(checked as boolean)}
              />
              <Label htmlFor="headers" className="cursor-pointer">Include column headers</Label>
            </div>

            <Button 
              onClick={handleExport} 
              disabled={exporting || !selectedTable}
              className="w-full gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Export to CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Quick Reports
            </CardTitle>
            <CardDescription>Generate common reports instantly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "revenue", label: "Revenue Summary" },
              { key: "user_growth", label: "User Growth Report" },
              { key: "transactions", label: "Transaction Analysis" },
              { key: "subscriptions", label: "Subscription Metrics" },
              { key: "inventory", label: "Inventory Status" },
            ].map(report => (
              <Button 
                key={report.key}
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => generateQuickReport(report.key)}
                disabled={quickReportLoading === report.key}
              >
                {quickReportLoading === report.key ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {report.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Scheduled Reports
              </CardTitle>
              <CardDescription>Automated reports for your data</CardDescription>
            </div>
            <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> Schedule New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Scheduled Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Report Name</Label>
                    <Input 
                      placeholder="e.g., Daily Sales Report" 
                      value={newReportName}
                      onChange={(e) => setNewReportName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Table to Export</Label>
                    <Select value={newReportTable} onValueChange={setNewReportTable}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select table..." />
                      </SelectTrigger>
                      <SelectContent>
                        {exportTables.map((table) => (
                          <SelectItem key={table.value} value={table.value}>
                            {table.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={newReportFrequency} onValueChange={setNewReportFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewReportDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createScheduledReport} disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="min-w-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : scheduledReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No scheduled reports yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    scheduledReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>{report.table_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{report.frequency}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {report.last_run_at ? format(new Date(report.last_run_at), "MMM d, yyyy") : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {report.next_run_at ? format(new Date(report.next_run_at), "MMM d, yyyy") : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={report.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                            onClick={() => toggleReportActive(report.id, report.is_active)}
                            style={{ cursor: "pointer" }}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> 
                            {report.is_active ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteScheduledReport(report.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

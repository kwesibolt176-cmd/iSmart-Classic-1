import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, FileText, Calendar, TrendingUp } from "lucide-react";
import { useTaxEngine } from "@/hooks/use-tax-engine";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaxAggregation } from "@/lib/ghana-tax-engine";

export const TaxReportingCard = () => {
  const { getAggregation, saveAggregation, exportAsJson, exportAsCsv, businessTaxProfile } = useTaxEngine();
  const { format: formatCurrency, currencySymbol } = useCurrency();

  const [periodType, setPeriodType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [aggregation, setAggregation] = useState<TaxAggregation | null>(null);

  const getDateRange = () => {
    switch (periodType) {
      case 'daily':
        return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
      case 'monthly':
        return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
      case 'yearly':
        return { start: startOfYear(selectedDate), end: endOfYear(selectedDate) };
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const result = await getAggregation(periodType, start, end);
      
      if (result) {
        setAggregation(result);
        await saveAggregation(result);
        toast({
          title: "Report generated",
          description: `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} tax report is ready.`,
        });
      } else {
        toast({
          title: "No data",
          description: "No tax records found for the selected period.",
        });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate tax report.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type: 'json' | 'csv') => {
    if (!aggregation) return;

    const content = type === 'json' ? exportAsJson(aggregation) : exportAsCsv(aggregation);
    const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${aggregation.period_start}-to-${aggregation.period_end}.${type}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Tax report exported as ${type.toUpperCase()}.`,
    });
  };

  const getPeriodLabel = () => {
    switch (periodType) {
      case 'daily':
        return format(selectedDate, 'MMMM d, yyyy');
      case 'monthly':
        return format(selectedDate, 'MMMM yyyy');
      case 'yearly':
        return format(selectedDate, 'yyyy');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <CardTitle>Tax Reporting</CardTitle>
        </div>
        <CardDescription>
          Generate and export GRA-compliant tax reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period Selection */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Calendar className="w-4 h-4 mr-2" />
                {getPeriodLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Generate
          </Button>
        </div>

        {/* Report Results */}
        {aggregation && (
          <>
            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Tax Report: {aggregation.period_start} to {aggregation.period_end}
                </h3>
                <Badge variant={businessTaxProfile?.vat_registered ? "default" : "secondary"}>
                  {businessTaxProfile?.vat_registered ? "VAT Registered" : "Not VAT Registered"}
                </Badge>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Total Transactions</div>
                  <div className="text-lg font-semibold">{aggregation.total_transactions}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Total Sales</div>
                  <div className="text-lg font-semibold">{formatCurrency(aggregation.total_sales)}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Net Amount</div>
                  <div className="text-lg font-semibold">{formatCurrency(aggregation.total_net_amount)}</div>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="text-xs text-muted-foreground">Total Tax</div>
                  <div className="text-lg font-semibold text-primary">{formatCurrency(aggregation.total_tax)}</div>
                </div>
              </div>

              {/* Tax Breakdown */}
              <div className="p-4 bg-muted/30 rounded-lg border space-y-2">
                <h4 className="text-sm font-medium">Tax Component Breakdown</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">NHIL (2.5%):</span>
                    <div className="font-medium">{formatCurrency(aggregation.total_nhil)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">GETFund (2.5%):</span>
                    <div className="font-medium">{formatCurrency(aggregation.total_getfund)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VAT (15%):</span>
                    <div className="font-medium">{formatCurrency(aggregation.total_vat)}</div>
                  </div>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleExport('csv')} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => handleExport('json')} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

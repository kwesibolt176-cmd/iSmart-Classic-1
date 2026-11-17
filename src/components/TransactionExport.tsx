import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";

interface TransactionExportProps {
  data: any[];
  filename: string;
  columns: { key: string; label: string; format?: (value: any) => string }[];
}

export const TransactionExport = ({ data, filename, columns }: TransactionExportProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exporting, setExporting] = useState(false);

  const getFilteredData = () => {
    if (dateRange === 'all') return data;
    
    let start: Date;
    let end = new Date();
    
    switch (dateRange) {
      case '7days':
        start = subDays(new Date(), 7);
        break;
      case '30days':
        start = subDays(new Date(), 30);
        break;
      case '90days':
        start = subDays(new Date(), 90);
        break;
      case 'custom':
        start = new Date(startDate);
        end = new Date(endDate);
        break;
      default:
        return data;
    }
    
    return data.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= start && itemDate <= end;
    });
  };

  const exportToCSV = () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = columns.map(col => col.label).join(',');
    const rows = filteredData.map(item => 
      columns.map(col => {
        const value = item[col.key];
        const formatted = col.format ? col.format(value) : value;
        // Escape commas and quotes for CSV
        const escaped = String(formatted ?? '').replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${filteredData.length} records`);
    setDialogOpen(false);
  };

  const exportToPDF = () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create a printable HTML table
    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename} Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          p { color: #666; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          @media print {
            body { padding: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${filename} Report</h1>
        <p>Generated on ${format(new Date(), 'PPP p')} | ${filteredData.length} records</p>
        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr>
                ${columns.map(col => {
                  const value = item[col.key];
                  const formatted = col.format ? col.format(value) : value;
                  return `<td>${formatted ?? ''}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(tableHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
    
    toast.success(`Prepared ${filteredData.length} records for PDF`);
    setDialogOpen(false);
  };

  const handleExport = () => {
    setExporting(true);
    try {
      if (exportFormat === 'csv') {
        exportToCSV();
      } else {
        exportToPDF();
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Transactions
          </DialogTitle>
          <DialogDescription>
            Download your transaction data as CSV or PDF
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={exportFormat} onValueChange={(v: 'csv' | 'pdf') => setExportFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                <SelectItem value="pdf">PDF (Print)</SelectItem>
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
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {getFilteredData().length} records will be exported
          </p>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting} className="w-full sm:w-auto">
            {exporting && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
            Export {exportFormat.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionExport;

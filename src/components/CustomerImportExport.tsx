import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import Papa from "papaparse";
import type { Customer } from "@/pages/Customers";

interface CustomerImportExportProps {
  customers: Customer[];
  onImportComplete: () => void;
}

export const CustomerImportExport = ({ customers, onImportComplete }: CustomerImportExportProps) => {
  const { user } = useBusiness();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleExport = () => {
    const exportData = customers.map(c => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      total_orders: c.totalOrders,
      total_spent: c.totalSpent,
      loyalty_points: c.loyaltyPoints,
      last_visit: c.lastVisit
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Customers exported successfully");
  };

  const downloadTemplate = () => {
    const template = [{ name: "John Doe", email: "john@example.com", phone: "+1234567890", notes: "VIP customer" }];
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "customer_import_template.csv";
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5));
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      }
    });
  };

  const handleImport = async () => {
    if (!user || preview.length === 0) return;
    setImporting(true);

    try {
      const customersToInsert = preview.map((row: any) => ({
        user_id: user.id,
        name: row.name || "Unknown",
        email: row.email || null,
        phone: row.phone || null,
        notes: row.notes || null
      }));

      const { error } = await supabase.from("customers").insert(customersToInsert);
      
      if (error) throw error;
      
      toast.success(`${customersToInsert.length} customers imported successfully`);
      setDialogOpen(false);
      setPreview([]);
      onImportComplete();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import customers");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleExport} className="gap-2">
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Customers</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>Upload a CSV file with customer data</span>
            </div>

            <Button variant="link" onClick={downloadTemplate} className="gap-2 p-0 h-auto">
              <FileText className="w-4 h-4" />
              Download CSV Template
            </Button>

            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload CSV file</p>
              </label>
            </div>

            {preview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>{preview.length} customers ready to import</span>
                </div>

                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row: any, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.email}</td>
                          <td className="p-2">{row.phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button onClick={handleImport} disabled={importing} className="w-full">
                  {importing ? "Importing..." : `Import ${preview.length} Customers`}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

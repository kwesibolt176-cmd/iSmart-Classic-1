import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Filter, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { InvoiceCard } from "@/components/InvoiceCard";
import { createInvoiceAction } from "@/lib/pending-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent } from "@/components/ui/card";
import { NewInvoiceDialog } from "@/components/NewInvoiceDialog";
import { InvoiceTemplateManager } from "@/components/invoice/InvoiceTemplateManager";
import { RecurringInvoiceManager } from "@/components/invoice/RecurringInvoiceManager";
import { LateFeeSettings } from "@/components/invoice/LateFeeSettings";
import { DepositSettings } from "@/components/invoice/DepositSettings";
import { InvoiceAgingReport } from "@/components/invoice/InvoiceAgingReport";
import { RevenueForecasting } from "@/components/invoice/RevenueForecasting";
import { CustomerPaymentHistory } from "@/components/invoice/CustomerPaymentHistory";
import { MerchantInvoicesPanel } from "@/components/merchant/MerchantIntegrationPanels";
import { InvoiceReminderSettings } from "@/components/InvoiceReminderSettings";
import { PaymentReminderEscalation } from "@/components/invoice/PaymentReminderEscalation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  issue_date: string;
  due_date: string;
  total: number;
  status: string;
  items: any[];
  subtotal: number;
  tax: number;
  notes: string | null;
  sent_at: string | null;
  payment_method: string | null;
  payment_date: string | null;
  paid_amount: number;
  payment_link: string | null;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user } = useBusiness();
  const { toast } = useToast();
  const { format: formatAmount } = useCurrency();

  const fetchInvoices = async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices((data || []) as Invoice[]);
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

  useEffect(() => {
    fetchInvoices();
  }, [user?.id, statusFilter]);

  const handleInvoiceCreated = () => {
    fetchInvoices();
    setNewInvoiceOpen(false);
  };

  const handleSendInvoice = async (invoiceId: string, sendEmail: boolean, sendSMS: boolean) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) throw new Error("Invoice not found");

      // Create pending action instead of calling edge function directly
      await createInvoiceAction(
        invoice.invoice_number,
        invoice.customer_email || '',
        `Invoice ${invoice.invoice_number} details here`,
        'high'
      );

      // Update invoice status
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ 
          sent_at: new Date().toISOString(),
          status: invoice.status === 'draft' ? 'sent' : invoice.status
        })
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      toast({
        title: "Invoice queued",
        description: "Invoice has been queued for sending. Admin will approve and send it.",
      });

      fetchInvoices();
    } catch (error: any) {
      console.error("Error queuing invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to queue invoice",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });

      fetchInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Invoices"
        description="Create, manage, and track professional invoices for your business customers."
        rightContent={<FileText className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
        <MerchantInvoicesPanel />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10 shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-foreground">Invoicing Dashboard</h3>
            <p className="text-sm text-muted-foreground">Monitor your accounts receivable and manage recurring billing.</p>
          </div>
          <Button onClick={() => setNewInvoiceOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/20">
            <Plus className="h-4 w-4" />
            Create New Invoice
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Invoiced</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatAmount(invoices.reduce((sum, inv) => sum + (inv.total || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-orange-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatAmount(invoices.filter(inv => inv.status === 'sent' || inv.status === 'partially_paid').reduce((sum, inv) => sum + (inv.total - (inv.paid_amount || 0)), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-[hsl(217_91%_60%)]/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <CheckCircle className="h-6 w-6 text-[hsl(217_91%_60%)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</p>
                  <p className="text-2xl font-bold text-[hsl(217_91%_60%)]">
                    {formatAmount(invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-red-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatAmount(invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.total - (inv.paid_amount || 0)), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-card rounded-lg border border-border">
              <p className="text-sm sm:text-base text-muted-foreground">No invoices found. Create your first invoice!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              {invoices.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  onSend={handleSendInvoice}
                  onDelete={handleDeleteInvoice}
                  onPaymentRecorded={fetchInvoices}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <RecurringInvoiceManager />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InvoiceAgingReport />
            <RevenueForecasting />
          </div>
          <CustomerPaymentHistory />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LateFeeSettings />
            <DepositSettings />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InvoiceReminderSettings />
            <InvoiceTemplateManager />
          </div>
          <PaymentReminderEscalation />
        </TabsContent>
      </Tabs>

      <NewInvoiceDialog
        open={newInvoiceOpen}
        onOpenChange={setNewInvoiceOpen}
        onInvoiceCreated={handleInvoiceCreated}
      />
      </div>
    </div>
  );
}

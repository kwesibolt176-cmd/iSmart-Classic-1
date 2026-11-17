import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { InstallmentSchedule } from "./InstallmentSchedule";
import { Loader2 } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  onUpdate?: () => void;
}

export const InvoiceDetailsDialog = ({ open, onOpenChange, invoice, onUpdate }: InvoiceDetailsDialogProps) => {
  const { format: formatCurrency } = useCurrency();
  const [installments, setInstallments] = useState<any[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && invoice?.id) {
      fetchPaymentPlanData();
    }
  }, [open, invoice?.id]);

  const fetchPaymentPlanData = async () => {
    setLoading(true);
    try {
      // Fetch payment plan
      const { data: planData } = await supabase
        .from('invoice_payment_plans')
        .select('*')
        .eq('invoice_id', invoice.id)
        .maybeSingle();

      setPaymentPlan(planData);

      // Fetch installments if plan exists
      if (planData) {
        const { data: installmentsData } = await supabase
          .from('invoice_installments')
          .select('*')
          .eq('invoice_id', invoice.id)
          .order('installment_number', { ascending: true });

        setInstallments(installmentsData || []);
      }
    } catch (error) {
      console.error("Error fetching payment plan data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: "bg-gray-500",
      sent: "bg-blue-500",
      paid: "bg-green-500",
      partially_paid: "bg-yellow-500",
      overdue: "bg-red-500",
      cancelled: "bg-gray-400"
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{invoice?.invoice_number}</DialogTitle>
            <Badge className={getStatusColor(invoice?.status)}>
              {invoice?.status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Invoice Details</TabsTrigger>
            <TabsTrigger value="payment-plan" disabled={!paymentPlan}>
              Payment Plan {paymentPlan && `(${installments.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{invoice?.customer_name}</span>
                </div>
                {invoice?.customer_email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{invoice.customer_email}</span>
                  </div>
                )}
                {invoice?.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{invoice.customer_phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue Date:</span>
                  <span>{format(new Date(invoice?.issue_date), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span>{format(new Date(invoice?.due_date), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(parseFloat(invoice?.subtotal?.toString() || "0"))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{formatCurrency(parseFloat(invoice?.tax?.toString() || "0"))}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary">
                    {formatCurrency(parseFloat(invoice?.total?.toString() || "0"))}
                  </span>
                </div>
                {invoice?.paid_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Paid:</span>
                    <span>{formatCurrency(parseFloat(invoice?.paid_amount?.toString() || "0"))}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {invoice?.items && invoice.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {invoice.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name} x {item.quantity}</span>
                        <span>{formatCurrency(item.quantity * item.price)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {invoice?.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payment-plan" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : paymentPlan ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Plan Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number of Installments:</span>
                      <span className="font-medium">{paymentPlan.number_of_installments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency:</span>
                      <span className="font-medium capitalize">{paymentPlan.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">First Payment:</span>
                      <span className="font-medium">
                        {format(new Date(paymentPlan.first_payment_date), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <InstallmentSchedule
                  installments={installments}
                  invoiceId={invoice.id}
                  onPaymentRecorded={() => {
                    fetchPaymentPlanData();
                    onUpdate?.();
                  }}
                />
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No payment plan configured for this invoice.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
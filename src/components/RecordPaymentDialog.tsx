import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { createInvoiceAction } from "@/lib/pending-actions";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_email?: string | null;
    customer_phone?: string | null;
    total: number;
    paid_amount?: number;
  };
  onPaymentRecorded?: () => void;
}

export const RecordPaymentDialog = ({ open, onOpenChange, invoice, onPaymentRecorded }: RecordPaymentDialogProps) => {
  const { profile } = useBusiness();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  
  const remainingAmount = invoice.total - (invoice.paid_amount || 0);
  const [paymentAmount, setPaymentAmount] = useState(remainingAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [sendReceiptToCustomer, setSendReceiptToCustomer] = useState(true);
  const [sendReceiptToProvider, setSendReceiptToProvider] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > remainingAmount) {
      toast({
        title: "Error",
        description: "Payment amount cannot exceed remaining balance",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const newPaidAmount = (invoice.paid_amount || 0) + amount;
      const newStatus = newPaidAmount >= invoice.total ? 'paid' : 'partially_paid';

      const { error } = await supabase
        .from("invoices")
        .update({
          paid_amount: newPaidAmount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString(),
          status: newStatus,
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Send receipts if requested
      const recipients: string[] = [];
      if (sendReceiptToCustomer && invoice.customer_email) {
        recipients.push(invoice.customer_email);
      }
      const businessEmail = (profile as any)?.business_email;
      if (sendReceiptToProvider && businessEmail) {
        recipients.push(businessEmail);
      }

      if (recipients.length > 0) {
        // Create pending action for receipt sending
        await createInvoiceAction(
          invoice.invoice_number,
          recipients.join(', '),
          `Payment of ${formatCurrency(amount)} received for Invoice ${invoice.invoice_number}. Customer: ${invoice.customer_name}. Method: ${paymentMethod.replace('_', ' ')}.`,
          'normal'
        );
      }

      toast({
        title: "Success",
        description: `Payment of ${formatCurrency(amount)} recorded successfully${recipients.length > 0 ? '. Receipt queued for sending.' : ''}`,
      });

      onPaymentRecorded?.();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice:</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">{profile?.currency || 'GHS'} {invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid Amount:</span>
              <span className="font-medium">{profile?.currency || 'GHS'} {(invoice.paid_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t">
              <span>Remaining Balance:</span>
              <span className="text-primary">{profile?.currency || 'GHS'} {remainingAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Payment Amount *</Label>
            <Input
              id="paymentAmount"
              type="number"
              min="0.01"
              max={remainingAmount}
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label>Send Receipt To:</Label>
            {invoice.customer_email && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="receipt-customer"
                  checked={sendReceiptToCustomer}
                  onCheckedChange={(checked) => setSendReceiptToCustomer(checked as boolean)}
                />
                <Label htmlFor="receipt-customer" className="cursor-pointer text-sm">
                  Customer ({invoice.customer_email})
                </Label>
              </div>
            )}
            {(profile as any)?.business_email && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="receipt-provider"
                  checked={sendReceiptToProvider}
                  onCheckedChange={(checked) => setSendReceiptToProvider(checked as boolean)}
                />
                <Label htmlFor="receipt-provider" className="cursor-pointer text-sm">
                  Service Provider ({(profile as any).business_email})
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

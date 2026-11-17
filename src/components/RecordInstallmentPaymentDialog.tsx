import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface RecordInstallmentPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: {
    id: string;
    installment_number: number;
    amount: number;
    paid_amount: number;
    due_date: string;
  };
  invoiceId: string;
  onPaymentRecorded?: () => void;
}

export const RecordInstallmentPaymentDialog = ({
  open,
  onOpenChange,
  installment,
  invoiceId,
  onPaymentRecorded
}: RecordInstallmentPaymentDialogProps) => {
  const remainingAmount = installment.amount - (installment.paid_amount || 0);
  const [amount, setAmount] = useState(remainingAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (paymentAmount > remainingAmount) {
      toast.error("Payment amount exceeds remaining balance");
      return;
    }

    setLoading(true);

    try {
      const newPaidAmount = (installment.paid_amount || 0) + paymentAmount;
      const newStatus = newPaidAmount >= installment.amount ? 'paid' : 'partially_paid';

      const { error: installmentError } = await supabase
        .from('invoice_installments')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', installment.id);

      if (installmentError) throw installmentError;

      // Check if all installments are paid to update invoice status
      const { data: allInstallments, error: fetchError } = await supabase
        .from('invoice_installments')
        .select('paid_amount, amount')
        .eq('invoice_id', invoiceId);

      if (fetchError) throw fetchError;

      const totalPaid = allInstallments?.reduce((sum, inst) => sum + (inst.paid_amount || 0), 0) || 0;
      const totalAmount = allInstallments?.reduce((sum, inst) => sum + inst.amount, 0) || 0;

      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          paid_amount: totalPaid,
          status: totalPaid >= totalAmount ? 'paid' : 'partially_paid',
          payment_method: paymentMethod,
          payment_date: totalPaid >= totalAmount ? new Date().toISOString() : null
        })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      toast.success("Payment recorded successfully");
      onPaymentRecorded?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Installment Payment</DialogTitle>
          <DialogDescription>
            Installment #{installment.installment_number} - Due {format(new Date(installment.due_date), "MMM dd, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">GHS {installment.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already Paid:</span>
              <span className="font-medium text-green-600">
                GHS {(installment.paid_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Remaining:</span>
              <span className="font-bold">GHS {remainingAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remainingAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
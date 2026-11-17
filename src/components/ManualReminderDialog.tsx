import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createInvoiceAction, createSMSAction } from "@/lib/pending-actions";

interface ManualReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
  };
}

export const ManualReminderDialog = ({ open, onOpenChange, invoice }: ManualReminderDialogProps) => {
  const { toast } = useToast();
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendReminder = async () => {
    if (!sendEmail && !sendSMS) {
      toast({
        title: "Error",
        description: "Please select at least one notification method",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create pending actions for email and/or SMS
      if (sendEmail && invoice.customer_email) {
        await createInvoiceAction(
          invoice.invoice_number,
          invoice.customer_email,
          `<p>Payment reminder for Invoice ${invoice.invoice_number}</p>`,
          'high'
        );
      }

      if (sendSMS && invoice.customer_phone) {
        await createSMSAction(
          invoice.customer_phone,
          `Payment reminder: Invoice ${invoice.invoice_number} for ${invoice.customer_name} is due. Please process payment at your earliest convenience.`,
          'high'
        );
      }

      toast({
        title: "Reminder Queued",
        description: "Payment reminder has been queued for admin approval.",
      });

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
          <DialogTitle>Send Payment Reminder</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Invoice: {invoice.invoice_number}</p>
            <p className="text-sm text-muted-foreground">Customer: {invoice.customer_name}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            Choose how you want to send the payment reminder:
          </p>

          {invoice.customer_email && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                <Mail className="h-4 w-4" />
                Send via Email ({invoice.customer_email})
              </Label>
            </div>
          )}
          
          {invoice.customer_phone && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sms"
                checked={sendSMS}
                onCheckedChange={(checked) => setSendSMS(checked as boolean)}
              />
              <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="h-4 w-4" />
                Send via SMS ({invoice.customer_phone})
              </Label>
            </div>
          )}

          {!invoice.customer_email && !invoice.customer_phone && (
            <p className="text-sm text-destructive">
              No contact information available for this customer.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendReminder}
            disabled={loading || (!invoice.customer_email && !invoice.customer_phone)}
          >
            {loading ? "Sending..." : "Send Reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

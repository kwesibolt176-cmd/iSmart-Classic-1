import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Eye, Trash2, Mail, MessageSquare, Receipt, Bell, Copy, Link } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { ManualReminderDialog } from "./ManualReminderDialog";
import { InvoiceDetailsDialog } from "./InvoiceDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface InvoiceCardProps {
  invoice: {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    issue_date: string;
    due_date: string;
    total: number;
    status: string;
    payment_method: string | null;
    payment_date: string | null;
    paid_amount: number;
    payment_link?: string | null;
  };
  onSend: (id: string, sendEmail: boolean, sendSMS: boolean) => void;
  onDelete: (id: string) => void;
  onPaymentRecorded?: () => void;
}

export const InvoiceCard = ({ invoice, onSend, onDelete, onPaymentRecorded }: InvoiceCardProps) => {
  const { toast } = useToast();
  const { format: formatCurrency } = useCurrency();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);

  const copyPaymentLink = async () => {
    if (invoice.payment_link) {
      try {
        await navigator.clipboard.writeText(invoice.payment_link);
        toast({
          title: "Link Copied",
          description: "Payment link copied to clipboard. Share via WhatsApp or SMS.",
        });
      } catch {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500";
      case "sent":
        return "bg-[hsl(217_91%_60%)]";
      case "paid":
        return "bg-[hsl(217_91%_60%)]";
      case "partially_paid":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-500";
      case "cancelled":
        return "bg-gray-400";
      default:
        return "bg-gray-500";
    }
  };

  const remainingBalance = invoice.total - (invoice.paid_amount || 0);
  const isPaid = invoice.status === 'paid';
  const canRecordPayment = !isPaid && invoice.status !== 'draft' && invoice.status !== 'cancelled';

  const handleSendConfirm = () => {
    onSend(invoice.id, sendEmail, sendSMS);
    setShowSendDialog(false);
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1 overflow-hidden">
              <h3 className="font-bold text-lg truncate pr-2">{invoice.invoice_number}</h3>
              <p className="text-sm text-muted-foreground truncate" title={invoice.customer_name}>{invoice.customer_name}</p>
            </div>
            <Badge className={getStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Issue Date:</span>
            <span>{format(new Date(invoice.issue_date), "MMM dd, yyyy")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Due Date:</span>
            <span>{format(new Date(invoice.due_date), "MMM dd, yyyy")}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Total:</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(invoice.total)}
            </span>
          </div>
          {invoice.paid_amount > 0 && (
            <>
              <div className="flex justify-between text-sm pt-2">
                <span className="text-muted-foreground">Paid:</span>
                <span className="text-[hsl(217_91%_60%)] font-medium">
                  {formatCurrency(invoice.paid_amount)}
                </span>
              </div>
              {!isPaid && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="font-medium">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              )}
            </>
          )}
          {invoice.payment_method && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="capitalize">{invoice.payment_method.replace('_', ' ')}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 pt-4 px-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetailsDialog(true)}
            className="flex-1 min-w-[70px]"
          >
            <Eye className="h-4 w-4 mr-1 shrink-0" />
            <span className="truncate">View</span>
          </Button>
          {invoice.payment_link && !isPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyPaymentLink}
              title="Copy payment link for WhatsApp/SMS"
            >
              <Link className="h-4 w-4 mr-1" />
              Copy Link
            </Button>
          )}
          {canRecordPayment && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowPaymentDialog(true)}
              className="flex-1"
            >
              <Receipt className="h-4 w-4 mr-1" />
              Payment
            </Button>
          )}
          {!isPaid && invoice.status !== 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReminderDialog(true)}
              className={canRecordPayment ? "" : "flex-1"}
            >
              <Bell className="h-4 w-4 mr-1" />
              Remind
            </Button>
          )}
          {!isPaid && invoice.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSendDialog(true)}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-1" />
              Send
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <InvoiceDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        invoice={invoice}
        onUpdate={onPaymentRecorded}
      />

      <RecordPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        invoice={invoice}
        onPaymentRecorded={onPaymentRecorded}
      />

      <ManualReminderDialog
        open={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        invoice={invoice}
      />

      <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to send this invoice to {invoice.customer_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
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
              <p className="text-sm text-muted-foreground">
                No contact information available for this customer.
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendConfirm}
              disabled={!sendEmail && !sendSMS}
            >
              Send Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoice.invoice_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(invoice.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

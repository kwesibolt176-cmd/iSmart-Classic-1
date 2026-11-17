import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Printer, Mail, X, CheckCircle2, MessageSquare, Loader2, Send } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TaxComputationResult } from "@/lib/ghana-tax-engine";
import { TaxBreakdownReceipt } from "@/components/TaxBreakdownReceipt";

interface ReceiptProps {
  order: {
    orderNumber: string;
    tableNumber: number;
    items: Array<{ id: string; name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
    server: string;
  };
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  onClose: () => void;
  paymentMethod?: string;
  tenderedAmount?: number | null;
  changeDue?: number | null;
  transactionId?: string;
  taxResult?: TaxComputationResult | null;
  autoPrint?: boolean;
}

export const Receipt = ({ 
  order, 
  orderNumber: explicitOrderNumber,
  customerName,
  customerPhone: propCustomerPhone,
  customerEmail: propCustomerEmail,
  onClose, 
  paymentMethod, 
  tenderedAmount, 
  changeDue, 
  transactionId,
  taxResult,
  autoPrint = false,
}: ReceiptProps) => {
  const { format: formatCurrency } = useCurrency();
  const { profile } = useBusiness();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [email, setEmail] = useState(propCustomerEmail || "");
  const [phone, setPhone] = useState(propCustomerPhone || "");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const autoPrintTriggered = useRef(false);

  useEffect(() => {
    if (!autoPrint || autoPrintTriggered.current) return;
    autoPrintTriggered.current = true;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  const displayOrderNumber = explicitOrderNumber || order.orderNumber;

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const businessName = profile?.business_name || "Your Business";
  const businessAddress = profile?.address || "";
  const businessPhone = profile?.business_phone || "";

  const handleSendEmail = async () => {
    if (!email) {
      toast({ title: "Email required", description: "Please enter an email address", variant: "destructive" });
      return;
    }

    setSendingEmail(true);
    try {
      const receiptHtml = generateReceiptHtml();
      
      const { error } = await supabase.functions.invoke('send-email-direct', {
        body: {
          to: email,
          subject: `Payment Receipt - ${displayOrderNumber}`,
          html: receiptHtml,
        },
      });

      if (error) throw error;

      toast({ title: "Receipt sent!", description: `Email sent to ${email}` });
      setEmailDialogOpen(false);
      setEmail("");
    } catch (error: any) {
      console.error('Error sending email receipt:', error);
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendSms = async () => {
    if (!phone) {
      toast({ title: "Phone required", description: "Please enter a phone number", variant: "destructive" });
      return;
    }

    setSendingSms(true);
    try {
      const receiptLink = `https://app.getdowo.com/receipt?order=${encodeURIComponent(displayOrderNumber.replace(/^#/, ''))}`;
      const smsMessage = `[Success] Payment confirmed!\n${businessName}\nOrder: ${displayOrderNumber}\nTotal: ${formatCurrency(order.total)}\n\nReceipt: ${receiptLink}`;

      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phone,
          message: smsMessage,
          type: 'receipt',
          channel: 'sms',
        },
      });

      if (error) throw error;

      toast({ title: "Receipt sent!", description: `SMS sent to ${phone}` });
      setSmsDialogOpen(false);
      setPhone("");
    } catch (error: any) {
      console.error('Error sending SMS receipt:', error);
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally {
      setSendingSms(false);
    }
  };

  const generateReceiptHtml = () => {
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${item.quantity}x ${item.name}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
            <h1 style="margin: 0; font-size: 24px;">Payment Successful</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h2 style="margin: 0 0 5px 0; font-size: 20px; color: #111;">${businessName}</h2>
              ${businessAddress ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">${businessAddress}</p>` : ''}
              ${businessPhone ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">Tel: ${businessPhone}</p>` : ''}
            </div>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="color: #6b7280;">Order #:</td>
                  <td style="text-align: right; font-weight: 600;">${displayOrderNumber}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280;">Date:</td>
                  <td style="text-align: right;">${currentDate}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280;">Payment:</td>
                  <td style="text-align: right;">${paymentMethod || 'Cash'}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280;">Status:</td>
                  <td style="text-align: right;"><span style="background: #d1fae5; color: #059669; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Completed</span></td>
                </tr>
              </table>
            </div>
            
            <h3 style="margin: 20px 0 10px 0; font-size: 16px; color: #111;">Items</h3>
            <table style="width: 100%; font-size: 14px;">
              ${itemsHtml}
            </table>
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="color: #6b7280;">Subtotal</td>
                  <td style="text-align: right;">${formatCurrency(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280;">Tax</td>
                  <td style="text-align: right;">${formatCurrency(order.tax)}</td>
                </tr>
                ${tenderedAmount ? `
                <tr>
                  <td style="color: #6b7280;">Amount Tendered</td>
                  <td style="text-align: right;">${formatCurrency(tenderedAmount)}</td>
                </tr>
                ` : ''}
                ${changeDue ? `
                <tr>
                  <td style="color: #6b7280;">Change Due</td>
                  <td style="text-align: right; color: #059669; font-weight: 600;">${formatCurrency(changeDue)}</td>
                </tr>
                ` : ''}
              </table>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #10B981; display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                <span>Total</span>
                <span style="color: #10B981;">${formatCurrency(order.total)}</span>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p style="margin: 0;">Thank you for your business!</p>
              <p style="margin: 5px 0 0 0;">Please come back soon!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const receiptWidth = (profile as any)?.receipt_width || '80mm';
  const printWidth = receiptWidth === '58mm' ? '58mm' : '80mm';

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${printWidth} auto;
            margin: 2mm;
          }
          html, body {
            width: ${printWidth};
            margin: 0;
            padding: 0;
          }
          body * {
            visibility: hidden;
          }
          .receipt-printable, .receipt-printable * {
            visibility: visible;
          }
          .receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: ${printWidth};
            font-size: ${receiptWidth === '58mm' ? '10px' : '12px'};
            padding: 2mm;
          }
          .receipt-printable h2 {
            font-size: ${receiptWidth === '58mm' ? '14px' : '16px'} !important;
          }
          .receipt-printable .text-2xl {
            font-size: ${receiptWidth === '58mm' ? '16px' : '20px'} !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="flex-1 overflow-auto bg-background p-4 sm:p-8">
      <div className="max-w-[600px] mx-auto">
        <div className="flex justify-between items-start mb-6 no-print">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payment Successful</h1>
              <p className="text-sm text-muted-foreground">Transaction completed</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="receipt-printable bg-card rounded-2xl border border-border p-6 sm:p-8 mb-6 shadow-lg">
          <div className="text-center mb-6">
            {profile?.logo_url && (
              <img src={profile.logo_url} alt={businessName} className="h-12 mx-auto mb-3" />
            )}
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{businessName}</h2>
            {businessAddress && <p className="text-sm text-muted-foreground">{businessAddress}</p>}
            {businessPhone && <p className="text-sm text-muted-foreground">Tel: {businessPhone}</p>}
          </div>

          <Separator className="my-6" />

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Number:</span>
              <span className="font-semibold text-foreground">{displayOrderNumber}</span>
            </div>
            {customerName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground">{customerName}</span>
              </div>
            )}
            {order.tableNumber > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Table:</span>
                <span className="font-semibold text-foreground">{order.tableNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-semibold text-foreground">{currentDate}</span>
            </div>
            {paymentMethod && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Payment Method:</span>
                <Badge variant="secondary" className="capitalize">{paymentMethod}</Badge>
              </div>
            )}
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Status:</span>
              <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30">Completed</Badge>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-3 mb-6">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {item.quantity}x {item.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.price)} each</p>
                </div>
                <span className="font-semibold text-foreground">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
            </div>
            
            {/* Tax Breakdown for VAT-registered businesses */}
            {taxResult?.vat_registered ? (
              <TaxBreakdownReceipt taxResult={taxResult} subtotal={order.subtotal} />
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">{formatCurrency(order.tax)}</span>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          <div className="flex justify-between items-center mb-4">
            <span className="text-xl font-bold text-foreground">Total</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(order.total)}</span>
          </div>

          {tenderedAmount != null && changeDue != null && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Tendered</span>
                <span className="font-semibold text-foreground">{formatCurrency(tenderedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Change Due</span>
                <span className="font-bold text-green-600">{formatCurrency(changeDue)}</span>
              </div>
            </div>
          )}

          <div className="text-center pt-6 border-t border-border mt-6">
            <p className="text-sm text-muted-foreground">Thank you for your business!</p>
            <p className="text-sm text-muted-foreground">Please come back soon!</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 no-print">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setEmailDialogOpen(true)}>
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setSmsDialogOpen(true)}>
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">SMS</span>
          </Button>
        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Send Receipt via Email
            </DialogTitle>
            <DialogDescription>
              Enter the customer's email address to send the receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button 
              className="w-full gap-2" 
              onClick={handleSendEmail}
              disabled={sendingEmail || !email}
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email Receipt
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Send Receipt via SMS
            </DialogTitle>
            <DialogDescription>
              Enter the customer's phone number to send the receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+233 XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button 
              className="w-full gap-2" 
              onClick={handleSendSms}
              disabled={sendingSms || !phone}
            >
              {sendingSms ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send SMS Receipt
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

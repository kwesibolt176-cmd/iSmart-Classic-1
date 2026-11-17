import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "@/hooks/use-toast";
import { MoreVertical, Mail, MessageSquare, Loader2, ChevronDown, ChevronUp, Package } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Transaction {
  id: string;
  transaction_number: string;
  transaction_date: string;
  amount: number;
  payment_method: string;
  status: string;
  order_id?: string;
  orderItems?: OrderItem[];
}

interface TransactionHistoryProps {
  dateRange?: DateRange;
}

export const TransactionHistory = ({ dateRange }: TransactionHistoryProps) => {
  const { user, profile } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReceipt, setSendingReceipt] = useState<string | null>(null);
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const startDate = dateRange?.from ? new Date(dateRange.from) : new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = dateRange?.to ? new Date(dateRange.to) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", startDate.toISOString())
        .lte("transaction_date", endDate.toISOString())
        .order("transaction_date", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Pre-fetch order items for all transactions with order_id
      const transactionsWithItems = await Promise.all(
        (data || []).map(async (transaction) => {
          if (transaction.order_id) {
            const { data: items } = await supabase
              .from('order_items')
              .select('id, name, quantity, price')
              .eq('order_id', transaction.order_id);
            return { ...transaction, orderItems: items || [] };
          }
          return { ...transaction, orderItems: [] };
        })
      );

      setTransactions(transactionsWithItems);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendReceipt = async (transaction: Transaction, method: 'email' | 'sms') => {
    if (!transaction.order_id) {
      toast({
        title: "Cannot resend receipt",
        description: "No order linked to this transaction",
        variant: "destructive",
      });
      return;
    }

    setSendingReceipt(`${transaction.id}-${method}`);

    try {
      // Fetch order details with items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', transaction.order_id)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      const customerPhone = order.customer_phone;
      const orderNumber = order.order_number;
      
      // Try to get customer email from customers table if customer_id exists
      let customerEmail: string | null = null;
      if (order.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('email')
          .eq('id', order.customer_id)
          .single();
        customerEmail = customer?.email || null;
      }

      if (method === 'email') {
        if (!customerEmail) {
          toast({
            title: "No email address",
            description: "This order has no customer email on file",
            variant: "destructive",
          });
          return;
        }

        const itemsHtml = (order.order_items || []).map((item: any) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${item.quantity}x ${item.name}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
          </tr>
        `).join('');

        const receiptHtml = `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <div style="font-size: 48px;">✓</div>
                <h1 style="margin: 10px 0 0 0;">Payment Receipt</h1>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <h2 style="margin: 0 0 5px 0;">${profile?.business_name || 'Store'}</h2>
                  ${profile?.address ? `<p style="margin: 0; color: #6b7280;">${profile.address}</p>` : ''}
                </div>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <table style="width: 100%;">
                    <tr><td style="color: #6b7280;">Order #:</td><td style="text-align: right; font-weight: 600;">${orderNumber}</td></tr>
                    <tr><td style="color: #6b7280;">Date:</td><td style="text-align: right;">${format(new Date(transaction.transaction_date), 'MMM d, yyyy')}</td></tr>
                    <tr><td style="color: #6b7280;">Payment:</td><td style="text-align: right;">${transaction.payment_method}</td></tr>
                  </table>
                </div>
                <table style="width: 100%;">${itemsHtml}</table>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #10B981; text-align: right;">
                  <span style="font-size: 20px; font-weight: bold;">Total: ${formatCurrency(transaction.amount)}</span>
                </div>
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for your business!</p>
                </div>
              </div>
            </body>
          </html>
        `;

        await supabase.functions.invoke('send-email-direct', {
          body: { to: customerEmail, subject: `Payment Receipt - ${orderNumber}`, html: receiptHtml },
        });

        toast({
          title: "Email sent!",
          description: `Receipt sent to ${customerEmail}`,
        });
      } else {
        if (!customerPhone) {
          toast({
            title: "No phone number",
            description: "This order has no customer phone on file",
            variant: "destructive",
          });
          return;
        }

        const trackingLink = `${window.location.origin}/order-tracking?phone=${encodeURIComponent(customerPhone)}`;
        const smsMessage = `[Success] Payment Receipt\n${profile?.business_name || 'Store'}\nOrder: ${orderNumber}\nTotal: ${formatCurrency(transaction.amount)}\nTrack: ${trackingLink}`;

        const { error } = await supabase.functions.invoke('send-sms', {
          body: { to: customerPhone, message: smsMessage, type: 'receipt', channel: 'sms' },
        });

        if (error) {
          if (error.message?.includes('INSUFFICIENT_CREDITS')) {
            toast({
              title: "Insufficient SMS credits",
              description: "Purchase credits in Settings to send SMS receipts.",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }

        toast({
          title: "SMS sent!",
          description: `Receipt sent to ${customerPhone}`,
        });
      }
    } catch (error: any) {
      console.error('Error resending receipt:', error);
      toast({
        title: "Failed to send receipt",
        description: error.message || "Could not send receipt",
        variant: "destructive",
      });
    } finally {
      setSendingReceipt(null);
    }
  };

  const handleToggleItems = (transactionId: string) => {
    if (expandedTransaction === transactionId) {
      setExpandedTransaction(null);
    } else {
      setExpandedTransaction(transactionId);
    }
  };

  const isMultiDay = dateRange?.from && dateRange?.to && 
    dateRange.from.toDateString() !== dateRange.to.toDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No transactions for selected period</p>
          ) : (
            transactions.map((transaction) => (
              <Collapsible 
                key={transaction.id}
                open={expandedTransaction === transaction.id}
                onOpenChange={() => handleToggleItems(transaction.id)}
              >
                <div className="rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{transaction.transaction_number}</p>
                          <Badge variant="secondary" className="text-xs">
                            {transaction.payment_method === "cash" ? "Cash" : 
                             transaction.payment_method === "card" ? "Card" : 
                             transaction.payment_method === "mobile_money" ? "Mobile Money" : 
                             transaction.payment_method}
                          </Badge>
                          <Badge 
                            className={`text-xs ${
                              transaction.status === "completed" 
                                ? "bg-green-500/20 text-green-600 hover:bg-green-500/30" 
                                : transaction.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30"
                                : "bg-red-500/20 text-red-600 hover:bg-red-500/30"
                            }`}
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isMultiDay 
                            ? format(new Date(transaction.transaction_date), "MMM d, h:mm a")
                            : format(new Date(transaction.transaction_date), "h:mm a")
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-foreground">
                          {formatCurrency(transaction.amount)}
                        </p>
                        {transaction.orderItems && transaction.orderItems.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleItems(transaction.id);
                            }}
                          >
                            {expandedTransaction === transaction.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {transaction.order_id && transaction.status === "completed" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                {sendingReceipt?.startsWith(transaction.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleResendReceipt(transaction, 'email')}
                                disabled={sendingReceipt !== null}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Resend Email Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleResendReceipt(transaction, 'sms')}
                                disabled={sendingReceipt !== null}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Resend SMS Receipt
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pt-3">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">Order Items</span>
                      </div>
                      {transaction.orderItems && transaction.orderItems.length > 0 ? (
                        <div className="space-y-2">
                          {transaction.orderItems.map((item) => (
                            <div 
                              key={item.id} 
                              className="flex justify-between items-center text-sm py-1.5 px-2 bg-background/50 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5 min-w-[24px] justify-center">
                                  {item.quantity}x
                                </Badge>
                                <span>{item.name}</span>
                              </div>
                              <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No items found</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

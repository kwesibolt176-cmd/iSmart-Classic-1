import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link2,
  Copy,
  Send,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  X,
  ExternalLink,
  PartyPopper,
} from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  customer_name?: string;
  customer_phone?: string;
  payment_link?: string;
  payment_link_expires_at?: string;
  created_at: string;
}

interface PaymentLinkManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onLinkGenerated?: () => void;
}

type PaymentLinkStatus = "none" | "active" | "expired" | "paid";

export function PaymentLinkManager({
  open,
  onOpenChange,
  order,
  onLinkGenerated,
}: PaymentLinkManagerProps) {
  const { toast } = useToast();
  const { format: formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone || "");
  const [expiryMinutes, setExpiryMinutes] = useState("10");
  const [linkStatus, setLinkStatus] = useState<PaymentLinkStatus>("none");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [paymentLink, setPaymentLink] = useState(order.payment_link || "");
  const [sendingMethod, setSendingMethod] = useState<"sms" | "whatsapp" | null>(null);

  // Calculate link status and time remaining
  const updateLinkStatus = useCallback(() => {
    if (order.status === "completed" || order.status === "paid") {
      setLinkStatus("paid");
      return;
    }

    if (!order.payment_link || !order.payment_link_expires_at) {
      setLinkStatus("none");
      return;
    }

    const expiresAt = new Date(order.payment_link_expires_at).getTime();
    const now = Date.now();
    const remaining = Math.floor((expiresAt - now) / 1000);

    if (remaining <= 0) {
      setLinkStatus("expired");
      setTimeRemaining(0);
    } else {
      setLinkStatus("active");
      setTimeRemaining(remaining);
      setPaymentLink(order.payment_link);
    }
  }, [order]);

  useEffect(() => {
    updateLinkStatus();
  }, [updateLinkStatus]);

  // Countdown timer
  useEffect(() => {
    if (linkStatus !== "active" || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setLinkStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [linkStatus]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`payment-link-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'completed' || newStatus === 'paid') {
            setLinkStatus("paid");
            toast({
              title: "Payment Received!",
              description: `Order ${order.order_number} has been paid.`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, order.id, order.order_number, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const generatePaymentLink = async () => {
    setLoading(true);
    try {
      const link = `${window.location.origin}/pay?orderId=${order.id}&orderNumber=${encodeURIComponent(order.order_number)}`;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expiryMinutes));

      const { error } = await supabase
        .from("orders")
        .update({
          payment_link: link,
          payment_link_expires_at: expiresAt.toISOString(),
          customer_phone: customerPhone || null,
        })
        .eq("id", order.id);

      if (error) throw error;

      setPaymentLink(link);
      setLinkStatus("active");
      setTimeRemaining(parseInt(expiryMinutes) * 60);

      await navigator.clipboard.writeText(link);

      toast({
        title: "Payment Link Created",
        description: "Link copied to clipboard!",
      });

      onLinkGenerated?.();
    } catch (error) {
      console.error("Error generating payment link:", error);
      toast({
        title: "Error",
        description: "Failed to generate payment link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      toast({
        title: "Copied!",
        description: "Payment link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const sendViaSMS = async () => {
    if (!customerPhone) {
      toast({
        title: "Phone Required",
        description: "Please enter a customer phone number",
        variant: "destructive",
      });
      return;
    }

    setSendingMethod("sms");
    try {
      const message = `Hi! Please complete your payment of ${formatCurrency(order.total)} for order ${order.order_number}. Pay here: ${paymentLink}`;
      
      const { error } = await supabase.functions.invoke("send-sms", {
        body: {
          to: customerPhone,
          message,
        },
      });

      if (error) throw error;

      toast({
        title: "SMS Sent!",
        description: `Payment link sent to ${customerPhone}`,
      });
    } catch (error) {
      console.error("Error sending SMS:", error);
      toast({
        title: "Error",
        description: "Failed to send SMS. Try copying the link instead.",
        variant: "destructive",
      });
    } finally {
      setSendingMethod(null);
    }
  };

  const sendViaWhatsApp = () => {
    if (!customerPhone) {
      toast({
        title: "Phone Required",
        description: "Please enter a customer phone number",
        variant: "destructive",
      });
      return;
    }

    const message = encodeURIComponent(
      `Hi! Please complete your payment of ${formatCurrency(order.total)} for order ${order.order_number}. Pay here: ${paymentLink}`
    );
    const phone = customerPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const cancelPaymentLink = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_link: null,
          payment_link_expires_at: null,
        })
        .eq("id", order.id);

      if (error) throw error;

      setPaymentLink("");
      setLinkStatus("none");
      setTimeRemaining(0);

      toast({
        title: "Link Cancelled",
        description: "Payment link has been invalidated",
      });

      onLinkGenerated?.();
    } catch (error) {
      console.error("Error cancelling link:", error);
      toast({
        title: "Error",
        description: "Failed to cancel payment link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (linkStatus) {
      case "paid":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Payment Link
            </DialogTitle>
            {getStatusBadge()}
          </div>
          <DialogDescription>
            Order {order.order_number} • {formatCurrency(order.total)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Paid State */}
          {linkStatus === "paid" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-green-700">Payment Received!</h3>
                <p className="text-sm text-green-600 mt-1">
                  This order has been paid successfully.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Active Link State */}
          {linkStatus === "active" && (
            <>
              {/* Timer */}
              <Card className="border-dashed">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Expires in
                    </span>
                    <span className={`font-mono font-bold text-lg ${
                      timeRemaining < 60 ? "text-destructive" : 
                      timeRemaining < 180 ? "text-amber-500" : "text-green-600"
                    }`}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Link Display */}
              <div className="space-y-2">
                <Label>Payment Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={paymentLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Send Options */}
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  type="tel"
                  placeholder="+233 XX XXX XXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={sendViaSMS}
                  disabled={sendingMethod === "sms"}
                >
                  {sendingMethod === "sms" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Send SMS
                </Button>
                <Button
                  variant="outline"
                  onClick={sendViaWhatsApp}
                  className="bg-green-500/10 hover:bg-green-500/20 text-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={generatePaymentLink}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={cancelPaymentLink}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          )}

          {/* Expired State */}
          {linkStatus === "expired" && (
            <>
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6 text-center">
                  <XCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-amber-700">Link Expired</h3>
                  <p className="text-sm text-amber-600 mt-1">
                    Generate a new payment link for the customer.
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Customer Phone (Optional)</Label>
                  <Input
                    type="tel"
                    placeholder="+233 XX XXX XXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Link Expires In</Label>
                  <Select value={expiryMinutes} onValueChange={setExpiryMinutes}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={generatePaymentLink} disabled={loading} className="w-full">
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Generate New Link
                </Button>
              </div>
            </>
          )}

          {/* No Link State */}
          {linkStatus === "none" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Phone (Optional)</Label>
                <Input
                  type="tel"
                  placeholder="+233 XX XXX XXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter to send payment link via SMS or WhatsApp
                </p>
              </div>

              <div className="space-y-2">
                <Label>Link Expires In</Label>
                <Select value={expiryMinutes} onValueChange={setExpiryMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={generatePaymentLink} disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Generate Payment Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

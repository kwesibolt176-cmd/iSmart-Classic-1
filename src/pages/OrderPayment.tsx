import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Smartphone, CheckCircle2, XCircle, Clock, Store, AlertTriangle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createTransactionNotification } from "@/lib/transaction-notifications";


interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  user_id: string;
  customer_name?: string;
  order_items: OrderItem[];
  payment_link_expires_at?: string;
}

interface BusinessProfile {
  business_name: string;
  logo_url?: string;
  currency: string;
  business_email?: string;
  business_phone?: string;
}

type PaymentStatus = "waiting" | "processing" | "success" | "expired" | "failed";

export default function OrderPayment() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");

  const [order, setOrder] = useState<Order | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "momo">("momo");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("waiting");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  const fetchOrder = useCallback(async () => {
    try {
      let query = supabase.from("orders").select(`
        id, order_number, total, status, user_id, customer_name, payment_link_expires_at,
        order_items (id, name, quantity, price)
      `);
      
      if (orderId) {
        query = query.eq("id", orderId);
      } else if (orderNumber) {
        query = query.eq("order_number", orderNumber);
      } else {
        setLoading(false);
        return;
      }

      const { data: orderData, error: orderError } = await query.single();

      if (orderError) throw orderError;

      setOrder(orderData as unknown as Order);

      // Check if payment link has expired
      if (orderData.payment_link_expires_at) {
        const expiresAt = new Date(orderData.payment_link_expires_at).getTime();
        const now = Date.now();
        if (now > expiresAt) {
          setPaymentStatus("expired");
        } else {
          const remaining = Math.floor((expiresAt - now) / 1000);
          setTimeRemaining(remaining);
          // Assuming 10 minute default expiry for progress calculation
          setTotalDuration(10 * 60);
        }
      } else {
        // Default 10 minute expiry if not set
        setTimeRemaining(10 * 60);
        setTotalDuration(10 * 60);
      }

      // Fetch business profile
      const { data: businessData } = await supabase
        .from("business_profiles")
        .select("business_name, logo_url, currency, business_email, business_phone")
        .eq("user_id", orderData.user_id)
        .single();

      if (businessData) {
        setBusiness(businessData);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [orderId, orderNumber, toast]);

  // Initial fetch
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Countdown timer
  useEffect(() => {
    if (paymentStatus !== "waiting" || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setPaymentStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentStatus, timeRemaining]);

  // Real-time subscription for order status updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-payment-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'completed' || newStatus === 'paid') {
            setPaymentStatus("success");
            setOrder((prev) => {
              if (prev) {
                // Create transaction notification for completed payment
                createTransactionNotification({
                  userId: prev.user_id,
                  transactionId: `TXN-${Date.now()}`,
                  orderNumber: prev.order_number,
                  amount: prev.total,
                  paymentMethod: 'Online Payment',
                  customerName: prev.customer_name,
                });
                
                return { ...prev, status: newStatus };
              }
              return null;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const formatCurrency = (amount: number) => {
    const currency = business?.currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    const percentRemaining = (timeRemaining / totalDuration) * 100;
    if (percentRemaining > 50) return "text-green-600";
    if (percentRemaining > 25) return "text-amber-500";
    return "text-destructive";
  };

  const getProgressColor = () => {
    const percentRemaining = (timeRemaining / totalDuration) * 100;
    if (percentRemaining > 50) return "bg-green-500";
    if (percentRemaining > 25) return "bg-amber-500";
    return "bg-destructive";
  };

  const handlePayment = async () => {
    if (!order || !business) return;

    if (paymentStatus === "expired") {
      toast({
        title: "Link Expired",
        description: "This payment link has expired. Please request a new one from the merchant.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setPaymentStatus("processing");
    
    try {
      const { data, error } = await supabase.functions.invoke("ismart-checkout", {
        body: {
          orderId: order.id,
          orderNumber: order.order_number,
          amount: order.total,
          customerName: order.customer_name || "Walk-in Customer",
          customerPhone: (order as any).customer_phone,
          customerEmail: (order as any).customer_email,
          provider: "MTN",
          merchantUserId: order.user_id,
          items: order.order_items?.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        },
      });

      if (error) throw error;
      if (data?.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      if (data?.success === false) throw new Error(data.error || "Failed to initialize payment");

      window.location.href = `/merchant-payment/callback?reference=${data?.reference || order.id}`;
    } catch (error) {
      console.error("Payment initialization error:", error);
      setPaymentStatus("failed");
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "secondary",
      ready: "default",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground">
              The order you're looking for doesn't exist or the link has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment Success Screen
  if (paymentStatus === "success" || order.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto animate-in zoom-in duration-300">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-600">Payment Successful!</h2>
            <p className="text-muted-foreground">
              Your payment has been received. Thank you for your order!
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-mono font-bold text-lg">{order.order_number}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              The merchant has been notified and will prepare your order.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment Expired Screen
  if (paymentStatus === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-amber-600">Payment Link Expired</h2>
            <p className="text-muted-foreground">
              This payment link has expired for security reasons.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">
                Please contact the merchant to request a new payment link.
              </p>
            </div>
            {business?.business_phone && (
              <Button variant="outline" asChild className="mt-4">
                <a href={`tel:${business.business_phone}`}>
                  Call {business.business_name}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment Failed Screen
  if (paymentStatus === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-destructive">Payment Failed</h2>
            <p className="text-muted-foreground">
              Something went wrong with your payment. Please try again.
            </p>
            <Button onClick={() => setPaymentStatus("waiting")} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-6 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Business Header */}
        <div className="text-center pt-2">
          {business?.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.business_name}
              className="h-16 w-16 rounded-full mx-auto mb-3 object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Store className="h-8 w-8 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold">{business?.business_name || "Store"}</h1>
          <p className="text-sm text-muted-foreground">Complete your payment</p>
        </div>

        {/* Countdown Timer */}
        {timeRemaining > 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Time remaining
                </span>
                <span className={`font-mono font-bold text-lg ${getTimerColor()}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-linear ${getProgressColor()}`}
                  style={{ width: `${(timeRemaining / totalDuration) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
              {getStatusBadge(order.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-3">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => setPaymentMethod("momo")}
              className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                paymentMethod === "momo"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                paymentMethod === "momo" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">Mobile Money</p>
                <p className="text-xs text-muted-foreground">MTN, Vodafone, AirtelTigo</p>
              </div>
              {paymentMethod === "momo" && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </button>

            <button
              onClick={() => setPaymentMethod("card")}
              className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                paymentMethod === "card"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                paymentMethod === "card" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">Debit/Credit Card</p>
                <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
              </div>
              {paymentMethod === "card" && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </button>
          </CardContent>
        </Card>

        {/* Pay Button */}
        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold shadow-lg"
          onClick={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Pay {formatCurrency(order.total)}
            </>
          )}
        </Button>

        {/* Security Note */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-4">
          <Shield className="h-4 w-4" />
          <span>Secure payment powered by iSmart</span>
        </div>
      </div>
    </div>
  );
}

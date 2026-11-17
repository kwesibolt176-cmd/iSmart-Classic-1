import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Package, Receipt, Home } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useCart } from "@/contexts/CartContext";
import { checkISmartStatus } from "@/lib/status-check";

type PaymentStatus = "verifying" | "success" | "failed";

interface TransactionDetails {
  reference?: string;
  amount?: number;
  currency?: string;
  paymentType?: string;
  orderNumber?: string;
  orderId?: string;
  customerName?: string;
  merchantName?: string;
  channel?: string;
  paidAt?: string;
}

export const MerchantPaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<PaymentStatus>("verifying");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<TransactionDetails>({});

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 360; // ~30 min @ 5s

    const poll = async () => {
      attempts++;
      try {
        const { data, error } = await supabase
          .from("collections")
          .select("status, amount, currency, payer_name, payer_phone, created_at, metadata")
          .eq("reference", reference)
          .maybeSingle();

        if (error) throw error;

        if (data?.status === "completed") {
          if (cancelled) return;
          setStatus("success");
          setMessage("Payment completed successfully!");
          clearCart();
          const md = (data.metadata as any) || {};
          setDetails({
            reference,
            amount: Number(data.amount),
            currency: data.currency || "GHS",
            paymentType: md.payment_type,
            orderNumber: md.order_number,
            orderId: md.order_id,
            customerName: data.payer_name,
            channel: "mobile_money",
            paidAt: data.created_at,
          });
          return;
        }
        if (data?.status === "failed") {
          if (cancelled) return;
          setStatus("failed");
          setMessage("Payment was not completed. Please try again.");
          return;
        }


        // Fall back to the iSmart status-check service on every other poll
        // in case the callback never reached us.
        if (attempts % 2 === 0) {
          const md = (data?.metadata as any) || {};
          const upstream = await checkISmartStatus({
            referenceId: reference,
            network: md.provider || "MTN",
            channel: md.channel || "MOMO",
          });
          if (cancelled) return;
          if (upstream.status === "completed") {
            setStatus("success");
            setMessage("Payment completed successfully!");
            clearCart();
            setDetails({
              reference,
              amount: data ? Number(data.amount) : undefined,
              currency: data?.currency || "GHS",
              paymentType: md.payment_type,
              orderNumber: md.order_number,
              orderId: md.order_id,
              customerName: data?.payer_name || undefined,
              channel: "mobile_money",
              paidAt: data?.created_at,
            });
            return;
          }
          if (upstream.status === "failed") {
            setStatus("failed");
            setMessage(upstream.message || "Payment was not completed. Please try again.");
            return;
          }
        }

        if (attempts >= maxAttempts) {
          if (cancelled) return;
          setStatus("failed");
          setMessage("Payment is still pending. Please check back shortly.");
          return;
        }
        setTimeout(poll, 5000);
      } catch (err: any) {
        if (cancelled) return;
        setStatus("failed");
        setMessage(err.message || "Failed to verify payment");
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [searchParams]);

  const getPaymentTypeLabel = (type?: string) => {
    switch (type) {
      case "pos_sale":
        return "POS Sale";
      case "storefront_order":
        return "Store Order";
      case "invoice":
        return "Invoice Payment";
      default:
        return "Payment";
    }
  };

  const getChannelLabel = (channel?: string) => {
    switch (channel) {
      case "mobile_money":
        return "Mobile Money";
      case "card":
        return "Card";
      case "bank":
        return "Bank Transfer";
      default:
        return channel || "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          {status === "verifying" && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-4" />
              <CardTitle>Verifying Payment...</CardTitle>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <CardTitle className="text-green-600 text-2xl">Payment Successful!</CardTitle>
            </>
          )}
          {status === "failed" && (
            <>
              <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-12 h-12 text-destructive" />
              </div>
              <CardTitle className="text-destructive text-2xl">Payment Failed</CardTitle>
            </>
          )}
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === "success" && details.reference && (
            <div className="bg-muted/50 p-5 rounded-xl text-sm space-y-3 text-left">
              {details.merchantName && (
                <div className="text-center pb-3 border-b border-border">
                  <p className="font-semibold text-lg">{details.merchantName}</p>
                </div>
              )}
              
              {details.orderNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Order
                  </span>
                  <span className="font-mono font-semibold">{details.orderNumber}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Reference
                </span>
                <span className="font-mono text-xs">{details.reference.slice(0, 20)}...</span>
              </div>
              
              {details.amount !== undefined && (
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-bold text-lg text-primary">
                    GH₵ {details.amount.toFixed(2)}
                  </span>
                </div>
              )}
              
              {details.channel && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="capitalize">{getChannelLabel(details.channel)}</span>
                </div>
              )}
              
              {details.paymentType && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Type</span>
                  <span>{getPaymentTypeLabel(details.paymentType)}</span>
                </div>
              )}
              
              {details.paidAt && (
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>Paid at</span>
                  <span>{new Date(details.paidAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            {status === "success" && details.orderId && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/order-tracking?orderNumber=${encodeURIComponent(details.orderNumber || '')}`)}
                className="w-full"
              >
                <Package className="w-4 h-4 mr-2" />
                Track Your Order
              </Button>
            )}
            
            {status !== "verifying" && (
              <Button 
                onClick={() => {
                  // Try to close if opened as popup, otherwise navigate to landing
                  if (window.opener) {
                    window.close();
                  } else {
                    navigate('/');
                  }
                }} 
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                {status === "success" ? "Done" : "Close"}
              </Button>
            )}
          </div>
          
          {status === "success" && (
            <p className="text-xs text-muted-foreground pt-2">
              A receipt has been sent to your email/phone
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantPaymentCallback;

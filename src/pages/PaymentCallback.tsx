import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Home } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { checkISmartStatus } from "@/lib/status-check";

type PaymentStatus = "verifying" | "success" | "failed";

interface TransactionDetails {
  reference?: string;
  amount?: number;
  currency?: string;
  type?: string;
  status?: string;
  paid_at?: string;
  isNewUser?: boolean;
}

export const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [status, setStatus] = useState<PaymentStatus>("verifying");
  const [message, setMessage] = useState("");
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails>({});

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
          .select("status, amount, currency, payer_phone, created_at, metadata")
          .eq("reference", reference)
          .maybeSingle();

        if (error) throw error;

        if (data?.status === "completed") {
          if (cancelled) return;
          setStatus("success");
          setMessage("Payment completed successfully!");
          setTransactionDetails({
            reference,
            amount: Number(data.amount),
            currency: data.currency || "GHS",
            status: data.status,
            paid_at: data.created_at,
            type: (data.metadata as any)?.payment_type,
          });
          return;
        }
        if (data?.status === "failed") {
          if (cancelled) return;
          setStatus("failed");
          setMessage("Payment was not completed. Please try again.");
          return;
        }

        // While still pending, ask the iSmart status-check service directly
        // (covers dropped callbacks) — every other poll to limit calls.
        if (attempts % 2 === 0) {
          const provider = (data?.metadata as any)?.provider;
          const upstream = await checkISmartStatus({
            referenceId: reference,
            network: provider || "MTN",
            channel: (data?.metadata as any)?.channel || "MOMO",
          });
          if (cancelled) return;
          if (upstream.status === "completed") {
            setStatus("success");
            setMessage("Payment completed successfully!");
            setTransactionDetails({
              reference,
              amount: data ? Number(data.amount) : undefined,
              currency: data?.currency || "GHS",
              status: "completed",
              paid_at: data?.created_at,
              type: (data?.metadata as any)?.payment_type,
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

  const getRedirectPath = () => {
    const type = transactionDetails.type;
    const metadata = transactionDetails as any;
    
    // If new user subscription, go to onboarding
    if (type === "subscription" && metadata?.isNewUser) {
      return "/onboarding";
    }
    if (type === "subscription") return "/?section=subscription";
    if (type === "credit_topup") return "/?section=settings";
    if (type === "gift_card") return "/?section=gift-cards";
    return "/";
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case "subscription":
        return "Subscription Payment";
      case "credit_topup":
        return "Credit Top-up";
      case "gift_card":
        return "Gift Card Purchase";
      case "one_time":
        return "One-time Payment";
      default:
        return type?.replace(/_/g, " ") || "Payment";
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          {status === "verifying" && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-4" />
              <CardTitle>Verifying Payment...</CardTitle>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <CardTitle className="text-green-600">Payment Successful!</CardTitle>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
              <CardTitle className="text-destructive">Payment Failed</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === "success" && transactionDetails.reference && (
            <div className="bg-muted p-4 rounded-lg text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono text-xs">{transactionDetails.reference}</span>
              </div>
              {transactionDetails.amount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">
                    {transactionDetails.currency} {transactionDetails.amount.toFixed(2)}
                  </span>
                </div>
              )}
              {transactionDetails.type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{getTypeLabel(transactionDetails.type)}</span>
                </div>
              )}
              {transactionDetails.paid_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid at:</span>
                  <span>{new Date(transactionDetails.paid_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-center pt-4">
            {status !== "verifying" && (
              <>
                <Button variant="outline" onClick={() => navigate("/")}>
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                <Button onClick={() => navigate(getRedirectPath())}>
                  {status === "success" ? "Continue" : "Try Again"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallback;
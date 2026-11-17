import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { AlertTriangle, CreditCard, Loader2, MessageSquare, Mail, Sparkles } from "lucide-react";
import { formatCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";

interface CreditPackage {
  id: string;
  name: string;
  credit_type: "sms" | "email";
  credits_amount: number;
  price: number;
  currency: string;
}

interface CreditExhaustedAlertProps {
  type: "sms" | "email";
  required?: number;
  available?: number;
  onDismiss?: () => void;
}

export const CreditExhaustedAlert = ({ 
  type, 
  required, 
  available = 0,
  onDismiss 
}: CreditExhaustedAlertProps) => {
  const { user, profile } = useBusiness();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .eq("credit_type", type)
        .order("display_order");

      if (error) throw error;
      setPackages((data || []) as CreditPackage[]);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTopUp = () => {
    fetchPackages();
    setTopUpOpen(true);
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    setPurchasing(pkg.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: businessProfile } = await supabase
        .from("business_profiles")
        .select("business_phone, business_name")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!businessProfile?.business_phone) {
        throw new Error("Please add a mobile money phone number to your business profile.");
      }

      const reference = crypto.randomUUID();
      const { data: result, error } = await supabase.functions.invoke("ismart-checkout", {
        body: {
          orderId: reference,
          orderNumber: `CR-${reference.slice(0, 8)}`,
          amount: pkg.price,
          customerName: businessProfile.business_name || user?.email,
          customerPhone: businessProfile.business_phone,
          customerEmail: user?.email || (profile as any)?.business_email,
          provider: "MTN",
          merchantUserId: user!.id,
          items: [{ name: pkg.name, quantity: 1, unitPrice: pkg.price }],
        },
      });

      if (error) throw error;
      if (result?.checkoutUrl) { window.location.href = result.checkoutUrl; return; }
      if (result?.success === false) throw new Error(result.error || "Failed to initialize payment");

      toast.success("Check your phone to approve the mobile money prompt.");
      window.location.href = `/payment/callback?reference=${reference}`;
    } catch (error: any) {
      console.error("Error purchasing credits:", error);
      toast.error(error.message || "Failed to initialize payment");
    } finally {
      setPurchasing(null);
    }
  };

  const TypeIcon = type === "sms" ? MessageSquare : Mail;
  const typeLabel = type === "sms" ? "SMS" : "Email";

  return (
    <>
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Insufficient {typeLabel} Credits</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            {required ? (
              <>You need <strong>{required}</strong> {typeLabel.toLowerCase()} credits but only have <strong>{available}</strong> remaining.</>
            ) : (
              <>You have <strong>{available}</strong> {typeLabel.toLowerCase()} credits remaining. Top up to continue sending messages.</>
            )}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleOpenTopUp}>
              <CreditCard className="h-4 w-4 mr-2" />
              Buy {typeLabel} Credits
            </Button>
            {onDismiss && (
              <Button size="sm" variant="outline" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Buy {typeLabel} Credits
            </DialogTitle>
            <DialogDescription>
              Choose a package to top up your {typeLabel.toLowerCase()} balance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No packages available
              </div>
            ) : (
              packages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className="cursor-pointer hover:border-primary transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <TypeIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{pkg.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {pkg.credits_amount.toLocaleString()} credits
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-lg font-bold">
                          {formatCurrency(pkg.price, pkg.currency)}
                        </Badge>
                        <Button 
                          size="sm"
                          onClick={() => handlePurchase(pkg)}
                          disabled={purchasing === pkg.id}
                        >
                          {purchasing === pkg.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Buy"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

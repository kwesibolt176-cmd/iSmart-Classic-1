import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Gift, Check, X, Shield, Loader2 } from "lucide-react";
import { GiftCardOTPDialog } from "./GiftCardOTPDialog";

interface GiftCardRedemptionProps {
  orderTotal: number;
  onGiftCardApplied: (amount: number, giftCardId: string, code: string) => void;
  onGiftCardRemoved: () => void;
  appliedGiftCard: { id: string; code: string; amount: number } | null;
}

export const GiftCardRedemption = ({
  orderTotal,
  onGiftCardApplied,
  onGiftCardRemoved,
  appliedGiftCard,
}: GiftCardRedemptionProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingGiftCard, setPendingGiftCard] = useState<{
    id: string;
    code: string;
    balance: number;
    requireOtp: boolean;
    hasContact: boolean;
  } | null>(null);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const { user } = useBusiness();
  const { toast } = useToast();
  const { format: formatCurrency } = useCurrency();

  const handleApplyGiftCard = async () => {
    if (!user || !code.trim()) return;

    try {
      setLoading(true);

      // Fetch gift card by code
      const { data: giftCard, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("user_id", user.id)
        .eq("code", code.trim().toUpperCase())
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!giftCard) {
        toast({
          title: "Invalid Gift Card",
          description: "Gift card not found or inactive",
          variant: "destructive",
        });
        return;
      }

      // Check expiry
      if (giftCard.expiry_date && new Date(giftCard.expiry_date) < new Date()) {
        toast({
          title: "Expired Gift Card",
          description: "This gift card has expired",
          variant: "destructive",
        });
        return;
      }

      // Check balance
      if (giftCard.current_balance <= 0) {
        toast({
          title: "No Balance",
          description: "This gift card has no remaining balance",
          variant: "destructive",
        });
        return;
      }

      // Check if OTP is required and if card has contact info
      const requireOtp = giftCard.require_otp === true;
      const hasContact = !!(giftCard.issued_to_email || giftCard.issued_to_phone);

      if (requireOtp && hasContact) {
        // Always re-verify per redemption attempt
        setPendingGiftCard({
          id: giftCard.id,
          code: giftCard.code,
          balance: Number(giftCard.current_balance),
          requireOtp: true,
          hasContact: true,
        });
        setShowOtpDialog(true);
      } else {
        // No OTP required, apply directly
        applyCard(giftCard.id, giftCard.code, Number(giftCard.current_balance));
      }
    } catch (error) {
      console.error("Error applying gift card:", error);
      toast({
        title: "Error",
        description: "Failed to apply gift card",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyCard = (id: string, cardCode: string, balance: number) => {
    const amountToApply = Math.min(balance, orderTotal);
    onGiftCardApplied(amountToApply, id, cardCode);
    
    toast({
      title: "Gift Card Applied",
      description: `${formatCurrency(amountToApply)} applied from gift card`,
    });

    setCode("");
    setPendingGiftCard(null);
  };

  const handleOtpVerified = () => {
    if (pendingGiftCard) {
      applyCard(pendingGiftCard.id, pendingGiftCard.code, pendingGiftCard.balance);
    }
  };

  const handleRemoveGiftCard = () => {
    onGiftCardRemoved();
    toast({
      title: "Gift Card Removed",
      description: "Gift card discount has been removed",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5" />
            Gift Card
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {appliedGiftCard ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-medium">{appliedGiftCard.code}</p>
                      <Shield className="w-3 h-3 text-green-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      -{formatCurrency(appliedGiftCard.amount)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveGiftCard}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="giftCardCode">Enter Gift Card Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="giftCardCode"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono"
                    maxLength={19}
                  />
                  <Button
                    onClick={handleApplyGiftCard}
                    disabled={loading || !code.trim()}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Protected cards require verification before use
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingGiftCard && (
        <GiftCardOTPDialog
          open={showOtpDialog}
          onOpenChange={setShowOtpDialog}
          giftCardCode={pendingGiftCard.code}
          onVerified={handleOtpVerified}
        />
      )}
    </>
  );
};

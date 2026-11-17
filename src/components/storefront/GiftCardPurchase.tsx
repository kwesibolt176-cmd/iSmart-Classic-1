import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gift, CreditCard, Loader2, CheckCircle2, Sparkles, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { useCurrency } from "@/hooks/use-currency";
import { GiftCardDisplay } from "@/components/GiftCardDisplay";

const purchaseSchema = z.object({
  recipientName: z.string().trim().min(1, "Recipient name is required").max(100),
  recipientEmail: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  recipientPhone: z.string().trim().min(10, "Phone must be at least 10 digits").max(15),
  senderName: z.string().trim().min(1, "Your name is required").max(100),
  senderPhone: z.string().trim().min(10, "Phone must be at least 10 digits").max(15),
  senderEmail: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
});

interface GiftCardPurchaseProps {
  userId: string;
  onBack: () => void;
  businessName: string;
  currency: string;
}

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

export const GiftCardPurchase = ({ userId, onBack, businessName, currency }: GiftCardPurchaseProps) => {
  const { format: formatCurrency } = useCurrency();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [createdGiftCard, setCreatedGiftCard] = useState<{
    code: string;
    amount: number;
    expiresAt: string;
  } | null>(null);

  const getFinalAmount = () => {
    if (customAmount && parseFloat(customAmount) > 0) {
      return parseFloat(customAmount);
    }
    return selectedAmount || 0;
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    if (value && parseFloat(value) > 0) {
      setSelectedAmount(null);
    }
  };

  const handlePurchase = async () => {
    try {
      const validation = purchaseSchema.safeParse({
        recipientName,
        recipientEmail,
        recipientPhone,
        senderName,
        senderPhone,
        senderEmail,
      });

      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const amount = getFinalAmount();
      if (amount < 10) {
        toast({
          title: "Invalid Amount",
          description: "Gift card amount must be at least " + currency + "10",
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);

      // Generate gift card code
      const { data: codeData, error: codeError } = await supabase.rpc("generate_gift_card_code");
      if (codeError) throw codeError;

      const giftCardCode = codeData;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Create gift card record
      const { data: giftCard, error: giftCardError } = await supabase
        .from("gift_cards")
        .insert({
          user_id: userId,
          code: giftCardCode,
          initial_balance: amount,
          current_balance: amount,
          issued_to_name: recipientName,
          issued_to_email: recipientEmail || null,
          issued_to_phone: recipientPhone,
          personal_message: personalMessage || null,
          purchased_by_name: senderName,
          purchased_by_phone: senderPhone,
          purchased_by_email: senderEmail || null,
          expiry_date: expiresAt.toISOString(),
          status: "inactive", // Will activate after payment
          require_otp: true,
          source: "storefront",
        })
        .select("id")
        .single();

      if (giftCardError) throw giftCardError;

      // Email for payment
      const email = senderEmail || `${senderPhone.replace(/[^0-9]/g, '')}@giftcard.local`;

      // Initialize iSmart MoMo collection
      const { data, error } = await supabase.functions.invoke("ismart-checkout", {
        body: {
          orderId: giftCard.id,
          orderNumber: `GC-${giftCardCode.split('-')[0]}`,
          amount,
          customerName: senderName,
          customerPhone: senderPhone,
          customerEmail: email,
          provider: "MTN",
          merchantUserId: userId,
          items: [{ name: `Gift Card for ${recipientName}`, quantity: 1, unitPrice: amount }],
        },
      });

      if (error) throw error;
      if (data?.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      if (data?.success === false) throw new Error(data.error || "Failed to initialize payment");

      sessionStorage.setItem('pendingGiftCardId', giftCard.id);
      sessionStorage.setItem('pendingGiftCardCode', giftCardCode);
      toast({
        title: "Check your phone",
        description: "Approve the mobile money prompt to complete your gift card purchase.",
      });
      window.location.href = `/merchant-payment/callback?type=gift_card&reference=${data?.reference || giftCard.id}`;

    } catch (error: any) {
      console.error("Gift card purchase error:", error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Could not process gift card purchase",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (purchaseComplete && createdGiftCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <div className="bg-card rounded-3xl border border-border p-8 text-center shadow-xl">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Gift Card Purchased!</h1>
            <p className="text-muted-foreground mb-6">
              Your gift card has been sent to {recipientName}
            </p>

            <GiftCardDisplay
              code={createdGiftCard.code}
              amount={createdGiftCard.amount}
              balance={createdGiftCard.amount}
              recipientName={recipientName}
              expiresAt={createdGiftCard.expiresAt}
              businessName={businessName}
              isActive
            />

            <Button onClick={() => window.location.reload()} size="lg" className="w-full mt-6">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const finalAmount = getFinalAmount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Button variant="ghost" onClick={onBack} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Gift className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Gift Cards</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Give the Gift of Choice
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Send a gift card to someone special. They'll receive it via SMS and email with OTP protection.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Gift Card Details */}
          <div className="space-y-6">
            {/* Amount Selection */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Select Amount
              </h3>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                {PRESET_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount)}
                    className={`p-4 rounded-xl border-2 transition-all font-semibold ${
                      selectedAmount === amount && !customAmount
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {currency}{amount}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Label className="text-sm text-muted-foreground">Or enter custom amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currency}
                  </span>
                  <Input
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                    min="10"
                  />
                </div>
              </div>
            </Card>

            {/* Recipient Details */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Recipient Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipientName">Recipient Name *</Label>
                  <Input
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Who is this gift for?"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="recipientPhone">Recipient Phone *</Label>
                  <PhoneInput
                    id="recipientPhone"
                    value={recipientPhone}
                    onChange={(value) => setRecipientPhone(value)}
                    placeholder="Enter recipient phone"
                  />
                </div>
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email (Optional)</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="recipient@email.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="Add a personal message..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            {/* Sender Details */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Your Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="senderName">Your Name *</Label>
                  <Input
                    id="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="senderPhone">Your Phone *</Label>
                  <PhoneInput
                    id="senderPhone"
                    value={senderPhone}
                    onChange={(value) => setSenderPhone(value)}
                    placeholder="Enter your phone"
                  />
                </div>
                <div>
                  <Label htmlFor="senderEmail">Your Email (Optional)</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Preview */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
              <h3 className="font-semibold text-lg mb-4">Gift Card Preview</h3>
              <GiftCardDisplay
                code="XXXX-XXXX-XXXX-XXXX"
                amount={finalAmount}
                balance={finalAmount}
                recipientName={recipientName || "Recipient"}
                businessName={businessName}
                isActive
                isPreview
              />
              {personalMessage && (
                <div className="mt-4 p-4 bg-background/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">Personal Message:</p>
                  <p className="text-foreground italic">"{personalMessage}"</p>
                </div>
              )}
            </Card>

            {/* Payment Method */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Payment Method</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "momo", label: "Momo", icon: <Smartphone className="w-6 h-6 mx-auto" /> },
                  { id: "card", label: "Card", icon: <CreditCard className="w-6 h-6 mx-auto" /> },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as "momo" | "card")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === method.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex justify-center mb-2 text-primary">{method.icon}</div>
                    <div className="text-sm font-medium">{method.label}</div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Summary */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gift Card Value</span>
                  <span className="font-medium">{formatCurrency(finalAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(finalAmount)}</span>
                </div>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={isProcessing || !recipientName || !recipientPhone || !senderName || !senderPhone || finalAmount < 10}
                className="w-full h-14 text-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    Purchase Gift Card
                  </>
                )}
              </Button>

              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Protected with OTP verification
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Valid for 1 year from purchase
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Sent via SMS & Email
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

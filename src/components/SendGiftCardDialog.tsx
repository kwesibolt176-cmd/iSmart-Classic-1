import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Loader2, Mail, MessageSquare, Send } from "lucide-react";
import { GiftCardDisplay } from "./GiftCardDisplay";
import { useBusiness } from "@/contexts/BusinessContext";

interface SendGiftCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  giftCard: {
    id: string;
    code: string;
    current_balance: number;
    issued_to_name?: string | null;
    issued_to_email?: string | null;
    issued_to_phone?: string | null;
    expiry_date?: string | null;
  };
  onSuccess: () => void;
}

export const SendGiftCardDialog = ({
  open,
  onOpenChange,
  giftCard,
  onSuccess,
}: SendGiftCardDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [sendVia, setSendVia] = useState<"email" | "sms" | "both">("email");
  const [recipientEmail, setRecipientEmail] = useState(giftCard.issued_to_email || "");
  const [recipientPhone, setRecipientPhone] = useState(giftCard.issued_to_phone || "");
  const [recipientName, setRecipientName] = useState(giftCard.issued_to_name || "");
  const [personalMessage, setPersonalMessage] = useState("");
  const { toast } = useToast();
  const { format: formatCurrency } = useCurrency();
  const { profile } = useBusiness();

  const handleSend = async () => {
    if (sendVia === "email" && !recipientEmail) {
      toast({
        title: "Email required",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    if (sendVia === "sms" && !recipientPhone) {
      toast({
        title: "Phone required",
        description: "Please enter a recipient phone number",
        variant: "destructive",
      });
      return;
    }

    if (sendVia === "both" && (!recipientEmail || !recipientPhone)) {
      toast({
        title: "Contact info required",
        description: "Please enter both email and phone for sending via both",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("send-gift-card", {
        body: {
          giftCardId: giftCard.id,
          sendVia,
          recipientEmail: recipientEmail || undefined,
          recipientPhone: recipientPhone || undefined,
          recipientName: recipientName || undefined,
          personalMessage: personalMessage || undefined,
        },
      });

      if (error) throw error;

      const results = data?.results || {};
      let successMessage = "";
      
      if (results.email && results.sms) {
        successMessage = "Gift card sent via email and SMS!";
      } else if (results.email) {
        successMessage = "Gift card sent via email!";
      } else if (results.sms) {
        successMessage = "Gift card sent via SMS!";
      } else {
        throw new Error("Failed to send gift card");
      }

      toast({
        title: "Success",
        description: successMessage,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending gift card:", error);
      toast({
        title: "Error",
        description: "Failed to send gift card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Gift Card
          </DialogTitle>
          <DialogDescription>
            Send this gift card to the recipient via email or SMS
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Gift Card Preview */}
          <div className="flex justify-center">
            <GiftCardDisplay
              code={giftCard.code}
              balance={Number(giftCard.current_balance)}
              recipientName={recipientName}
              expiryDate={giftCard.expiry_date}
              businessName={profile?.business_name || "Gift Card"}
            />
          </div>

          {/* Send Method */}
          <div className="space-y-3">
            <Label>Send via</Label>
            <RadioGroup
              value={sendVia}
              onValueChange={(val) => setSendVia(val as "email" | "sms" | "both")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-1 cursor-pointer">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="flex items-center gap-1 cursor-pointer">
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="cursor-pointer">Both</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Recipient Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            {(sendVia === "email" || sendVia === "both") && (
              <div className="space-y-2">
                <Label htmlFor="recipientEmail">Recipient Email *</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {(sendVia === "sms" || sendVia === "both") && (
              <div className="space-y-2">
                <Label htmlFor="recipientPhone">Recipient Phone *</Label>
                <Input
                  id="recipientPhone"
                  type="tel"
                  placeholder="+233 XX XXX XXXX"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
              <Textarea
                id="personalMessage"
                placeholder="Add a personal message to include with the gift card..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Gift Card
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

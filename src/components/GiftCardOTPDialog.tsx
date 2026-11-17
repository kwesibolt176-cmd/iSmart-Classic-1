import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Mail, MessageSquare } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface GiftCardOTPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  giftCardCode: string;
  onVerified: () => void;
}

export const GiftCardOTPDialog = ({
  open,
  onOpenChange,
  giftCardCode,
  onVerified,
}: GiftCardOTPDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sentVia, setSentVia] = useState<string>("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state and auto-send a fresh OTP each time the dialog opens for a card
  useEffect(() => {
    if (!open) return;
    setOtpSent(false);
    setOtpCode("");
    setSentVia("");
    setMaskedEmail(null);
    setMaskedPhone(null);
    handleSendOTP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, giftCardCode]);

  const handleSendOTP = async () => {
    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke("gift-card-otp", {
        body: {
          action: "send",
          giftCardCode,
        },
      });

      if (error) throw error;

      if (data.otpRequired === false) {
        // No OTP required, proceed directly
        onVerified();
        onOpenChange(false);
        return;
      }

      if (data.otpSent) {
        setOtpSent(true);
        setSentVia(data.sentVia);
        setMaskedEmail(data.maskedEmail);
        setMaskedPhone(data.maskedPhone);

        toast({
          title: "Verification code sent",
          description: `Code sent to ${data.maskedEmail || data.maskedPhone}`,
        });
      }
    } catch (error: unknown) {
      console.error("Error sending OTP:", error);
      const message = error instanceof Error ? error.message : "Failed to send verification code";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("gift-card-otp", {
        body: {
          action: "verify",
          giftCardCode,
          otpCode,
        },
      });

      if (error) throw error;

      if (data.verified) {
        toast({
          title: "Verified!",
          description: "Gift card has been verified successfully",
        });
        onVerified();
        onOpenChange(false);
      }
    } catch (error: unknown) {
      console.error("Error verifying OTP:", error);
      const message = error instanceof Error ? error.message : "Verification failed";
      toast({
        title: "Verification failed",
        description: message,
        variant: "destructive",
      });
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtpCode("");
    handleSendOTP();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Gift Card Verification
          </DialogTitle>
          <DialogDescription>
            {otpSent
              ? "Enter the verification code sent to the gift card recipient"
              : "We need to verify the gift card before redemption"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!otpSent ? (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  A verification code will be sent to the recipient's registered contact.
                </p>
              </div>

              <Button
                onClick={handleSendOTP}
                disabled={sending}
                className="w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Show where code was sent */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Verification code sent via:
                </p>
                <div className="flex justify-center gap-4">
                  {maskedEmail && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="w-4 h-4 text-primary" />
                      <span>{maskedEmail}</span>
                    </div>
                  )}
                  {maskedPhone && (
                    <div className="flex items-center gap-1 text-sm">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span>{maskedPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OTP Input */}
              <div className="space-y-4">
                <Label className="text-center block">Enter 6-digit code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading || otpCode.length !== 6}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Redeem"
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleResend}
                  disabled={sending}
                  className="w-full text-sm"
                >
                  Didn't receive code? Resend
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

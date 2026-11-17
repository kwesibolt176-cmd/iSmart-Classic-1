import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetupComplete: () => void;
}

export const TwoFactorSetupDialog = ({ open, onOpenChange, onSetupComplete }: TwoFactorSetupDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"setup" | "verify" | "backup">("setup");
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpAuthUrl, setOtpAuthUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    if (open && step === "setup") {
      initializeSetup();
    }
  }, [open]);

  const initializeSetup = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "setup" },
      });

      if (error) throw error;

      setSecret(data.secret);
      setOtpAuthUrl(data.otpAuthUrl);
      setBackupCodes(data.backupCodes);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize 2FA setup",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "verify-setup", code: verificationCode },
      });

      if (error) throw error;

      if (data.enabled) {
        setStep("backup");
        toast({
          title: "Success",
          description: "2FA has been enabled successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "secret" | "backup") => {
    await navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  const handleComplete = () => {
    setStep("setup");
    setVerificationCode("");
    onSetupComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {step === "setup" && "Set Up Two-Factor Authentication"}
            {step === "verify" && "Verify Your Authenticator"}
            {step === "backup" && "Save Your Backup Codes"}
          </DialogTitle>
          <DialogDescription>
            {step === "setup" && "Scan the QR code or enter the secret key in your authenticator app"}
            {step === "verify" && "Enter the 6-digit code from your authenticator app"}
            {step === "backup" && "Save these backup codes in a secure location"}
          </DialogDescription>
        </DialogHeader>

        {loading && step === "setup" ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {step === "setup" && (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>

                {/* Manual Entry */}
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground mb-2">
                      Can't scan? Enter this code manually:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                        {secret}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(secret, "secret")}
                      >
                        {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Button className="w-full" onClick={() => setStep("verify")}>
                  I've Added It to My App
                </Button>
              </div>
            )}

            {step === "verify" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    value={verificationCode}
                    onChange={setVerificationCode}
                    maxLength={6}
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("setup")}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleVerify}
                    disabled={loading || verificationCode.length !== 6}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Enable"}
                  </Button>
                </div>
              </div>
            )}

            {step === "backup" && (
              <div className="space-y-4">
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">
                      Save these codes! They can only be shown once and are needed if you lose access to your authenticator app.
                    </p>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, i) => (
                        <code key={i} className="p-2 bg-muted rounded text-sm font-mono text-center">
                          {code}
                        </code>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => copyToClipboard(backupCodes.join("\n"), "backup")}
                    >
                      {copiedBackup ? (
                        <>
                          <Check className="w-4 h-4 mr-2" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" /> Copy All Codes
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Button className="w-full" onClick={handleComplete}>
                  I've Saved My Backup Codes
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader2, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TwoFactorVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  onCancel: () => void;
}

export const TwoFactorVerifyDialog = ({ 
  open, 
  onOpenChange, 
  onVerified, 
  onCancel 
}: TwoFactorVerifyDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [activeTab, setActiveTab] = useState("totp");

  const handleVerify = async () => {
    const code = activeTab === "totp" ? verificationCode : backupCode.toUpperCase();
    
    if (activeTab === "totp" && code.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "backup" && !code) {
      toast({
        title: "Error",
        description: "Please enter a backup code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "verify", code },
      });

      if (error) throw error;

      if (data.verified) {
        if (data.usedBackupCode) {
          toast({
            title: "Backup Code Used",
            description: `You have ${data.remainingBackupCodes} backup codes remaining`,
          });
        }
        
        // Store 2FA verification in session
        sessionStorage.setItem("2fa_verified", "true");
        sessionStorage.setItem("2fa_verified_at", Date.now().toString());
        
        onVerified();
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setVerificationCode("");
    setBackupCode("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleCancel();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter the verification code to continue
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="totp">Authenticator</TabsTrigger>
            <TabsTrigger value="backup">Backup Code</TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter the 6-digit code from your authenticator app
            </p>
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
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter one of your backup codes
            </p>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-muted-foreground" />
              <Input
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="font-mono text-center text-lg tracking-wider"
                maxLength={9}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleVerify}
            disabled={loading || (activeTab === "totp" ? verificationCode.length !== 6 : !backupCode)}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

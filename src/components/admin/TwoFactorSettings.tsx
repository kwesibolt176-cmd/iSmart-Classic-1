import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { TwoFactorSetupDialog } from "./TwoFactorSetupDialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const TwoFactorSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "status" },
      });

      if (error) throw error;

      setIs2FAEnabled(data.enabled);
      setVerifiedAt(data.verifiedAt);
    } catch (error) {
      console.error("Error checking 2FA status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setDisabling(true);
    try {
      const { error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "disable", code: disableCode },
      });

      if (error) throw error;

      setIs2FAEnabled(false);
      setVerifiedAt(null);
      setShowDisableDialog(false);
      setDisableCode("");
      
      // Clear 2FA session
      sessionStorage.removeItem("2fa_verified");
      sessionStorage.removeItem("2fa_verified_at");

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            <Badge variant={is2FAEnabled ? "default" : "secondary"}>
              {is2FAEnabled ? (
                <>
                  <ShieldCheck className="w-3 h-3 mr-1" /> Enabled
                </>
              ) : (
                <>
                  <ShieldOff className="w-3 h-3 mr-1" /> Disabled
                </>
              )}
            </Badge>
          </div>
          <CardDescription>
            Add an extra layer of security to your super admin account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {is2FAEnabled ? (
            <>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication is enabled. You'll need to enter a verification code from your authenticator app when signing in.
                </p>
                {verifiedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Enabled on: {new Date(verifiedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
              >
                Disable 2FA
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Protect your account by requiring a verification code in addition to your password when signing in.
                </p>
              </div>
              <Button onClick={() => setShowSetupDialog(true)}>
                <Shield className="w-4 h-4 mr-2" />
                Enable 2FA
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <TwoFactorSetupDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        onSetupComplete={() => {
          setIs2FAEnabled(true);
          checkStatus();
        }}
      />

      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your authenticator code to confirm disabling 2FA. This will make your account less secure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex justify-center py-4">
            <InputOTP
              value={disableCode}
              onChange={setDisableCode}
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

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisableCode("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={disabling || disableCode.length !== 6}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disabling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

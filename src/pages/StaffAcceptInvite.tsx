import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type InviteStatus = "loading" | "valid" | "invalid" | "expired" | "creating" | "success";

interface InviteDetails {
  staffId: string;
  staffName: string;
  email: string;
  businessName: string;
  roleName: string;
}

export const StaffAcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      validateToken(token);
    } else {
      setStatus("invalid");
    }
  }, [token]);

  const validateToken = async (inviteToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("staff-invite", {
        body: { action: "validate", token: inviteToken },
      });
      if (error || !data || data.error) {
        if (data?.status === "accepted" || data?.status === "expired") {
          setStatus("expired");
        } else {
          setStatus("invalid");
        }
        return;
      }
      setInviteDetails(data as InviteDetails);
      setStatus("valid");
    } catch (e) {
      console.error("Error validating token:", e);
      setStatus("invalid");
    }
  };

  const handleCreateAccount = async () => {
    if (!inviteDetails || !token) return;

    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      toast({ title: "PIN must be exactly 4 digits", variant: "destructive" });
      return;
    }

    if (pin !== confirmPin) {
      toast({ title: "PINs do not match", variant: "destructive" });
      return;
    }

    setStatus("creating");

    try {
      const { data, error } = await supabase.functions.invoke("staff-invite", {
        body: { action: "accept", token, password, pin },
      });
      if (error || !data || data.error) {
        throw new Error(data?.error || error?.message || "Failed");
      }

      // Staff work inside the inviting business's portal using their PIN. Signing
      // them in here sent them to "/", where a user without their own business
      // profile is routed to onboarding and creates a separate business (QA BUG-03).
      setStatus("success");
      toast({ title: "You're all set!" });
    } catch (error: any) {
      console.error("Error creating account:", error);
      setStatus("valid");
      toast({
        title: "Failed to create account",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-4">
              This invitation link is invalid or has already been used.
            </p>
            <Button onClick={() => navigate("/auth")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
            <p className="text-muted-foreground mb-4">
              This invitation has expired. Please ask your employer to send a new one.
            </p>
            <Button onClick={() => navigate("/auth")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Welcome aboard!</h2>
            <p className="text-muted-foreground mb-4">
              You've joined {inviteDetails?.businessName || "the business"}. Use your 4-digit PIN to
              unlock the business's portal or POS when your manager opens it for you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle>Join {inviteDetails?.businessName}</CardTitle>
          <CardDescription>
            You've been invited to join as <strong>{inviteDetails?.roleName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Welcome,</p>
            <p className="font-semibold text-lg">{inviteDetails?.staffName}</p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              value={inviteDetails?.email}
              disabled
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Create Password
            </Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Confirm Password
            </Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              4-Digit Staff PIN
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="mt-1 tracking-[0.5em] text-center text-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              You'll use this PIN for quick login at the lock screen.
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Confirm PIN
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="mt-1 tracking-[0.5em] text-center text-lg"
            />
          </div>


          <Button
            onClick={handleCreateAccount}
            disabled={status === "creating"}
            className="w-full"
          >
            {status === "creating" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Create Account & Join
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

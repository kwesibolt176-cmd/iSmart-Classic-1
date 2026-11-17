import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Lock, KeyRound, Shield, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";


export const PinSettings = () => {
  const { toast } = useToast();
  const { user } = useBusiness();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [confirmAdminPin, setConfirmAdminPin] = useState("");
  const [idleTimeout, setIdleTimeout] = useState(
    (parseInt(localStorage.getItem("pos_idle_timeout") || "1800000") / 60000).toString()
  );

  // Visibility states
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Reset visibility states when user changes (e.g. logout/login)
    setShowNewPin(false);
    setShowConfirmPin(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    
    if (user) {
      fetchAdminPin();
    }
  }, [user]);

  const fetchAdminPin = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("admin_pin")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setAdminPin(data?.admin_pin || "");
    } catch (error) {
      console.error("Error fetching admin PIN:", error);
    }
  };

  const handleSaveTimeout = () => {
    const timeoutMs = parseInt(idleTimeout) * 60000;
    localStorage.setItem("pos_idle_timeout", timeoutMs.toString());
    
    toast({
      title: "Success",
      description: "Idle timeout updated successfully",
    });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    // Verify current password first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive",
      });
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      toast({
        title: "Error",
        description: "Current password is incorrect",
        variant: "destructive",
      });
      return;
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    toast({
      title: "Success",
      description: "Password updated successfully",
    });
  };

  const handleUpdateAdminPin = async () => {
    if (!user) return;

    if (!newAdminPin || !confirmAdminPin) {
      toast({
        title: "Error",
        description: "Please fill in all PIN fields",
        variant: "destructive",
      });
      return;
    }

    if (newAdminPin.length !== 4 || !/^\d{4}$/.test(newAdminPin)) {
      toast({
        title: "Error",
        description: "PIN must be exactly 4 digits",
        variant: "destructive",
      });
      return;
    }

    if (newAdminPin !== confirmAdminPin) {
      toast({
        title: "Error",
        description: "PINs do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ admin_pin: newAdminPin })
        .eq("user_id", user.id);

      if (error) throw error;

      setAdminPin(newAdminPin);
      setNewAdminPin("");
      setConfirmAdminPin("");

      toast({
        title: "Success",
        description: "Admin PIN updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update admin PIN",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle className="text-foreground">Security Settings</CardTitle>
          </div>
          <CardDescription>Configure idle lock settings and manage your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Idle Lock Timeout */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Idle Lock Timeout</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="space-y-2 w-full sm:w-auto">
                <Label htmlFor="idleTimeout" className="text-sm">Lock after</Label>
                <Select value={idleTimeout} onValueChange={setIdleTimeout}>
                  <SelectTrigger id="idleTimeout" className="h-9 w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="2">2 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveTimeout} className="h-9 w-full sm:w-auto">
                Save Timeout
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The screen will automatically lock after the specified period of inactivity
          </p>
        </CardContent>
      </Card>

      {/* Admin PIN Management */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle className="text-foreground">Admin PIN</CardTitle>
          </div>
          <CardDescription>Manage your master admin PIN for quick access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Current Admin PIN</span>
            </div>
            <p className="text-2xl font-mono tracking-wider text-foreground">
              {adminPin ? "••••" : "Not Set"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              The admin PIN provides instant access without selecting a staff member
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newAdminPin" className="text-sm">New PIN</Label>
              <div className="relative">
                <Input
                  id="newAdminPin"
                  type={showNewPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={newAdminPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNewAdminPin(value);
                  }}
                  placeholder="1234"
                  className="h-9 font-mono text-lg tracking-wider pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmAdminPin" className="text-sm">Confirm PIN</Label>
              <div className="relative">
                <Input
                  id="confirmAdminPin"
                  type={showConfirmPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={confirmAdminPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setConfirmAdminPin(value);
                  }}
                  placeholder="1234"
                  className="h-9 font-mono text-lg tracking-wider pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button onClick={handleUpdateAdminPin} className="h-9 w-full md:w-auto">
            Update Admin PIN
          </Button>
          <p className="text-xs text-muted-foreground">
            PIN must be exactly 4 digits (0000-9999)
          </p>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <CardTitle className="text-foreground">Change Password</CardTitle>
          </div>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button onClick={handleChangePassword} className="h-9 w-full md:w-auto">
            Update Password
          </Button>
          <p className="text-xs text-muted-foreground">
            Password must be at least 6 characters long
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

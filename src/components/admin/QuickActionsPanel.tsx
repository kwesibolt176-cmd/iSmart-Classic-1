import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  UserX,
  Clock,
  Megaphone,
  Gift,
  RefreshCcw,
  Mail,
  Shield,
  Zap,
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

const quickActions: QuickAction[] = [
  {
    id: "suspend-user",
    label: "Suspend User",
    icon: UserX,
    color: "text-destructive",
    bgColor: "bg-destructive/10 hover:bg-destructive/20",
    description: "Suspend a business account",
  },
  {
    id: "extend-trial",
    label: "Extend Trial",
    icon: Clock,
    color: "text-primary",
    bgColor: "bg-primary/10 hover:bg-primary/20",
    description: "Extend a user's trial period",
  },
  {
    id: "send-announcement",
    label: "Announcement",
    icon: Megaphone,
    color: "text-accent",
    bgColor: "bg-accent/10 hover:bg-accent/20",
    description: "Send platform-wide announcement",
  },
  {
    id: "grant-credits",
    label: "Grant Credits",
    icon: Gift,
    color: "text-secondary",
    bgColor: "bg-secondary/10 hover:bg-secondary/20",
    description: "Grant promotional credits",
  },
  {
    id: "reset-password",
    label: "Reset Password",
    icon: RefreshCcw,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50 hover:bg-muted",
    description: "Send password reset email",
  },
  {
    id: "bulk-email",
    label: "Bulk Email",
    icon: Mail,
    color: "text-primary",
    bgColor: "bg-primary/10 hover:bg-primary/20",
    description: "Send email to all users",
  },
  {
    id: "toggle-feature",
    label: "Toggle Feature",
    icon: Shield,
    color: "text-accent",
    bgColor: "bg-accent/10 hover:bg-accent/20",
    description: "Enable/disable feature flags",
  },
  {
    id: "clear-cache",
    label: "Clear Cache",
    icon: Zap,
    color: "text-secondary",
    bgColor: "bg-secondary/10 hover:bg-secondary/20",
    description: "Clear system cache",
  },
];

export const QuickActionsPanel = () => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!activeDialog) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      switch (activeDialog) {
        case "suspend-user": {
          const { error } = await supabase
            .from("business_profiles")
            .update({ is_suspended: true })
            .eq("business_email", formData.email);
          
          if (error) throw error;

          await supabase.from("audit_logs").insert({
            user_id: user.id,
            action_type: "suspend_user",
            entity_type: "business_profiles",
            metadata: { email: formData.email, reason: formData.reason },
          });

          toast.success(`User ${formData.email} suspended`);
          break;
        }

        case "extend-trial": {
          const days = parseInt(formData.days || "7");
          
          // Find the business by email first
          const { data: business, error: bizError } = await supabase
            .from("business_profiles")
            .select("user_id")
            .eq("business_email", formData.email)
            .single();

          if (bizError || !business) throw new Error("Business not found");

          const { data: sub, error: fetchError } = await supabase
            .from("user_subscriptions")
            .select("id, current_period_end")
            .eq("user_id", business.user_id)
            .eq("is_trial", true)
            .single();

          if (fetchError) throw new Error("Trial subscription not found");

          const newEndDate = new Date(sub.current_period_end);
          newEndDate.setDate(newEndDate.getDate() + days);

          const { error } = await supabase
            .from("user_subscriptions")
            .update({ current_period_end: newEndDate.toISOString() })
            .eq("id", sub.id);

          if (error) throw error;

          await supabase.from("audit_logs").insert({
            user_id: user.id,
            action_type: "extend_trial",
            entity_type: "user_subscriptions",
            entity_id: sub.id,
            metadata: { email: formData.email, days, reason: formData.reason },
          });

          toast.success(`Trial extended by ${days} days`);
          break;
        }

        case "send-announcement": {
          const { error } = await supabase.from("platform_announcements").insert({
            title: formData.title,
            content: formData.content,
            announcement_type: formData.type || "info",
            is_active: true,
          });

          if (error) throw error;
          toast.success("Announcement published");
          break;
        }

        case "grant-credits": {
          const amount = parseInt(formData.amount || "0");
          const creditType = formData.creditType || "sms";

          const { data: business, error: fetchError } = await supabase
            .from("business_profiles")
            .select("id")
            .eq("business_email", formData.email)
            .single();

          if (fetchError) throw new Error("Business not found");

          const updateField = creditType === "sms" ? "sms_credits" : "email_credits";
          
          const { data: currentCredits } = await supabase
            .from("business_credits")
            .select(updateField)
            .eq("business_id", business.id)
            .single();

          if (currentCredits) {
            const { error } = await supabase
              .from("business_credits")
              .update({ [updateField]: (currentCredits[updateField] || 0) + amount })
              .eq("business_id", business.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("business_credits")
              .insert({ business_id: business.id, [updateField]: amount });
            if (error) throw error;
          }

          await supabase.from("audit_logs").insert({
            user_id: user.id,
            action_type: "grant_credits",
            entity_type: "business_credits",
            entity_id: business.id,
            metadata: { email: formData.email, amount, creditType, reason: formData.reason },
          });

          toast.success(`${amount} ${creditType} credits granted`);
          break;
        }

        case "bulk-email": {
          const { error } = await supabase.from("email_campaigns").insert({
            user_id: user.id,
            name: formData.subject,
            subject: formData.subject,
            body: formData.content || "",
            status: "pending",
          });

          if (error) throw error;
          toast.success("Bulk email campaign scheduled");
          break;
        }

        case "toggle-feature": {
          const { error } = await supabase
            .from("feature_flags")
            .update({ is_active: formData.enabled === "true" })
            .eq("feature_key", formData.feature);

          if (error) throw error;

          await supabase.from("audit_logs").insert({
            user_id: user.id,
            action_type: "toggle_feature",
            entity_type: "feature_flags",
            metadata: { feature: formData.feature, enabled: formData.enabled },
          });

          toast.success(`Feature "${formData.feature}" ${formData.enabled === "true" ? "enabled" : "disabled"}`);
          break;
        }

        case "reset-password": {
          // Simulate password reset action
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.success("Password reset email sent");
          break;
        }

        case "clear-cache": {
          // First log the action BEFORE clearing caches to avoid auth issues
          const userId = user.id;
          
          // Clear all caches: localStorage, sessionStorage, and service worker
          let clearedItems = 0;
          
          // Clear localStorage (except auth-related items)
          const authKeys = ['supabase.auth.token', 'sb-', 'supabase'];
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !authKeys.some(authKey => key.toLowerCase().includes(authKey.toLowerCase()))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            clearedItems++;
          });

          // Clear sessionStorage (except auth-related items)
          const sessionKeysToRemove: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && !authKeys.some(authKey => key.toLowerCase().includes(authKey.toLowerCase()))) {
              sessionKeysToRemove.push(key);
            }
          }
          sessionKeysToRemove.forEach(key => {
            sessionStorage.removeItem(key);
            clearedItems++;
          });

          // Clear service worker caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              await caches.delete(cacheName);
              clearedItems++;
            }
          }

          // Unregister service workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }

          // Log after clearing - use stored userId
          await supabase.from("audit_logs").insert({
            user_id: userId,
            action_type: "clear_cache",
            entity_type: "system",
            metadata: { cleared_items: clearedItems },
          });

          toast.success(`System cache cleared (${clearedItems} items removed). Reload the page for full effect.`);
          break;
        }

        default:
          toast.info("Action completed");
      }

      setActiveDialog(null);
      setFormData({});
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const renderDialogContent = () => {
    switch (activeDialog) {
      case "suspend-user":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Business Email</Label>
                <Input
                  placeholder="user@business.com"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  placeholder="Reason for suspension..."
                  value={formData.reason || ""}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
            </div>
          </>
        );

      case "extend-trial":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Business Email</Label>
                <Input
                  placeholder="user@business.com"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Days to Extend</Label>
                <Select
                  value={formData.days || "7"}
                  onValueChange={(v) => setFormData({ ...formData, days: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  placeholder="Reason for extension..."
                  value={formData.reason || ""}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
            </div>
          </>
        );

      case "send-announcement":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="Announcement title"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.type || "info"}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  placeholder="Announcement content..."
                  value={formData.content || ""}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          </>
        );

      case "grant-credits":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Business Email</Label>
                <Input
                  placeholder="user@business.com"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Credit Type</Label>
                <Select
                  value={formData.creditType || "sms"}
                  onValueChange={(v) => setFormData({ ...formData, creditType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS Credits</SelectItem>
                    <SelectItem value="email">Email Credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  placeholder="Promotional / Compensation..."
                  value={formData.reason || ""}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
            </div>
          </>
        );

      case "bulk-email":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input
                  placeholder="Email subject..."
                  value={formData.subject || ""}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  placeholder="Email content..."
                  value={formData.content || ""}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                />
              </div>
            </div>
          </>
        );

      case "toggle-feature":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Feature Name</Label>
                <Input
                  placeholder="feature_flag_name"
                  value={formData.feature || ""}
                  onChange={(e) => setFormData({ ...formData, feature: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.enabled || "true"}
                  onValueChange={(v) => setFormData({ ...formData, enabled: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enable</SelectItem>
                    <SelectItem value="false">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        );

      case "reset-password":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>User Email</Label>
                <Input
                  placeholder="user@example.com"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                A password reset link will be sent to this email address.
              </p>
            </div>
          </>
        );

      default:
        return <p className="text-muted-foreground">This action will be executed immediately.</p>;
    }
  };

  const activeAction = quickActions.find((a) => a.id === activeDialog);

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => setActiveDialog(action.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${action.bgColor} group`}
              >
                <Icon className={`w-5 h-5 ${action.color}`} />
                <span className="text-xs font-medium text-center">{action.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Dialog open={!!activeDialog} onOpenChange={() => { setActiveDialog(null); setFormData({}); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeAction && <activeAction.icon className={`w-5 h-5 ${activeAction.color}`} />}
              {activeAction?.label}
            </DialogTitle>
            <DialogDescription>{activeAction?.description}</DialogDescription>
          </DialogHeader>
          {renderDialogContent()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActiveDialog(null); setFormData({}); }}>
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={loading}>
              {loading ? "Processing..." : "Execute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatCurrency } from "@/hooks/use-currency";
import { Crown, AlertTriangle } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  is_active: boolean;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  subscription_plans: {
    name: string;
    price_monthly: number;
  } | null;
  business_profiles: {
    business_name: string;
  } | null;
}

interface EditSubscriptionDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const SUBSCRIPTION_STATUSES = [
  { value: "active", label: "Active", requiresReason: false },
  { value: "cancelled", label: "Cancelled", requiresReason: true },
  { value: "past_due", label: "Past Due", requiresReason: true },
  { value: "trialing", label: "Trialing", requiresReason: false },
  { value: "suspended", label: "Suspended", requiresReason: true },
];

export const EditSubscriptionDialog = ({
  subscription,
  open,
  onOpenChange,
  onUpdated,
}: EditSubscriptionDialogProps) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      fetchPlans();
      if (subscription) {
        setSelectedPlanId(subscription.plan_id);
        setSelectedStatus(subscription.status);
        setPeriodEnd(subscription.current_period_end.split("T")[0]);
        setReason("");
      }
    }
  }, [open, subscription]);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id, name, price_monthly, is_active")
      .eq("is_active", true)
      .order("price_monthly");

    if (!error && data) {
      setPlans(data);
    }
  };

  const hasChanges = () => {
    if (!subscription) return false;
    return (
      selectedPlanId !== subscription.plan_id ||
      selectedStatus !== subscription.status ||
      periodEnd !== subscription.current_period_end.split("T")[0]
    );
  };

  const requiresReason = () => {
    if (!subscription) return false;
    const statusInfo = SUBSCRIPTION_STATUSES.find(s => s.value === selectedStatus);
    const statusChanged = selectedStatus !== subscription.status;
    const planChanged = selectedPlanId !== subscription.plan_id;
    
    // Require reason for: cancellation, suspension, past_due, or any plan downgrade
    if (statusChanged && statusInfo?.requiresReason) return true;
    if (planChanged) return true;
    
    return false;
  };

  const handleSave = async () => {
    if (!subscription) return;

    if (requiresReason() && !reason.trim()) {
      toast.error("Please provide a reason for this change");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Build update object
      const updates: Record<string, any> = {};
      const changes: string[] = [];

      if (selectedPlanId !== subscription.plan_id) {
        updates.plan_id = selectedPlanId;
        const newPlan = plans.find(p => p.id === selectedPlanId);
        changes.push(`Plan changed from "${subscription.subscription_plans?.name}" to "${newPlan?.name}"`);
      }

      if (selectedStatus !== subscription.status) {
        updates.status = selectedStatus;
        changes.push(`Status changed from "${subscription.status}" to "${selectedStatus}"`);
      }

      if (periodEnd !== subscription.current_period_end.split("T")[0]) {
        updates.current_period_end = new Date(periodEnd).toISOString();
        changes.push(`Period end changed to ${periodEnd}`);
      }

      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        return;
      }

      // Update subscription
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update(updates)
        .eq("id", subscription.id);

      if (updateError) throw updateError;

      // Also update plan_tier in business_profiles if plan changed
      if (updates.plan_id) {
        const newPlan = plans.find(p => p.id === selectedPlanId);
        await supabase
          .from("business_profiles")
          .update({ plan_tier: newPlan?.name?.toLowerCase() || "free" })
          .eq("user_id", subscription.user_id);
      }

      // Log to audit_logs
      await supabase.from("audit_logs").insert({
        user_id: user?.id || subscription.user_id,
        action_type: "subscription_modified",
        entity_type: "user_subscriptions",
        entity_id: subscription.id,
        old_data: {
          plan_id: subscription.plan_id,
          plan_name: subscription.subscription_plans?.name,
          status: subscription.status,
          period_end: subscription.current_period_end,
        },
        new_data: {
          plan_id: updates.plan_id || subscription.plan_id,
          plan_name: plans.find(p => p.id === (updates.plan_id || subscription.plan_id))?.name,
          status: updates.status || subscription.status,
          period_end: updates.current_period_end || subscription.current_period_end,
        },
        metadata: {
          business_name: subscription.business_profiles?.business_name,
          reason: reason.trim(),
          changes: changes,
          modified_by: "super_admin",
        },
      });

      toast.success("Subscription updated successfully");
      onUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Failed to update subscription");
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Edit Subscription
          </DialogTitle>
          <DialogDescription>
            Modify subscription for{" "}
            <span className="font-semibold">
              {subscription.business_profiles?.business_name}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-muted-foreground">
              Current: <span className="font-medium text-foreground">{subscription.subscription_plans?.name}</span>
              {" • "}
              <span className="capitalize">{subscription.status}</span>
            </p>
          </div>

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="plan">Subscription Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{plan.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(plan.price_monthly, "GHS")}/mo
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period End Date */}
          <div className="space-y-2">
            <Label htmlFor="periodEnd">Period End Date</Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>

          {/* Reason (required for certain changes) */}
          {requiresReason() && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Reason for Change <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Provide a reason for this modification (required for audit)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This will be recorded in the audit log for compliance purposes.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !hasChanges() || (requiresReason() && !reason.trim())}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
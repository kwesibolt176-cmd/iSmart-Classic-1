import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";

interface FeatureFlag {
  feature_key: string;
  feature_name: string;
  description: string | null;
  enabled_for_tiers: string[];
  is_active: boolean;
}

interface UsageStatus {
  sms: { used: number; limit: number | null; remaining: number | null };
  email: { used: number; limit: number | null; remaining: number | null };
}

interface FeatureAccessResult {
  hasAccess: (featureKey: string) => boolean;
  isLoading: boolean;
  planTier: string;
  usageStatus: UsageStatus | null;
  checkUsageLimit: (type: "sms" | "email") => boolean;
  refreshUsage: () => Promise<void>;
}

export const useFeatureAccess = (): FeatureAccessResult => {
  const { user } = useBusiness();
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [planTier, setPlanTier] = useState<string>("free");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlanTier = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from("business_profiles")
        .select("plan_tier")
        .eq("user_id", user.id)
        .single();
      
      setPlanTier(data?.plan_tier || "free");
    } catch (error) {
      console.error("Error fetching plan tier:", error);
    }
  }, [user]);

  const fetchFeatureFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setFeatureFlags(data || []);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
    }
  }, []);

  const fetchUsageStatus = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch subscription usage
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select(`
          sms_usage,
          email_usage,
          subscription_plans (
            sms_limit,
            email_limit
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (subscription) {
        const plan = subscription.subscription_plans as any;
        setUsageStatus({
          sms: {
            used: subscription.sms_usage || 0,
            limit: plan?.sms_limit || null,
            remaining: plan?.sms_limit ? Math.max(0, plan.sms_limit - (subscription.sms_usage || 0)) : null,
          },
          email: {
            used: subscription.email_usage || 0,
            limit: plan?.email_limit || null,
            remaining: plan?.email_limit ? Math.max(0, plan.email_limit - (subscription.email_usage || 0)) : null,
          },
        });
        return;
      }

      // Check credits if no subscription
      const { data: credits } = await supabase
        .from("business_credits")
        .select("sms_credits, email_credits")
        .eq("business_id", user.id)
        .maybeSingle();

      if (credits) {
        setUsageStatus({
          sms: {
            used: 0,
            limit: credits.sms_credits,
            remaining: credits.sms_credits,
          },
          email: {
            used: 0,
            limit: credits.email_credits,
            remaining: credits.email_credits,
          },
        });
        return;
      }

      // No subscription or credits
      setUsageStatus({
        sms: { used: 0, limit: 0, remaining: 0 },
        email: { used: 0, limit: 0, remaining: 0 },
      });
    } catch (error) {
      console.error("Error fetching usage status:", error);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchFeatureFlags(), fetchUsageStatus(), fetchPlanTier()]);
      setIsLoading(false);
    };

    if (user) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [user?.id, fetchFeatureFlags, fetchUsageStatus, fetchPlanTier]);

  const hasAccess = useCallback(
    (featureKey: string): boolean => {
      // Super admin always has access
      if (planTier === "enterprise") return true;

      const flag = featureFlags.find((f) => f.feature_key === featureKey);

      // If no flag exists, feature is available to all
      if (!flag) return true;

      // Check if the user's plan tier is in the enabled tiers
      return flag.enabled_for_tiers.includes(planTier.toLowerCase());
    },
    [featureFlags, planTier]
  );

  const checkUsageLimit = useCallback(
    (type: "sms" | "email"): boolean => {
      if (!usageStatus) return false;

      const status = usageStatus[type];
      
      // null limit means unlimited
      if (status.limit === null) return true;
      
      return status.remaining !== null && status.remaining > 0;
    },
    [usageStatus]
  );

  const refreshUsage = useCallback(async () => {
    await fetchUsageStatus();
  }, [fetchUsageStatus]);

  return {
    hasAccess,
    isLoading,
    planTier,
    usageStatus,
    checkUsageLimit,
    refreshUsage,
  };
};

import { supabase } from "@/integrations/supabase/client";

export const incrementSMSUsage = async (userId: string) => {
  try {
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("id, sms_usage")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!subscription) return;

    await supabase
      .from("user_subscriptions")
      .update({ sms_usage: (subscription.sms_usage || 0) + 1 })
      .eq("id", subscription.id);
  } catch (error) {
    console.error("Error incrementing SMS usage:", error);
  }
};

export const incrementEmailUsage = async (userId: string) => {
  try {
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("id, email_usage")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!subscription) return;

    await supabase
      .from("user_subscriptions")
      .update({ email_usage: (subscription.email_usage || 0) + 1 })
      .eq("id", subscription.id);
  } catch (error) {
    console.error("Error incrementing email usage:", error);
  }
};

export const checkUsageLimit = async (
  userId: string,
  type: "sms" | "email"
): Promise<boolean> => {
  try {
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select(`
        ${type}_usage,
        subscription_plans (
          ${type}_limit
        )
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!subscription) return true; // No subscription, allow

    const plan = subscription.subscription_plans as any;
    const limit = plan?.[`${type}_limit`];
    const usage = subscription[`${type}_usage`] || 0;

    if (!limit) return true; // Unlimited
    return usage < limit;
  } catch (error) {
    console.error("Error checking usage limit:", error);
    return false;
  }
};

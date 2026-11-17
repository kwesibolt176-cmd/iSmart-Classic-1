import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Crown, Zap, Rocket, CreditCard } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useCurrency } from "@/hooks/use-currency";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  sms_limit: number | null;
  email_limit: number | null;
  is_active: boolean;
  display_order: number;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_end: string;
  is_trial?: boolean;
}

interface BusinessCredits {
  sms_credits: number;
  email_credits: number;
}

export const Subscription = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [credits, setCredits] = useState<BusinessCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { user } = useBusiness();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get business profile first
      const { data: businessProfile } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const [plansRes, subRes, trialCheckRes, creditsRes] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("user_subscriptions")
          .select("*, is_trial")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Check if user has ever had a trial
        supabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_trial", true)
          .limit(1),
        businessProfile?.id
          ? supabase
              .from("business_credits")
              .select("sms_credits, email_credits")
              .eq("business_id", businessProfile.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (plansRes.error) throw plansRes.error;
      const plansData = (plansRes.data || []).map((plan) => ({
        ...plan,
        features: (plan.features as any) || [],
      }));
      setPlans(plansData);
      setCurrentSubscription(subRes.data);
      setHasUsedTrial((trialCheckRes.data || []).length > 0);
      setCredits(creditsRes.data);
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes("enterprise")) return <Crown className="w-6 h-6" />;
    if (name.includes("pro")) return <Rocket className="w-6 h-6" />;
    if (name.includes("starter") || name.includes("basic")) return <Zap className="w-6 h-6" />;
    return null;
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!user) return;

    setProcessingPlan(plan.id);
    
    try {
      const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
      
      if (!price || price <= 0) {
        toast({
          title: "Error",
          description: "Invalid plan price",
          variant: "destructive",
        });
        return;
      }

      // Fetch user phone for MoMo collection
      const { data: profile } = await supabase
        .from("business_profiles")
        .select("business_phone, business_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const customerPhone = profile?.business_phone;
      if (!customerPhone) {
        throw new Error("Please add a mobile money phone number to your business profile.");
      }

      const reference = crypto.randomUUID();
      const { data, error } = await supabase.functions.invoke("ismart-checkout", {
        body: {
          orderId: reference,
          orderNumber: `SUB-${reference.slice(0, 8)}`,
          amount: price,
          customerName: profile?.business_name || user.email,
          customerPhone,
          customerEmail: user.email,
          provider: "MTN",
          merchantUserId: user.id,
          items: [{ name: plan.name, quantity: 1, unitPrice: price }],
        },
      });

      if (error) throw error;
      if (data?.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      if (data?.success === false) throw new Error(data.error || "Payment initialisation failed");

      toast({
        title: "Check your phone",
        description: "Approve the mobile money prompt to complete your subscription.",
      });
      window.location.href = `/payment/callback?reference=${reference}`;
    } catch (error: any) {
      console.error("Error initiating subscription payment:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !currentSubscription) return;

    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ 
          cancel_at_period_end: true,
          status: "cancelled"
        })
        .eq("id", currentSubscription.id);

      if (error) throw error;

      toast({
        title: "Subscription cancelled",
        description: "Your subscription will end at the current period",
      });

      fetchData();
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  };

  const getCurrentPlan = () => {
    if (!currentSubscription) return null;
    return plans.find(p => p.id === currentSubscription.plan_id);
  };

  const currentPlan = getCurrentPlan();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Select the perfect plan for your business needs
          </p>

          {/* Billing Cycle Toggle */}
          <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")} className="inline-block">
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                <Badge variant="secondary" className="ml-2">Save 20%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {currentSubscription && currentPlan && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
                  <Badge variant="outline">{currentSubscription.billing_cycle}</Badge>
                  {currentSubscription.is_trial && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                      Free Trial
                    </Badge>
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-1">{currentPlan.name}</h3>
                <p className="text-muted-foreground mb-3">
                  {currentSubscription.is_trial ? "Trial ends" : "Period ends"}: {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                </p>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">SMS Credits: </span>
                    <span className="font-semibold">
                      {credits?.sms_credits || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email Credits: </span>
                    <span className="font-semibold">
                      {credits?.email_credits || 0}
                    </span>
                  </div>
                </div>
              </div>
              {!currentSubscription.is_trial && (
                <Button variant="destructive" onClick={handleCancelSubscription}>
                  Cancel Subscription
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Notice about trial being one-time */}
        {hasUsedTrial && !currentSubscription && (
          <Card className="p-4 mb-6 bg-muted/50 border-muted">
            <p className="text-sm text-muted-foreground text-center">
              You've already used your free trial. Choose a plan below to continue using all features.
            </p>
          </Card>
        )}

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No subscription plans available</h3>
              <p className="text-muted-foreground">
                Please contact support for subscription options
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan?.id === plan.id;
              const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
              const isProcessing = processingPlan === plan.id;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`p-6 hover:shadow-xl transition-all ${
                    isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-center mb-4 text-primary">
                    {getPlanIcon(plan.name)}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-center mb-2">{plan.name}</h3>
                  
                  {plan.description && (
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      {plan.description}
                    </p>
                  )}
                  
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-foreground">
                      {formatCurrency(price || 0)}
                    </span>
                    <span className="text-muted-foreground">/{billingCycle === "yearly" ? "year" : "month"}</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.sms_limit && (
                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{plan.sms_limit} SMS messages/month</span>
                      </div>
                    )}
                    
                    {plan.email_limit && (
                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{plan.email_limit} Emails/month</span>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrentPlan || isProcessing}
                    className="w-full"
                    variant={isCurrentPlan ? "secondary" : "default"}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : currentPlan ? (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Upgrade Plan
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Subscribe Now
                      </>
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

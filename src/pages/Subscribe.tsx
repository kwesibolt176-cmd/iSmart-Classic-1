import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Check, 
  Crown, 
  Eye, 
  EyeOff, 
  Loader2, 
  Rocket, 
  Shield, 
  Store, 
  Zap,
  CreditCard
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  sms_limit: number | null;
  email_limit: number | null;
}

export const Subscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const planParam = searchParams.get("plan")?.toLowerCase();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (plans.length > 0 && planParam) {
      const plan = plans.find(p => p.name.toLowerCase() === planParam);
      if (plan) {
        setSelectedPlan(plan);
      } else {
        // Default to Professional if plan not found
        const professional = plans.find(p => p.name.toLowerCase().includes("professional"));
        setSelectedPlan(professional || plans[0]);
      }
    }
  }, [plans, planParam]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .neq("name", "Free Trial") // Exclude trial from direct purchase
        .order("display_order");

      if (error) throw error;
      
      const plansData = (data || []).map((plan) => ({
        ...plan,
        features: (plan.features as any) || [],
      }));
      setPlans(plansData);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes("enterprise")) return <Crown className="w-8 h-8 text-primary" />;
    if (name.includes("pro")) return <Rocket className="w-8 h-8 text-primary" />;
    return <Zap className="w-8 h-8 text-primary" />;
  };

  const formatCurrency = (amount: number) => {
    return `GH₵${amount.toFixed(2)}`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/subscribe?plan=${planParam}`,
          },
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: "Account created!",
            description: "You can now proceed with payment.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user || !selectedPlan) return;

    setProcessing(true);
    
    try {
      const price = billingCycle === "yearly" 
        ? selectedPlan.price_yearly 
        : selectedPlan.price_monthly;
      
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
        throw new Error("Please add a mobile money phone number to your profile before subscribing.");
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
          items: [{ name: selectedPlan.name, quantity: 1, unitPrice: price }],
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
      console.error("Error initiating payment:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const price = selectedPlan 
    ? (billingCycle === "yearly" ? selectedPlan.price_yearly : selectedPlan.price_monthly)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Dowo</span>
            </div>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Complete Your Subscription
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose your billing cycle and complete payment to get started with Dowo.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Plan Selection & Details */}
          <div className="space-y-6">
            {/* Billing Cycle Toggle */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Billing Cycle</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="yearly" className="relative">
                      Yearly
                      <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs px-1.5">
                        Save 20%
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Plan Selection */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Select Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan?.id === plan.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getPlanIcon(plan.name)}
                        <div>
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {formatCurrency(billingCycle === "yearly" ? (plan.price_yearly || 0) : plan.price_monthly)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          /{billingCycle === "yearly" ? "year" : "month"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Plan Features */}
            {selectedPlan && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">What's Included</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedPlan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {selectedPlan.sms_limit && (
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{selectedPlan.sms_limit} SMS messages/month</span>
                      </li>
                    )}
                    {selectedPlan.email_limit && (
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{selectedPlan.email_limit} Emails/month</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Auth & Payment */}
          <div className="space-y-6">
            {/* Auth Section - Show if not logged in */}
            {!user ? (
              <Card>
                <CardHeader>
                  <CardTitle>{authMode === "signup" ? "Create Account" : "Sign In"}</CardTitle>
                  <CardDescription>
                    {authMode === "signup" 
                      ? "Create an account to complete your subscription" 
                      : "Sign in to your existing account"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={authLoading}>
                      {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {authMode === "signup" ? "Create Account" : "Sign In"}
                    </Button>
                  </form>

                  <div className="mt-4 text-center text-sm">
                    <span className="text-muted-foreground">
                      {authMode === "signup" ? "Already have an account?" : "Don't have an account?"}
                    </span>{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal"
                      onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}
                    >
                      {authMode === "signup" ? "Sign in" : "Sign up"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Signed in as</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPlan && (
                  <>
                    <div className="flex justify-between items-center">
                      <span>{selectedPlan.name} Plan</span>
                      <span className="font-semibold">{formatCurrency(price || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Billing cycle</span>
                      <span className="capitalize">{billingCycle}</span>
                    </div>
                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(price || 0)}</span>
                      </div>
                    </div>
                  </>
                )}

                <Button 
                  onClick={handleSubscribe}
                  disabled={!user || !selectedPlan || processing}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Pay {formatCurrency(price || 0)}
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Secured by iSmart. Your payment is encrypted.</span>
                </div>
              </CardContent>
            </Card>

            {/* Or start free trial */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Not ready to commit?</p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/auth?ref=free-trial")}
              >
                Start 30-Day Free Trial Instead
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Subscribe;

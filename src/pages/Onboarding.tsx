import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Store, ShoppingBag, Scissors, Stethoscope, Briefcase, Sparkles, ArrowRight, ArrowLeft, Building2, CreditCard, Check, Home, Car, ChevronLeft, UtensilsCrossed, Coffee, Truck, Beer, Package, Shirt, Flower2, ShoppingCart, Gift, Wine, Gem, Droplets, Dumbbell, Leaf, Wrench, PawPrint, Users, Bus, Gamepad2 } from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@/hooks/use-currency";

type IndustrySubtype = {
  id: string;
  label: string;
  description: string;
  features: string[];
};

type IndustryCategory = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  subtypes: IndustrySubtype[];
};

const industryCategories: IndustryCategory[] = [
  {
    id: "food_beverage",
    label: "Food & Beverage",
    icon: UtensilsCrossed,
    description: "Restaurants, cafes, bars, and food service businesses",
    subtypes: [
      { id: "bakery", label: "Bakery", description: "Bread, pastries, and baked goods", features: ["Inventory", "Kitchen", "Products"] },
      { id: "bar_brewery", label: "Bars & Breweries", description: "Alcoholic beverages and entertainment", features: ["Tables", "Inventory", "Staff"] },
      { id: "catering", label: "Catering", description: "Event and party catering services", features: ["Reservations", "Staff", "Invoicing"] },
      { id: "coffee_shop", label: "Coffee Shop", description: "Coffee, tea, and light fare", features: ["Inventory", "Products", "Loyalty"] },
      { id: "food_truck", label: "Food Truck", description: "Mobile food service", features: ["Inventory", "Products", "Sales"] },
      { id: "franchise", label: "Franchise", description: "Multi-location franchise operations", features: ["Locations", "Inventory", "Reports"] },
      { id: "full_service_restaurant", label: "Full Service Restaurant", description: "Full dining with table service", features: ["Tables", "Kitchen", "Reservations"] },
      { id: "quick_service", label: "Quick Service", description: "Fast food and counter service", features: ["Kitchen", "Products", "Orders"] },
      { id: "restaurant", label: "All Food & Beverage", description: "General food service business", features: ["Tables", "Kitchen", "Reservations", "Inventory"] },
    ]
  },
  {
    id: "retail",
    label: "Retail",
    icon: ShoppingBag,
    description: "Product-based retail and merchandise businesses",
    subtypes: [
      { id: "clothing_retail", label: "Clothing & Apparel", description: "Fashion and apparel retail", features: ["Inventory", "Products", "Customers"] },
      { id: "garden_retail", label: "Garden & Nursery", description: "Plants, gardening supplies", features: ["Inventory", "Products", "Sales"] },
      { id: "grocery", label: "Grocery", description: "Food and household essentials", features: ["Inventory", "Products", "Loyalty"] },
      { id: "home_gift", label: "Home & Gift", description: "Home decor and gift items", features: ["Inventory", "Products", "Customers"] },
      { id: "wine_liquor", label: "Wine & Liquor", description: "Alcoholic beverage retail", features: ["Inventory", "Products", "Customers"] },
      { id: "retail", label: "All Retail", description: "General retail business", features: ["Inventory", "Sales", "Customers", "Products"] },
    ]
  },
  {
    id: "beauty",
    label: "Beauty",
    icon: Scissors,
    description: "Beauty, grooming, and personal care services",
    subtypes: [
      { id: "barbershop", label: "Barbershop", description: "Men's grooming and haircuts", features: ["Reservations", "Staff", "Customers"] },
      { id: "beauty_salon", label: "Beauty Salon", description: "Full beauty services", features: ["Reservations", "Staff", "Customers"] },
      { id: "hair_salon", label: "Hair Salon", description: "Hair styling and treatment", features: ["Reservations", "Staff", "Customers"] },
      { id: "med_spa", label: "Med Spa", description: "Medical aesthetic treatments", features: ["Reservations", "Staff", "Customers"] },
      { id: "nail_salon", label: "Nail Salon", description: "Manicure and pedicure services", features: ["Reservations", "Staff", "Customers"] },
      { id: "tattoo_piercing", label: "Tattoo & Piercing", description: "Body art and piercing", features: ["Reservations", "Staff", "Customers"] },
      { id: "salon", label: "All Beauty", description: "General beauty services", features: ["Reservations", "Staff", "Customers", "Products"] },
    ]
  },
  {
    id: "health_wellness",
    label: "Health & Wellness",
    icon: Stethoscope,
    description: "Healthcare, fitness, and wellness services",
    subtypes: [
      { id: "cbd", label: "CBD & Wellness", description: "CBD products and wellness items", features: ["Inventory", "Products", "Customers"] },
      { id: "day_spa", label: "Day Spa", description: "Relaxation and spa treatments", features: ["Reservations", "Staff", "Customers"] },
      { id: "fitness", label: "Fitness & Gym", description: "Fitness centers and training", features: ["Reservations", "Staff", "Customers"] },
      { id: "healthcare", label: "Healthcare & Medical", description: "Medical and clinical services", features: ["Reservations", "Customers", "Staff", "Reports"] },
    ]
  },
  {
    id: "home_commercial",
    label: "Home & Commercial",
    icon: Home,
    description: "Home services and commercial maintenance",
    subtypes: [
      { id: "cleaning", label: "Cleaning Services", description: "Residential and commercial cleaning", features: ["Reservations", "Staff", "Invoicing"] },
      { id: "contractors", label: "Contractors & Specialists", description: "Construction and specialty trades", features: ["Invoicing", "Staff", "Customers"] },
      { id: "landscaping", label: "Landscaping & Outdoors", description: "Lawn care and landscaping", features: ["Reservations", "Staff", "Invoicing"] },
    ]
  },
  {
    id: "services",
    label: "Services",
    icon: Briefcase,
    description: "Professional and specialty services",
    subtypes: [
      { id: "automotive", label: "Automotive", description: "Auto repair and detailing", features: ["Reservations", "Inventory", "Invoicing"] },
      { id: "nonprofit", label: "Organizations & Nonprofits", description: "Community and nonprofit organizations", features: ["Customers", "Reports", "Accounting"] },
      { id: "pet_services", label: "Pet Services", description: "Pet grooming and care", features: ["Reservations", "Staff", "Customers"] },
      { id: "services", label: "Professional Services", description: "Consulting and professional services", features: ["Customers", "Staff", "Reports", "Accounting"] },
      { id: "recreation", label: "Recreation", description: "Entertainment and leisure activities", features: ["Reservations", "Customers", "Products"] },
      { id: "transportation", label: "Transportation", description: "Transport and delivery services", features: ["Customers", "Staff", "Reports"] },
    ]
  },
];

export const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string>("");
  const [address, setAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [settlementType, setSettlementType] = useState<"bank" | "momo">("bank");
  const [settlementProvider, setSettlementProvider] = useState("");
  const [settlementAccount, setSettlementAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, profileChecked, refreshProfile } = useBusiness();

  // Auth protection - redirect to auth if not logged in, or to dashboard if already has profile
  useEffect(() => {
    if (authLoading || !profileChecked) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (profile) {
      navigate("/");
      return;
    }
  }, [user, profile, authLoading, profileChecked, navigate]);

  // Invited staff belong to the inviting business. Letting them through onboarding
  // created a separate business for them, splitting their records and branches
  // from the main account (QA BUG-03 / BUG-06).
  const [staffCheck, setStaffCheck] = useState<"checking" | "staff" | "owner">("checking");
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("staff")
      .select("id")
      .eq("auth_user_id", user.id)
      .neq("access_status", "revoked")
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return;
        // On a lookup error fall back to normal onboarding rather than blocking owners.
        setStaffCheck(!error && data && data.length > 0 ? "staff" : "owner");
      });
    return () => { cancelled = true; };
  }, [user]);

  const selectedCategoryData = selectedCategory 
    ? industryCategories.find(c => c.id === selectedCategory) 
    : null;

  const ghanaianBanks = [
    "Access Bank Ghana",
    "Agricultural Development Bank",
    "Absa Bank Ghana",
    "Bank of Africa Ghana",
    "CAL Bank",
    "Consolidated Bank Ghana",
    "Ecobank Ghana",
    "FBNBank Ghana",
    "Fidelity Bank Ghana",
    "First Atlantic Bank",
    "First National Bank Ghana",
    "GCB Bank",
    "Guaranty Trust Bank Ghana",
    "National Investment Bank",
    "OmniBSIC Bank",
    "Prudential Bank",
    "Republic Bank Ghana",
    "Societe Generale Ghana",
    "Stanbic Bank Ghana",
    "Standard Chartered Bank Ghana",
    "United Bank for Africa Ghana",
    "Zenith Bank Ghana",
  ];

  const momoProviders = ["MTN", "Telecel"];

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step === 1 && (!businessName || !industry)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && (!businessPhone || !businessEmail)) {
      toast({
        title: "Missing Information",
        description: "Phone number and email are required",
        variant: "destructive",
      });
      return;
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName || !industry) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (staffCheck === "staff") return;

    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile
      const { error: profileError } = await supabase
        .from("business_profiles")
        .update({
          business_name: businessName,
          industry: industry as any,
          address: address,
          business_phone: businessPhone,
          business_email: businessEmail,
          currency: currency,
          settlement_type: settlementType,
          settlement_provider: settlementProvider,
          settlement_account: settlementAccount,
        })
        .eq("user_id", user.id);

      if (profileError) {
        toast({
          title: "Error",
          description: profileError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get selected subtype features
      const selectedSubtype = selectedCategoryData?.subtypes.find(s => s.id === industry);
      const features = selectedSubtype?.features || [];
      
      // Update feature settings based on selected subtype features
      const { error: settingsError } = await supabase
        .from("feature_settings")
        .update({
          tables_enabled: features.includes("Tables"),
          reservations_enabled: features.includes("Reservations"),
          kitchen_enabled: features.includes("Kitchen"),
          inventory_enabled: features.includes("Inventory") || features.includes("Products"),
        })
        .eq("user_id", user.id);

      if (settingsError) {
        toast({
          title: "Error",
          description: settingsError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    } else {
      // Create new business profile
      const { error: profileError } = await supabase
        .from("business_profiles")
        .insert({
          user_id: user.id,
          business_name: businessName,
          industry: industry as any,
          address: address,
          business_phone: businessPhone,
          business_email: businessEmail,
          currency: currency,
          settlement_type: settlementType,
          settlement_provider: settlementProvider,
          settlement_account: settlementAccount,
        });

      if (profileError) {
        toast({
          title: "Error",
          description: profileError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get selected subtype features
      const selectedSubtype = selectedCategoryData?.subtypes.find(s => s.id === industry);
      const features = selectedSubtype?.features || [];
      
      // Create default feature settings based on selected subtype features
      const { error: settingsError } = await supabase
        .from("feature_settings")
        .insert({
          user_id: user.id,
          tables_enabled: features.includes("Tables"),
          reservations_enabled: features.includes("Reservations"),
          kitchen_enabled: features.includes("Kitchen"),
          inventory_enabled: features.includes("Inventory") || features.includes("Products"),
          staff_enabled: features.includes("Staff") || true,
          customers_enabled: features.includes("Customers") || true,
          chat_enabled: true,
          reports_enabled: features.includes("Reports") || true,
          accounting_enabled: features.includes("Accounting") || true,
        });

      if (settingsError) {
        toast({
          title: "Error",
          description: settingsError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create default location
      const { error: locationError } = await supabase
        .from("locations")
        .insert({
          user_id: user.id,
          name: businessName,
          address: address || null,
          phone: businessPhone || null,
          email: businessEmail || null,
          is_default: true,
          is_active: true,
        });

      if (locationError) {
        toast({
          title: "Error",
          description: locationError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Seed industry-specific categories
      const { error: categoryError } = await supabase.functions.invoke('seed-industry-categories', {
        body: { userId: user.id, industry }
      });

      if (categoryError) {
        console.error('Failed to seed categories:', categoryError);
        // Don't block onboarding if category seeding fails
      }
    }

    // Refresh the profile in context before navigating
    await refreshProfile();
    
    toast({
      title: "Success!",
      description: "Your business profile has been created",
    });
    
    navigate("/");
  };

  // Show loading while checking auth state
  if (authLoading || !profileChecked || (user && !profile && staffCheck === "checking")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if redirecting
  if (!user || profile) return null;

  if (staffCheck === "staff") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>You're a team member</CardTitle>
            <CardDescription>
              This account was invited to join an existing business, so it can't create a business of its own.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Use your 4-digit staff PIN on your business's portal or POS. To run your own business, sign up with a different email.
            </p>
            <Button
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <Card className="w-full max-w-3xl relative z-10 border-border/50 shadow-[var(--shadow-elevated)] backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center pb-4 sm:pb-6 pt-6 sm:pt-10 px-4 sm:px-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm border border-primary/20">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
            Welcome to iSmartPay
          </CardTitle>
          <CardDescription className="text-sm sm:text-base lg:text-lg mt-2">
            Step {step} of {totalSteps}: {step === 1 ? "Business Details" : step === 2 ? "Contact Info" : "Payment (Optional)"}
          </CardDescription>
          
          {/* Progress Bar */}
          <div className="mt-4 sm:mt-6">
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Step 1: Business Basics */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-3">
                  <Label htmlFor="businessName" className="text-base font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Business Name *
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="Enter your business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Business Type *
                  </Label>
                  
                  {/* Category Selection */}
                  {!selectedCategory ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {industryCategories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className="flex flex-col items-center p-3 sm:p-4 rounded-xl border-2 border-border/50 hover:border-primary/50 hover:bg-muted/30 transition-all duration-300 text-center touch-manipulation active:scale-95"
                          >
                            <div className="p-2 sm:p-3 rounded-lg bg-muted/50 text-muted-foreground mb-1 sm:mb-2">
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <span className="font-medium text-xs sm:text-sm">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Back button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCategory(null);
                          setIndustry("");
                        }}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back to categories
                      </Button>
                      
                      {/* Subtype Selection */}
                      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/30">
                        {selectedCategoryData && (
                          <>
                            <selectedCategoryData.icon className="w-5 h-5 text-primary" />
                            <span className="font-medium">{selectedCategoryData.label}</span>
                          </>
                        )}
                      </div>
                      
                      <RadioGroup value={industry} onValueChange={setIndustry} className="w-full">
                        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
                          {selectedCategoryData?.subtypes.map((subtype) => {
                            const isSelected = industry === subtype.id;
                            return (
                              <label
                                key={subtype.id}
                                htmlFor={subtype.id}
                                className={`
                                  relative flex items-start p-4 rounded-xl border-2 cursor-pointer
                                  transition-all duration-300 group
                                  ${isSelected
                                    ? "border-primary bg-gradient-to-br from-primary/10 to-secondary/5 shadow-md"
                                    : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                                  }
                                `}
                              >
                                <RadioGroupItem value={subtype.id} id={subtype.id} className="mt-1" />
                                <div className="flex-1 ml-4">
                                  <span className="font-semibold">{subtype.label}</span>
                                  <p className="text-sm text-muted-foreground">{subtype.description}</p>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {subtype.features.map((feature) => (
                                      <span key={feature} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                        {feature}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-5 h-5 text-primary absolute top-4 right-4" />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Contact Information */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-3">
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter your business address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="businessPhone">Business Phone <span className="text-destructive">*</span></Label>
                    <PhoneInput
                      id="businessPhone"
                      value={businessPhone}
                      onChange={setBusinessPhone}
                      placeholder="Business phone number"
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="businessEmail">Business Email <span className="text-destructive">*</span></Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      placeholder="contact@business.com"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.symbol} - {curr.name} ({curr.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Payment Setup */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center space-y-2 mb-6">
                  <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Payment Settlement</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Set up how you'll receive payments. You can configure this now or skip and add it later in Settings.
                  </p>
                </div>

                <div className="space-y-5 p-6 rounded-xl border border-border/50 bg-muted/20">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Settlement Type</Label>
                    <RadioGroup value={settlementType} onValueChange={(value: "bank" | "momo") => setSettlementType(value)}>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${settlementType === "bank" ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/50 hover:bg-muted/30"}`}>
                          <RadioGroupItem value="bank" id="bank" />
                          <span className="font-medium">Bank Account</span>
                        </label>
                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${settlementType === "momo" ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/50 hover:bg-muted/30"}`}>
                          <RadioGroupItem value="momo" id="momo" />
                          <span className="font-medium">Mobile Money</span>
                        </label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="settlementProvider" className="text-base font-medium">
                      {settlementType === "bank" ? "Select Your Bank" : "Mobile Money Provider"}
                    </Label>
                    <Select value={settlementProvider} onValueChange={setSettlementProvider}>
                      <SelectTrigger id="settlementProvider" className="h-12">
                        <SelectValue placeholder={settlementType === "bank" ? "Select your bank" : "Select provider"} />
                      </SelectTrigger>
                      <SelectContent>
                        {settlementType === "bank" ? (
                          ghanaianBanks.map((bank) => (
                            <SelectItem key={bank} value={bank}>
                              {bank}
                            </SelectItem>
                          ))
                        ) : (
                          momoProviders.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="settlementAccount" className="text-base font-medium">
                      {settlementType === "bank" ? "Account Number" : "Mobile Money Number"}
                    </Label>
                    <Input
                      id="settlementAccount"
                      placeholder={settlementType === "bank" ? "Enter your account number" : "Enter your mobile money number"}
                      value={settlementAccount}
                      onChange={(e) => setSettlementAccount(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">i</span>
                  </div>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    This information is securely stored and only used for payment settlement. You can update it anytime in Settings.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-6">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex items-center gap-2 h-12 px-6"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              
              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 h-12 text-base bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      // Clear settlement fields and submit form
                      setSettlementProvider("");
                      setSettlementAccount("");
                      handleSubmit(e as unknown as React.FormEvent);
                    }}
                    disabled={loading}
                    className="flex-1 h-12 text-base"
                  >
                    Skip for now
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 h-12 text-base bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

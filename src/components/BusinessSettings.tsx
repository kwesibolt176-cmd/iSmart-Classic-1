import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image, Loader2, Check, Save, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/hooks/use-currency";
import { uploadBusinessLogo } from "@/lib/ismart-uploads";
import { resolveISmartBusinessId, pushBusinessInfoToISmart } from "@/lib/ismart-business";

export const BusinessSettings = () => {
  const { user, profile, refreshProfile } = useBusiness();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [taxId, setTaxId] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [dailySalesSummaryEnabled, setDailySalesSummaryEnabled] = useState(false);
  const [receiptWidth, setReceiptWidth] = useState("80mm");
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("21:00");
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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

  // Check if form has unsaved changes
  const isDirty = () => {
    if (!profile) return false;
    return (
      businessName !== (profile.business_name || "") ||
      currency !== (profile.currency || "GHS") ||
      address !== (profile.address || "") ||
      businessPhone !== (profile.business_phone || "") ||
      businessEmail !== (profile.business_email || "") ||
      taxId !== (profile.tax_id || "") ||
      website !== (profile.website || "") ||
      logoUrl !== (profile.logo_url || null) ||
      bannerUrl !== (profile.banner_url || null) ||
      dailySalesSummaryEnabled !== (profile.daily_sales_summary_enabled || false) ||
      receiptWidth !== ((profile as any).receipt_width || "80mm") ||
      openingTime !== ((profile as any).opening_time || "09:00") ||
      closingTime !== ((profile as any).closing_time || "21:00")
    );
  };

  // Reset saved state when any field changes
  useEffect(() => {
    if (saved && isDirty()) {
      setSaved(false);
    }
  }, [businessName, currency, address, businessPhone, businessEmail, taxId, website, logoUrl, bannerUrl, dailySalesSummaryEnabled, receiptWidth, openingTime, closingTime]);

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || "");
      setCurrency(profile.currency || "GHS");
      setAddress(profile.address || "");
      setBusinessPhone(profile.business_phone || "");
      setBusinessEmail(profile.business_email || "");
      setTaxId(profile.tax_id || "");
      setWebsite(profile.website || "");
      setLogoUrl(profile.logo_url || null);
      setBannerUrl(profile.banner_url || null);
      setDailySalesSummaryEnabled(profile.daily_sales_summary_enabled || false);
      setReceiptWidth((profile as any).receipt_width || "80mm");
      setOpeningTime((profile as any).opening_time || "09:00");
      setClosingTime((profile as any).closing_time || "21:00");
      
      // If profile is loaded and has data, start in non-editing mode
      if (profile.business_name) {
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    }
  }, [profile]);

  const uploadFile = async (file: File, type: "logo" | "banner") => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('business-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, "logo");
      if (url) {
        setLogoUrl(url);
        const ismartBusinessId = resolveISmartBusinessId(profile);
        if (ismartBusinessId) {
          try {
            await uploadBusinessLogo(file, ismartBusinessId);
          } catch (mirrorError: any) {
            console.error("iSmart logo sync failed:", mirrorError);
          }
        }
        toast({ title: "Logo uploaded", description: "Don't forget to save your changes" });
      }
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const url = await uploadFile(file, "banner");
      if (url) {
        setBannerUrl(url);
        toast({ title: "Banner uploaded", description: "Don't forget to save your changes" });
      }
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!openingTime || !closingTime || openingTime >= closingTime) {
      toast({
        title: "Invalid business hours",
        description: "Closing time must be later than opening time.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    const { error } = await supabase
      .from("business_profiles")
      .update({
        business_name: businessName,
        currency: currency,
        address: address,
        business_phone: businessPhone,
        business_email: businessEmail,
        tax_id: taxId,
        website: website,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        daily_sales_summary_enabled: dailySalesSummaryEnabled,
        receipt_width: receiptWidth,
        opening_time: openingTime,
        closing_time: closingTime,
      })
      .eq("user_id", user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Business settings updated successfully",
      });
      // Mirror the business registration details to the iSmart business API
      try {
        await pushBusinessInfoToISmart(resolveISmartBusinessId(profile), {
          business_name: businessName,
          address,
          business_phone: businessPhone,
          business_email: businessEmail,
          tax_id: taxId,
          website,
          currency,
        });
      } catch (mirrorError: any) {
        console.warn("iSmart business info sync failed:", mirrorError?.message || mirrorError);
      }
      await refreshProfile();
      setSaved(true);
      setIsEditing(false);
    }
  };

  const hasChanges = isDirty();

  return (
    <Card className={cn(
      "transition-all duration-500",
      saved 
        ? "bg-blue-50/30 border-blue-200 shadow-sm" 
        : hasChanges 
          ? "bg-blue-50/30 border-blue-300 shadow-md" 
          : "bg-card border-border"
    )}>
      <CardHeader className={cn(
        "pb-4 border-b transition-colors duration-500",
        saved ? "border-blue-200 bg-blue-50/50" : hasChanges ? "border-blue-200 bg-blue-50/50" : "border-border"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500",
              saved ? "bg-blue-100 text-blue-600" : hasChanges ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground"
            )}>
              {saved ? <Check className="w-5 h-5" /> : hasChanges ? <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <CardTitle className="text-foreground">Business Information</CardTitle>
              <CardDescription className={cn(
                "transition-colors duration-500",
                saved ? "text-blue-600" : !isEditing ? "text-blue-600 font-medium" : hasChanges ? "text-blue-600" : ""
              )}>
                {saved ? "All changes saved successfully" : !isEditing ? "Business details are up to date" : hasChanges ? "You have unsaved changes" : "Manage your business details and branding"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg text-blue-800 text-sm font-semibold">
                <Check className="w-4 h-4" />
                <span>Saved</span>
              </div>
            ) : hasChanges ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg text-blue-800 text-sm font-semibold">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Draft - Unsaved</span>
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isEditing && profile?.business_name ? (
          <div className="space-y-8">
            {/* Summary View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted border shadow-sm shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <Building2 className="w-8 h-8 text-primary/30" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 pt-1">
                    <h3 className="text-2xl font-bold tracking-tight">{businessName}</h3>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-none px-2 h-5">VERIFIED BUSINESS</Badge>
                      {taxId && <span>• Tax ID: {taxId}</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center border shadow-sm">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Store Address</p>
                      <p className="text-sm font-medium whitespace-pre-wrap">{address || "No address set"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Phone</p>
                        <p className="text-sm font-medium">{businessPhone || "No phone set"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Currency</p>
                        <p className="text-sm font-medium">{currency} ({SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol})</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="w-full h-32 rounded-xl overflow-hidden bg-muted border shadow-sm relative group">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                      <Image className="w-10 h-10 text-primary/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <Badge className="absolute bottom-3 right-3 bg-white/90 text-black hover:bg-white border-none shadow-sm">Store Banner</Badge>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-4">
                  <h4 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Operating Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Store Hours</p>
                      <p className="text-sm font-medium">{openingTime} - {closingTime}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Receipt Width</p>
                      <p className="text-sm font-medium">{receiptWidth}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-blue-500/10">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Email Reports</p>
                    <Badge className={cn(
                      "border-none px-2",
                      dailySalesSummaryEnabled ? "bg-blue-500/20 text-blue-700" : "bg-muted text-muted-foreground"
                    )}>
                      {dailySalesSummaryEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="hover:bg-blue-50 hover:text-blue-600 border-blue-100"
              >
                Edit Business Details
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Logo and Banner Upload */}
            <div className="space-y-4 border-b pb-6">
              <Label className="text-base font-semibold">Business Branding</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Business Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
                      {logoUrl ? (
                        <>
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                          <button
                            onClick={() => setLogoUrl(null)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : uploadingLogo ? (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 200x200px, PNG or JPG
                      </p>
                    </div>
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="space-y-2">
                  <Label>Store Banner</Label>
                  <div className="space-y-2">
                    <div className="relative w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
                      {bannerUrl ? (
                        <>
                          <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setBannerUrl(null)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : uploadingBanner ? (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploadingBanner}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Banner
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 1200x300px, PNG or JPG
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input 
                id="businessName" 
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street&#10;City, State ZIP&#10;Country"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessPhone">Business Phone</Label>
                <PhoneInput 
                  id="businessPhone" 
                  value={businessPhone}
                  onChange={(value) => setBusinessPhone(value)}
                  placeholder="Enter business phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessEmail">Business Email</Label>
                <Input 
                  id="businessEmail" 
                  type="email" 
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="contact@business.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input 
                  id="taxId" 
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="XX-XXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
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

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input 
                id="website" 
                type="url" 
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbusiness.com"
              />
            </div>

            {/* Daily Sales Summary Toggle */}
            <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base">Daily Sales Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a daily email summary of your sales at the end of each day
                </p>
              </div>
              <Switch
                checked={dailySalesSummaryEnabled}
                onCheckedChange={setDailySalesSummaryEnabled}
              />
            </div>

            {/* Receipt Printer Width */}
            <div className="space-y-2">
              <Label className="text-base">Receipt Printer Width</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select your thermal receipt printer paper width
              </p>
              <Select value={receiptWidth} onValueChange={setReceiptWidth}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select width" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (2.25")</SelectItem>
                  <SelectItem value="80mm">80mm (3.15")</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Business Hours */}
            <div className="space-y-4 border-t pt-6">
              <div>
                <Label className="text-base font-semibold">Business Hours</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Set your store's opening and closing times
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openingTime">Opening Time</Label>
                  <Input
                    id="openingTime"
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closingTime">Closing Time</Label>
                  <Input
                    id="closingTime"
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                if (profile) {
                  setBusinessName(profile.business_name || "");
                  setCurrency(profile.currency || "GHS");
                  setAddress(profile.address || "");
                  setBusinessPhone(profile.business_phone || "");
                  setBusinessEmail(profile.business_email || "");
                  setTaxId(profile.tax_id || "");
                  setWebsite(profile.website || "");
                  setLogoUrl(profile.logo_url || null);
                  setBannerUrl(profile.banner_url || null);
                  setDailySalesSummaryEnabled(profile.daily_sales_summary_enabled || false);
                  setReceiptWidth((profile as any).receipt_width || "80mm");
                  setOpeningTime((profile as any).opening_time || "09:00");
                  setClosingTime((profile as any).closing_time || "21:00");
                }
                setSaved(false);
                if (profile?.business_name) setIsEditing(false);
              }}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={loading || saved || !hasChanges}
                className={saved ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

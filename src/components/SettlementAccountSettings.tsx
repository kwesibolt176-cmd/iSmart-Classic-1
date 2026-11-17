import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, Smartphone, Save, Check, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBankLogo } from "@/utils/bankLogos";

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
  "Universal Merchant Bank",
];

const momoLogos: Record<string, string> = {
  "MTN": "/assets/mtnlogo.png",
  "Telecel": "/assets/telecellogo.png",
  "Airtel Tigo": "/utilities/airtel-tigo.png"
};

const momoProviders = ["MTN", "Telecel", "Airtel Tigo"];

export const SettlementAccountSettings = () => {
  const { user, profile, refreshProfile } = useBusiness();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settlementType, setSettlementType] = useState<"bank" | "momo">("bank");
  const [settlementProvider, setSettlementProvider] = useState("");
  const [settlementAccount, setSettlementAccount] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      setSettlementType((profile.settlement_type as "bank" | "momo") || "bank");
      setSettlementProvider(profile.settlement_provider || "");
      setSettlementAccount(profile.settlement_account || "");
      
      if (profile.settlement_provider && profile.settlement_account) {
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    }
  }, [profile?.id]);

  const isDirty = () => {
    if (!profile) return false;
    return (
      settlementType !== ((profile.settlement_type as "bank" | "momo") || "bank") ||
      settlementProvider !== (profile.settlement_provider || "") ||
      settlementAccount !== (profile.settlement_account || "")
    );
  };

  const hasChanges = isDirty();

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from("business_profiles")
      .update({
        settlement_type: settlementType,
        settlement_provider: settlementProvider,
        settlement_account: settlementAccount,
      })
      .eq("user_id", user.id);

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settlement account updated", description: "Your payout destination has been saved." });
      await refreshProfile();
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSaved(false);
  };

  const handleCancel = () => {
    if (profile) {
      setSettlementType((profile.settlement_type as "bank" | "momo") || "bank");
      setSettlementProvider(profile.settlement_provider || "");
      setSettlementAccount(profile.settlement_account || "");
    }
    setSaved(false);
    if (isConfigured) {
      setIsEditing(false);
    }
  };

  const isConfigured = profile?.settlement_provider && profile?.settlement_account;

  return (
    <Card className={cn(
      "transition-all duration-300",
      saved ? "bg-[hsl(217_91%_60%)]/5 border-[hsl(217_91%_60%)]/30 dark:bg-[hsl(217_91%_60%)]/10 dark:border-[hsl(217_91%_60%)]/40" :
      hasChanges ? "bg-[hsl(217_91%_60%)]/5 border-[hsl(217_91%_60%)]/40 dark:bg-[hsl(217_91%_60%)]/10 dark:border-[hsl(217_91%_60%)]/50" :
      "bg-card border-border"
    )}>
      <CardHeader className={cn(
        "pb-4 border-b transition-colors duration-300",
        saved ? "border-blue-200 dark:border-blue-800" :
        hasChanges ? "border-blue-200 dark:border-blue-800" :
        "border-border"
      )}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl transition-all duration-300",
              saved ? "bg-[hsl(217_91%_60%)]/20 dark:bg-[hsl(217_91%_60%)]/30" :
              hasChanges ? "bg-[hsl(217_91%_60%)]/20 dark:bg-[hsl(217_91%_60%)]/30" :
              "bg-primary/10"
            )}>
              <Building2 className={cn(
                "h-5 w-5 transition-colors",
                saved ? "text-[hsl(217_91%_60%)]" : hasChanges ? "text-[hsl(217_91%_60%)]" : "text-primary"
              )} />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Settlement Account</CardTitle>
              <CardDescription className={cn(
                "transition-colors duration-300",
                saved ? "text-[hsl(217_91%_60%)]" :
                !isEditing ? "text-[hsl(217_91%_60%)] font-medium" :
                hasChanges ? "text-[hsl(217_91%_60%)]" :
                ""
              )}>
                {saved
                  ? "Changes saved successfully"
                  : !isEditing
                    ? "Your payout account is securely configured"
                    : hasChanges
                      ? "You have unsaved changes"
                      : "Configure where your collected payments will be deposited"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured && !hasChanges && !saved && (
              <Badge variant="secondary" className="bg-[hsl(217_91%_60%)]/10 text-[hsl(217_91%_60%)] border-none gap-1.5 text-xs font-semibold py-1.5 px-3">
                <ShieldCheck className="h-3.5 w-3.5" />
                Account Configured
              </Badge>
            )}
            {saved && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(217_91%_60%)]/20 border border-[hsl(217_91%_60%)]/40 dark:bg-[hsl(217_91%_60%)]/20 dark:border-[hsl(217_91%_60%)]/50 rounded-lg text-[hsl(217_91%_60%)] dark:text-[hsl(217_91%_60%)] text-xs font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </div>
            )}
            {hasChanges && !saved && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(217_91%_60%)]/20 border border-[hsl(217_91%_60%)]/40 dark:bg-[hsl(217_91%_60%)]/20 dark:border-[hsl(217_91%_60%)]/50 rounded-lg text-[hsl(217_91%_60%)] dark:text-[hsl(217_91%_60%)] text-xs font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(217_91%_60%)] animate-pulse" />
                <span>Unsaved</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6 text-left">
        {!isEditing && isConfigured ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 rounded-xl bg-[hsl(217_91%_60%)]/5 border border-[hsl(217_91%_60%)]/10 shadow-inner">
              <div className="p-3 bg-[hsl(217_91%_60%)]/10 rounded-xl shrink-0">
                {profile?.settlement_type === "momo" ? (
                  momoLogos[profile?.settlement_provider || ""] ? (
                    <img 
                      src={momoLogos[profile.settlement_provider!]} 
                      alt={profile.settlement_provider!} 
                      className="w-10 h-10 rounded-sm object-contain bg-white/20 p-1" 
                    />
                  ) : (
                    <Smartphone className="h-6 w-6 text-blue-600" />
                  )
                ) : getBankLogo(profile?.settlement_provider) ? (
                  <img 
                    src={getBankLogo(profile?.settlement_provider)!} 
                    alt={profile?.settlement_provider || "Bank"} 
                    className="w-10 h-10 rounded-sm object-contain bg-white/20 p-1" 
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-blue-600/70 uppercase tracking-widest mb-1 font-mono">Verified Payout Account</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-foreground truncate">{profile?.settlement_provider}</p>
                  <Badge className="bg-blue-500/20 text-blue-700 hover:bg-blue-500/30 border-none text-[10px] h-5 px-2">PRIMARY</Badge>
                </div>
                <p className="text-base text-muted-foreground font-mono mt-0.5 tracking-tight">{profile?.settlement_account}</p>
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button 
                variant="outline" 
                onClick={handleEdit}
                className="hover:bg-blue-50 hover:text-blue-600 border-blue-100"
              >
                Edit Account Details
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Account Type</Label>
              <RadioGroup
                value={settlementType}
                onValueChange={(value: "bank" | "momo") => {
                  setSettlementType(value);
                  setSettlementProvider("");
                  setSaved(false);
                }}
                className="grid grid-cols-2 gap-3"
              >
                <label
                  htmlFor="bank"
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    settlementType === "bank"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem value="bank" id="bank" className="sr-only" />
                  <div className={cn("p-2 rounded-lg", settlementType === "bank" ? "bg-primary/10" : "bg-muted")}>
                    <Building2 className={cn("h-4 w-4", settlementType === "bank" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", settlementType === "bank" ? "text-primary" : "text-foreground")}>
                      Bank Account
                    </p>
                    <p className="text-[10px] text-muted-foreground">Direct bank transfer</p>
                  </div>
                </label>

                <label
                  htmlFor="momo"
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    settlementType === "momo"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem value="momo" id="momo" className="sr-only" />
                  <div className={cn("p-2 rounded-lg", settlementType === "momo" ? "bg-primary/10" : "bg-muted")}>
                    <Smartphone className={cn("h-4 w-4", settlementType === "momo" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", settlementType === "momo" ? "text-primary" : "text-foreground")}>
                      Mobile Money
                    </p>
                    <p className="text-[10px] text-muted-foreground">MTN, Telecel, AirtelTigo</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlementProvider" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {settlementType === "bank" ? "Select Bank" : "Select Mobile Money Provider"}
              </Label>
              <Select
                value={settlementProvider}
                onValueChange={(v) => { setSettlementProvider(v); setSaved(false); }}
              >
                <SelectTrigger id="settlementProvider" className="h-12 bg-muted/10 border-border/60">
                  {/* Remove the manual rendering of logos here as SelectValue will handle it */}
                  <SelectValue placeholder={settlementType === "bank" ? "Choose your bank" : "Choose provider"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {(settlementType === "bank" ? ghanaianBanks : momoProviders).map((item) => (
                    <SelectItem key={item} value={item}>
                      <div className="flex items-center gap-3 py-1">
                        {settlementType === "bank" && getBankLogo(item) && (
                          <img 
                            src={getBankLogo(item)!} 
                            alt="" 
                            className="w-5 h-5 rounded-sm object-contain bg-white shrink-0 shadow-sm" 
                          />
                        )}
                        {settlementType === "momo" && momoLogos[item] && (
                          <img 
                            src={momoLogos[item]} 
                            alt="" 
                            className="w-5 h-5 rounded-sm object-contain bg-white shrink-0 shadow-sm" 
                          />
                        )}
                        <span className="font-medium">{item}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlementAccount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {settlementType === "bank" ? "Account Number" : "Mobile Money Number"}
              </Label>
              <Input
                id="settlementAccount"
                value={settlementAccount}
                onChange={(e) => { setSettlementAccount(e.target.value); setSaved(false); }}
                placeholder={settlementType === "bank" ? "Enter account number" : "e.g. 0241234567"}
                className="h-12 bg-muted/10 border-border/60 focus:bg-background transition-all font-mono tracking-tight"
              />
              <p className="text-[10px] text-muted-foreground italic">
                {settlementType === "bank"
                  ? "Payments will be settled to this bank account number."
                  : "Payments will be sent to this mobile money number."}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || saved || !hasChanges || !settlementProvider || !settlementAccount}
                className={cn("min-w-[140px]", saved ? "bg-blue-600 hover:bg-blue-700" : "")}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : saved ? (
                  <><Check className="w-4 h-4 mr-2" />Saved</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Save Changes</>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

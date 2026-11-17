import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBusiness } from "@/contexts/BusinessContext";
import { useTaxEngine } from "@/hooks/use-tax-engine";
import { useCurrency } from "@/hooks/use-currency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, FileText, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export const TaxSettingsCard = () => {
  const { user, profile, refreshProfile } = useBusiness();
  const { config, businessTaxProfile, shouldRegisterForVat } = useTaxEngine();
  const { format: formatCurrency, currencySymbol } = useCurrency();

  const [tin, setTin] = useState((profile as any)?.tin || "");
  const [vatRegistered, setVatRegistered] = useState((profile as any)?.vat_registered || false);
  const [taxRegime, setTaxRegime] = useState((profile as any)?.tax_regime || "None");
  const [turnover, setTurnover] = useState<number>((profile as any)?.turnover_last_12_months || 0);
  const [turnoverDisplay, setTurnoverDisplay] = useState(
    new Intl.NumberFormat('en-US').format((profile as any)?.turnover_last_12_months || 0)
  );
  const [saving, setSaving] = useState(false);

  const formatNumber = (val: string) => {
    // Remove non-numeric characters except for one decimal point
    const cleanValue = val.replace(/[^0-9.]/g, '');
    const numberValue = parseFloat(cleanValue);
    
    if (isNaN(numberValue)) {
      setTurnover(0);
      setTurnoverDisplay("");
      return;
    }

    setTurnover(numberValue);
    // Format with commas for display
    setTurnoverDisplay(new Intl.NumberFormat('en-US').format(numberValue));
  };

  const shouldRegister = shouldRegisterForVat(turnover);
  const registrationThreshold = Number(config?.vat_registration_threshold ?? 200000);

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({
          tin,
          vat_registered: vatRegistered,
          tax_regime: taxRegime,
          turnover_last_12_months: turnover,
        } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile?.();
      toast({
        title: "Tax settings saved",
        description: "Your tax configuration has been updated.",
      });
    } catch (error) {
      console.error("Error saving tax settings:", error);
      toast({
        title: "Error",
        description: "Failed to save tax settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <CardTitle>Ghana Tax Settings</CardTitle>
        </div>
        <CardDescription>
          Configure your business tax profile for GRA compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Tax Rates */}
        {config && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" />
              <span className="font-medium">Current Ghana Tax Rates</span>
              <Badge variant="outline">v{config.version}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">VAT:</span>
                <span className="ml-2 font-medium">{(Number(config.vat_rate) * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">NHIL:</span>
                <span className="ml-2 font-medium">{(Number(config.nhil_rate) * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">GETFund:</span>
                <span className="ml-2 font-medium">{(Number(config.getfund_rate) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Total indirect tax on standard supplies: 20%
            </div>
          </div>
        )}

        <Separator />

        {/* TIN */}
        <div className="space-y-2">
          <Label htmlFor="tin">Tax Identification Number (TIN)</Label>
          <Input
            id="tin"
            placeholder="Enter your TIN"
            value={tin}
            onChange={(e) => setTin(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your GRA-issued Tax Identification Number
          </p>
        </div>

        {/* Tax Regime */}
        <div className="space-y-2">
          <Label htmlFor="taxRegime">Tax Regime</Label>
          <Select value={taxRegime} onValueChange={setTaxRegime}>
            <SelectTrigger>
              <SelectValue placeholder="Select tax regime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None (Informal/Exempt)</SelectItem>
              <SelectItem value="Presumptive">Presumptive Tax</SelectItem>
              <SelectItem value="VAT">VAT Registered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* VAT Registration */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>VAT Registered</Label>
            <p className="text-xs text-muted-foreground">
              Enable if registered for VAT with GRA
            </p>
          </div>
          <Switch
            checked={vatRegistered}
            onCheckedChange={setVatRegistered}
          />
        </div>

        {/* Annual Turnover */}
        <div className="space-y-2">
          <Label htmlFor="turnover" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            Annual Turnover (Last 12 Months)
          </Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center px-4 pointer-events-none border-r border-border group-focus-within:border-primary/50 transition-colors">
              <span className="text-sm font-bold text-primary">
                {currencySymbol}
              </span>
            </div>
            <Input
              id="turnover"
              type="text"
              className="pl-16 h-12 text-lg font-medium tracking-tight focus-visible:ring-primary/20"
              placeholder="0.00"
              value={turnoverDisplay}
              onChange={(e) => formatNumber(e.target.value)}
            />
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Used to determine GRA VAT registration threshold
          </p>
        </div>

        {/* VAT Threshold Warning */}
        {shouldRegister && !vatRegistered && (
          <Alert variant="destructive" className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold uppercase tracking-tight">VAT Registration Required</AlertTitle>
            <AlertDescription className="text-sm">
              Your turnover of <span className="font-bold">{formatCurrency(turnover)}</span> meets or exceeds the <span className="font-bold">{formatCurrency(registrationThreshold)}</span> configured GRA threshold.
              Manual tax compliance is required.
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Tax Settings
        </Button>
      </CardContent>
    </Card>
  );
};

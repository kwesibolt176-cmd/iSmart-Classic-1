import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";

interface POSSettingsRecord {
  auto_print_receipts: boolean;
  tips_enabled: boolean;
  sound_notifications: boolean;
  email_receipts: boolean;
  default_tip_percentage: number;
  receipt_footer: string;
  vat_nhil_enabled: boolean;
  vat_rate: number;
  nhil_rate: number;
  service_charge_enabled: boolean;
  service_charge_rate: number;
}

export const POSSettings = () => {
  const { toast } = useToast();
  const { user } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true);
  const [enableTips, setEnableTips] = useState(true);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [emailReceipts, setEmailReceipts] = useState(false);
  const [defaultTip, setDefaultTip] = useState("15");
  const [receiptFooter, setReceiptFooter] = useState("thankyou");
  
  // Tax & Fees settings
  const [enableVatNhil, setEnableVatNhil] = useState(true);
  const [vatRate, setVatRate] = useState("12.5");
  const [nhilRate, setNhilRate] = useState("2.5");
  const [enableServiceCharge, setEnableServiceCharge] = useState(false);
  const [serviceChargeRate, setServiceChargeRate] = useState("10");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const applySettings = (settings: POSSettingsRecord) => {
    setAutoPrint(settings.auto_print_receipts);
    setEnableTips(settings.tips_enabled);
    setSoundNotifications(settings.sound_notifications);
    setEmailReceipts(settings.email_receipts);
    setDefaultTip(String(settings.default_tip_percentage));
    setReceiptFooter(settings.receipt_footer);
    setEnableVatNhil(settings.vat_nhil_enabled);
    setVatRate(String(settings.vat_rate));
    setNhilRate(String(settings.nhil_rate));
    setEnableServiceCharge(settings.service_charge_enabled);
    setServiceChargeRate(String(settings.service_charge_rate));
  };

  useEffect(() => {
    if (!user?.id) return;
    const loadSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("pos_settings" as never)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setLoading(false);
      if (error) {
        toast({ title: "Unable to load POS settings", description: error.message, variant: "destructive" });
      } else if (data) {
        applySettings(data as unknown as POSSettingsRecord);
      }
    };
    void loadSettings();
  }, [user?.id]);

  const parsePercentage = (label: string, raw: string) => {
    if (raw.trim() === "") throw new Error(`${label} is required.`);
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`${label} must be a number between 0 and 100.`);
    }
    return value;
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    setFieldError(null);
    try {
      const settings = {
        user_id: user.id,
        auto_print_receipts: autoPrint,
        tips_enabled: enableTips,
        sound_notifications: soundNotifications,
        email_receipts: emailReceipts,
        default_tip_percentage: parsePercentage("Default tip", defaultTip),
        receipt_footer: receiptFooter,
        vat_nhil_enabled: enableVatNhil,
        vat_rate: parsePercentage("VAT rate", vatRate),
        nhil_rate: parsePercentage("NHIL rate", nhilRate),
        service_charge_enabled: enableServiceCharge,
        service_charge_rate: parsePercentage("Service charge", serviceChargeRate),
      };
      const { error } = await supabase
        .from("pos_settings" as never)
        .upsert(settings as never, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Success", description: "POS settings saved successfully" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save POS settings.";
      setFieldError(message);
      toast({ title: "Invalid POS settings", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAutoPrint(true);
    setEnableTips(true);
    setSoundNotifications(true);
    setEmailReceipts(false);
    setDefaultTip("15");
    setReceiptFooter("thankyou");
    setEnableVatNhil(true);
    setVatRate("12.5");
    setNhilRate("2.5");
    setEnableServiceCharge(false);
    setServiceChargeRate("10");
    setFieldError(null);
    
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults",
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">POS Configuration</CardTitle>
        <CardDescription>Customize your point of sale system settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* General Settings - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
            <Label className="text-sm font-medium">Auto-print receipts</Label>
            <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
            <Label className="text-sm font-medium">Enable tips</Label>
            <Switch checked={enableTips} onCheckedChange={setEnableTips} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
            <Label className="text-sm font-medium">Sound notifications</Label>
            <Switch checked={soundNotifications} onCheckedChange={setSoundNotifications} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
            <Label className="text-sm font-medium">Email receipts</Label>
            <Switch checked={emailReceipts} onCheckedChange={setEmailReceipts} />
          </div>
        </div>

        {/* Defaults - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="defaultTip" className="text-sm">Default Tip</Label>
            <Select value={defaultTip} onValueChange={setDefaultTip}>
              <SelectTrigger id="defaultTip" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="15">15%</SelectItem>
                <SelectItem value="18">18%</SelectItem>
                <SelectItem value="20">20%</SelectItem>
                <SelectItem value="25">25%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptFooter" className="text-sm">Receipt Footer</Label>
            <Select value={receiptFooter} onValueChange={setReceiptFooter}>
              <SelectTrigger id="receiptFooter" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thankyou">Thank you!</SelectItem>
                <SelectItem value="visit">Visit again!</SelectItem>
                <SelectItem value="custom">Come back!</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tax & Service Charges Section */}
        <div className="space-y-4 pt-2 border-t border-border">
          <h3 className="text-base font-semibold text-foreground">Tax & Service Charges</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
              <Label className="text-sm font-medium">VAT/NHIL (Ghana)</Label>
              <Switch checked={enableVatNhil} onCheckedChange={setEnableVatNhil} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 md:pl-3">
              <div className="space-y-1.5">
                <Label htmlFor="vat" className="text-xs text-muted-foreground">VAT Rate (%)</Label>
                <Input 
                  id="vat" 
                  type="number" 
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  step="0.1"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nhil" className="text-xs text-muted-foreground">NHIL Rate (%)</Label>
                <Input 
                  id="nhil" 
                  type="number" 
                  value={nhilRate}
                  onChange={(e) => setNhilRate(e.target.value)}
                  step="0.1"
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
              <Label className="text-sm font-medium">Service Charge</Label>
              <Switch checked={enableServiceCharge} onCheckedChange={setEnableServiceCharge} />
            </div>

            <div className="pl-0 md:pl-3">
              <div className="space-y-1.5">
                <Label htmlFor="service" className="text-xs text-muted-foreground">Service Charge (%)</Label>
                <Input 
                  id="service" 
                  type="number" 
                  value={serviceChargeRate}
                  onChange={(e) => setServiceChargeRate(e.target.value)}
                  step="0.1"
                  className="h-9 w-full md:max-w-[200px]"
                />
              </div>
            </div>

          </div>
        </div>

        {fieldError && <p role="alert" className="text-sm text-destructive">{fieldError}</p>}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleReset} className="h-9 w-full sm:w-auto">Reset</Button>
          <Button onClick={handleSave} disabled={loading} className="h-9 w-full sm:w-auto">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

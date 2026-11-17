import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DepositSettingsData {
  require_deposit: boolean;
  deposit_type: string;
  deposit_amount: number;
}

export const DepositSettings = () => {
  const { user } = useBusiness();
  const { currencySymbol, format: formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DepositSettingsData>({
    require_deposit: false,
    deposit_type: "percentage",
    deposit_amount: 50,
  });

  useEffect(() => {
    if (user?.id) fetchSettings();
  }, [user?.id]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("invoice_deposit_settings")
      .select("*")
      .eq("user_id", user!.id)
      .single();

    if (data) {
      setSettings({
        require_deposit: data.require_deposit,
        deposit_type: data.deposit_type,
        deposit_amount: data.deposit_amount,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from("invoice_deposit_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        await supabase
          .from("invoice_deposit_settings")
          .update(settings)
          .eq("user_id", user.id);
      } else {
        await supabase.from("invoice_deposit_settings").insert({
          user_id: user.id,
          ...settings,
        });
      }

      toast({ title: "Settings saved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Deposit Settings
        </CardTitle>
        <CardDescription>
          Configure default deposit requirements for new invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Require Deposit by Default</Label>
            <p className="text-sm text-muted-foreground">
              Automatically require deposits on new invoices
            </p>
          </div>
          <Switch
            checked={settings.require_deposit}
            onCheckedChange={(checked) => setSettings({ ...settings, require_deposit: checked })}
          />
        </div>

        {settings.require_deposit && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deposit Type</Label>
                <Select
                  value={settings.deposit_type}
                  onValueChange={(v) => setSettings({ ...settings, deposit_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage of Invoice</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Amount {settings.deposit_type === "percentage" ? "(%)" : `(${currencySymbol})`}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={settings.deposit_type === "percentage" ? "100" : undefined}
                  step={settings.deposit_type === "percentage" ? "5" : "0.01"}
                  value={settings.deposit_amount}
                  onChange={(e) => setSettings({ ...settings, deposit_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Example:</strong> For a {formatCurrency(1000)} invoice, the required deposit will be{" "}
                <strong>
                  {settings.deposit_type === "percentage"
                    ? formatCurrency((1000 * settings.deposit_amount) / 100)
                    : formatCurrency(settings.deposit_amount)}
                </strong>
              </p>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

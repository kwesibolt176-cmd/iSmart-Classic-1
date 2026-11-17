import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LateFeeSettingsData {
  enabled: boolean;
  fee_type: string;
  fee_amount: number;
  grace_period_days: number;
  max_fee_amount: number | null;
  apply_automatically: boolean;
}

export const LateFeeSettings = () => {
  const { user, profile } = useBusiness();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LateFeeSettingsData>({
    enabled: false,
    fee_type: "percentage",
    fee_amount: 5,
    grace_period_days: 0,
    max_fee_amount: null,
    apply_automatically: true,
  });

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = { 'GHS': 'GH₵', 'USD': 'USD', 'EUR': '€', 'GBP': '£' };
    return symbols[code] || code;
  };
  const currency = getCurrencySymbol(profile?.currency || "GHS");

  useEffect(() => {
    if (user?.id) fetchSettings();
  }, [user?.id]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("invoice_late_fee_settings")
      .select("*")
      .eq("user_id", user!.id)
      .single();

    if (data) {
      setSettings({
        enabled: data.enabled,
        fee_type: data.fee_type,
        fee_amount: data.fee_amount,
        grace_period_days: data.grace_period_days,
        max_fee_amount: data.max_fee_amount,
        apply_automatically: data.apply_automatically,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from("invoice_late_fee_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        await supabase
          .from("invoice_late_fee_settings")
          .update(settings)
          .eq("user_id", user.id);
      } else {
        await supabase.from("invoice_late_fee_settings").insert({
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
          <AlertTriangle className="h-5 w-5" />
          Late Fee Settings
        </CardTitle>
        <CardDescription>
          Configure automatic late fees for overdue invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Late Fees</Label>
            <p className="text-sm text-muted-foreground">
              Automatically apply late fees to overdue invoices
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </div>

        {settings.enabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee Type</Label>
                <Select
                  value={settings.fee_type}
                  onValueChange={(v) => setSettings({ ...settings, fee_type: v })}
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
                  Fee Amount {settings.fee_type === "percentage" ? "(%)" : `(${currency})`}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step={settings.fee_type === "percentage" ? "0.5" : "0.01"}
                  value={settings.fee_amount}
                  onChange={(e) => setSettings({ ...settings, fee_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grace Period (days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={settings.grace_period_days}
                  onChange={(e) => setSettings({ ...settings, grace_period_days: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Days after due date before late fee applies
                </p>
              </div>
              <div className="space-y-2">
                <Label>Maximum Fee ({currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  value={settings.max_fee_amount || ""}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    max_fee_amount: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Cap on late fees (leave empty for no limit)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Apply Automatically</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically add late fees without manual approval
                </p>
              </div>
              <Switch
                checked={settings.apply_automatically}
                onCheckedChange={(checked) => setSettings({ ...settings, apply_automatically: checked })}
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Example:</strong> A {currency} 1,000 invoice that is 10 days overdue
                {settings.grace_period_days > 0 && ` (after ${settings.grace_period_days} day grace period)`} 
                will incur a late fee of{" "}
                <strong>
                  {currency}{" "}
                  {settings.fee_type === "percentage"
                    ? ((1000 * settings.fee_amount) / 100).toFixed(2)
                    : settings.fee_amount.toFixed(2)}
                </strong>
                {settings.max_fee_amount && ` (max ${currency} ${settings.max_fee_amount.toFixed(2)})`}
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

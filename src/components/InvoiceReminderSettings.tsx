import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Bell, Save } from "lucide-react";

export const InvoiceReminderSettings = () => {
  const { user } = useBusiness();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    days_before_due: 3,
    days_after_due: [1, 7, 14],
    send_email: true,
    send_sms: false,
  });

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('invoice_reminder_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          enabled: data.enabled,
          days_before_due: data.days_before_due,
          days_after_due: data.days_after_due,
          send_email: data.send_email,
          send_sms: data.send_sms,
        });
      }
    } catch (error: any) {
      console.error('Error fetching reminder settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('invoice_reminder_settings')
        .upsert({
          user_id: user.id,
          enabled: settings.enabled,
          days_before_due: settings.days_before_due,
          days_after_due: settings.days_after_due,
          send_email: settings.send_email,
          send_sms: settings.send_sms,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminder settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDaysAfterDue = (index: number, value: string) => {
    const newDays = [...settings.days_after_due];
    newDays[index] = parseInt(value) || 0;
    setSettings({ ...settings, days_after_due: newDays });
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
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg sm:text-xl">Invoice Reminder Settings</CardTitle>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Configure automatic payment reminders for unpaid invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="enabled" className="text-sm sm:text-base">Enable Automatic Reminders</Label>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Automatically send payment reminders to customers
            </p>
          </div>
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            className="self-start sm:self-auto"
          />
        </div>

        {settings.enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="daysBefore">Days Before Due Date</Label>
              <Input
                id="daysBefore"
                type="number"
                min="0"
                max="30"
                value={settings.days_before_due}
                onChange={(e) => setSettings({ ...settings, days_before_due: parseInt(e.target.value) || 0 })}
              />
              <p className="text-sm text-muted-foreground">
                Send a reminder this many days before the invoice is due
              </p>
            </div>

            <div className="space-y-2">
              <Label>Days After Due Date</Label>
              <div className="grid grid-cols-3 gap-2">
                {settings.days_after_due.map((days, index) => (
                  <Input
                    key={index}
                    type="number"
                    min="0"
                    max="90"
                    value={days}
                    onChange={(e) => updateDaysAfterDue(index, e.target.value)}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Send reminders at these intervals after the due date passes
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-sm sm:text-base">Notification Methods</Label>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="sendEmail" className="text-sm">Email Reminders</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Send reminders via email
                  </p>
                </div>
                <Switch
                  id="sendEmail"
                  checked={settings.send_email}
                  onCheckedChange={(checked) => setSettings({ ...settings, send_email: checked })}
                  className="self-start sm:self-auto"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="sendSMS" className="text-sm">SMS Reminders</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Send reminders via SMS (requires customer phone)
                  </p>
                </div>
                <Switch
                  id="sendSMS"
                  checked={settings.send_sms}
                  onCheckedChange={(checked) => setSettings({ ...settings, send_sms: checked })}
                  className="self-start sm:self-auto"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

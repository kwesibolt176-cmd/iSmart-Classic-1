import { useState, useEffect } from "react";
import { Settings, Save, Database, Server, Mail, MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SystemSettings {
  maintenanceMode: boolean;
  signupsEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  maxUsersPerBusiness: string;
  sessionTimeout: string;
  apiRateLimit: string;
}

export const SystemSettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    signupsEnabled: true,
    emailNotifications: true,
    smsNotifications: true,
    maxUsersPerBusiness: "50",
    sessionTimeout: "30",
    apiRateLimit: "1000",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      if (data && data.length > 0) {
        const newSettings = { ...settings };
        data.forEach((row) => {
          const value = row.setting_value as { enabled?: boolean; max_users_per_business?: number; session_timeout?: number; api_rate_limit?: number };
          switch (row.setting_key) {
            case "maintenance_mode":
              newSettings.maintenanceMode = value.enabled || false;
              break;
            case "signups_enabled":
              newSettings.signupsEnabled = value.enabled !== false;
              break;
            case "email_notifications":
              newSettings.emailNotifications = value.enabled !== false;
              break;
            case "sms_notifications":
              newSettings.smsNotifications = value.enabled !== false;
              break;
            case "limits":
              newSettings.maxUsersPerBusiness = String(value.max_users_per_business || 50);
              newSettings.sessionTimeout = String(value.session_timeout || 30);
              newSettings.apiRateLimit = String(value.api_rate_limit || 1000);
              break;
          }
        });
        setSettings(newSettings);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates = [
        {
          setting_key: "maintenance_mode",
          setting_value: { enabled: settings.maintenanceMode },
          updated_by: user?.id,
        },
        {
          setting_key: "signups_enabled",
          setting_value: { enabled: settings.signupsEnabled },
          updated_by: user?.id,
        },
        {
          setting_key: "email_notifications",
          setting_value: { enabled: settings.emailNotifications },
          updated_by: user?.id,
        },
        {
          setting_key: "sms_notifications",
          setting_value: { enabled: settings.smsNotifications },
          updated_by: user?.id,
        },
        {
          setting_key: "limits",
          setting_value: {
            max_users_per_business: parseInt(settings.maxUsersPerBusiness) || 50,
            session_timeout: parseInt(settings.sessionTimeout) || 30,
            api_rate_limit: parseInt(settings.apiRateLimit) || 1000,
          },
          updated_by: user?.id,
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(update, { onConflict: "setting_key" });

        if (error) throw error;
      }

      // Log the action
      if (user) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action_type: "update_system_settings",
          entity_type: "system_settings",
          new_data: settings,
        } as never);
      }

      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Configuration
          </CardTitle>
          <CardDescription>
            Manage platform-wide system settings and configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Server className="w-4 h-4" />
              General Settings
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable access for maintenance
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, maintenanceMode: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow New Signups</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable new business registrations
                </p>
              </div>
              <Switch
                checked={settings.signupsEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, signupsEnabled: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Communication Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Communication Settings
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable system email notifications
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, emailNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  SMS Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable system SMS notifications
                </p>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, smsNotifications: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Limits & Performance */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="w-4 h-4" />
              Limits & Performance
            </h3>

            <div className="space-y-2">
              <Label>Max Users Per Business</Label>
              <Input
                type="number"
                value={settings.maxUsersPerBusiness}
                onChange={(e) =>
                  setSettings({ ...settings, maxUsersPerBusiness: e.target.value })
                }
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of staff users per business account
              </p>
            </div>

            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) =>
                  setSettings({ ...settings, sessionTimeout: e.target.value })
                }
              />
              <p className="text-sm text-muted-foreground">
                Automatic logout after inactivity period
              </p>
            </div>

            <div className="space-y-2">
              <Label>API Rate Limit (requests/hour)</Label>
              <Input
                type="number"
                value={settings.apiRateLimit}
                onChange={(e) =>
                  setSettings({ ...settings, apiRateLimit: e.target.value })
                }
              />
              <p className="text-sm text-muted-foreground">
                Maximum API requests per business per hour
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, MessageSquare, AlertTriangle, Megaphone, CheckCircle, Settings } from "lucide-react";
import { toast } from "sonner";

interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  priority: "low" | "medium" | "high" | "critical";
}

interface NotificationRule {
  id: string;
  event: string;
  description: string;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  slack: boolean;
}

export const NotificationSettingsTab = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([
    { id: "email", name: "Email Notifications", description: "Send notifications via email", icon: Mail, enabled: true, priority: "medium" },
    { id: "sms", name: "SMS Notifications", description: "Send critical alerts via SMS", icon: MessageSquare, enabled: true, priority: "high" },
    { id: "inapp", name: "In-App Notifications", description: "Show notifications in the admin panel", icon: Bell, enabled: true, priority: "low" },
    { id: "slack", name: "Slack Integration", description: "Post notifications to Slack channels", icon: Megaphone, enabled: false, priority: "medium" },
  ]);

  const [rules, setRules] = useState<NotificationRule[]>([
    { id: "new_signup", event: "New Business Signup", description: "When a new business registers", email: true, sms: false, inApp: true, slack: true },
    { id: "subscription", event: "Subscription Changes", description: "Upgrades, downgrades, cancellations", email: true, sms: false, inApp: true, slack: true },
    { id: "fraud_alert", event: "Fraud Alerts", description: "Suspicious activity detected", email: true, sms: true, inApp: true, slack: true },
    { id: "payment_failed", event: "Payment Failures", description: "Failed subscription payments", email: true, sms: false, inApp: true, slack: false },
    { id: "support_ticket", event: "Support Tickets", description: "New or escalated support tickets", email: true, sms: false, inApp: true, slack: true },
    { id: "system_alert", event: "System Alerts", description: "Server issues, high load, errors", email: true, sms: true, inApp: true, slack: true },
    { id: "low_credits", event: "Low Credits Warning", description: "Business running low on credits", email: true, sms: false, inApp: true, slack: false },
  ]);

  const [slackWebhook, setSlackWebhook] = useState("");
  const [adminEmails, setAdminEmails] = useState("admin@ismartghana.com");
  const [saving, setSaving] = useState(false);

  const toggleChannel = (channelId: string) => {
    setChannels(prev =>
      prev.map(ch => (ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch))
    );
  };

  const toggleRule = (ruleId: string, field: "email" | "sms" | "inApp" | "slack") => {
    setRules(prev =>
      prev.map(rule => (rule.id === ruleId ? { ...rule, [field]: !rule[field] } : rule))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Notification settings saved");
    setSaving(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Notification Settings</h2>
        <p className="text-muted-foreground">Configure how and when platform notifications are sent</p>
      </div>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>Enable or disable notification delivery methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    channel.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{channel.name}</p>
                      <Badge variant="outline" className={getPriorityColor(channel.priority)}>
                        {channel.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{channel.description}</p>
                  </div>
                </div>
                <Switch
                  checked={channel.enabled}
                  onCheckedChange={() => toggleChannel(channel.id)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Notification Rules Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Rules
          </CardTitle>
          <CardDescription>Configure which events trigger notifications on each channel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Event</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Email</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">SMS</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">In-App</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Slack</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b last:border-0">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium">{rule.event}</p>
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Switch
                        checked={rule.email}
                        onCheckedChange={() => toggleRule(rule.id, "email")}
                        disabled={!channels.find(c => c.id === "email")?.enabled}
                      />
                    </td>
                    <td className="text-center py-3 px-2">
                      <Switch
                        checked={rule.sms}
                        onCheckedChange={() => toggleRule(rule.id, "sms")}
                        disabled={!channels.find(c => c.id === "sms")?.enabled}
                      />
                    </td>
                    <td className="text-center py-3 px-2">
                      <Switch
                        checked={rule.inApp}
                        onCheckedChange={() => toggleRule(rule.id, "inApp")}
                        disabled={!channels.find(c => c.id === "inapp")?.enabled}
                      />
                    </td>
                    <td className="text-center py-3 px-2">
                      <Switch
                        checked={rule.slack}
                        onCheckedChange={() => toggleRule(rule.id, "slack")}
                        disabled={!channels.find(c => c.id === "slack")?.enabled}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Settings</CardTitle>
          <CardDescription>Configure external notification integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Admin Email Recipients</Label>
            <Input
              value={adminEmails}
              onChange={(e) => setAdminEmails(e.target.value)}
              placeholder="admin@example.com, team@example.com"
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of admin email addresses</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Slack Webhook URL</Label>
            <Input
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              type="password"
            />
            <p className="text-xs text-muted-foreground">Enter your Slack incoming webhook URL for notifications</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <CheckCircle className="w-4 h-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

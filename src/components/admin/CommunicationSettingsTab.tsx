import { useState, useEffect } from "react";
import { 
  Mail, 
  MessageSquare, 
  Save, 
  Loader2, 
  Settings, 
  Zap,
  History,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ChannelSettings {
  enabled: boolean;
  from_name?: string;
  from_email?: string;
}

interface CommunicationLog {
  id: string;
  channel: string;
  recipient: string;
  subject: string | null;
  content: string;
  status: string;
  error_message: string | null;
  created_at: string;
  metadata: any;
}

export const CommunicationSettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [autoExecute, setAutoExecute] = useState(false);
  const [emailChannel, setEmailChannel] = useState<ChannelSettings>({
    enabled: true,
    from_name: "Business System",
    from_email: "onboarding@resend.dev",
  });
  const [smsChannel, setSmsChannel] = useState<ChannelSettings>({
    enabled: true,
  });

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [channelFilter, statusFilter]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["communication_auto_execute", "email_channel", "sms_channel"]);

      if (error) throw error;

      data?.forEach((row) => {
        const value = row.setting_value as any;
        switch (row.setting_key) {
          case "communication_auto_execute":
            setAutoExecute(value.enabled || false);
            break;
          case "email_channel":
            setEmailChannel({
              enabled: value.enabled !== false,
              from_name: value.from_name || "Business System",
              from_email: value.from_email || "onboarding@resend.dev",
            });
            break;
          case "sms_channel":
            setSmsChannel({
              enabled: value.enabled !== false,
            });
            break;
        }
      });
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load communication settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      let query = supabase
        .from("communication_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (channelFilter !== "all") {
        query = query.eq("channel", channelFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updates = [
        {
          setting_key: "communication_auto_execute",
          setting_value: { enabled: autoExecute } as any,
          description: "Auto-execute communications without approval",
          updated_by: user?.id,
        },
        {
          setting_key: "email_channel",
          setting_value: emailChannel as any,
          description: "Email channel configuration",
          updated_by: user?.id,
        },
        {
          setting_key: "sms_channel",
          setting_value: smsChannel as any,
          description: "SMS channel configuration",
          updated_by: user?.id,
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(update as any, { onConflict: "setting_key" });

        if (error) throw error;
      }

      // Log the action
      if (user) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action_type: "update_communication_settings",
          entity_type: "system_settings",
          new_data: { autoExecute, emailChannel, smsChannel },
        } as never);
      }

      toast({
        title: "Settings Saved",
        description: "Communication settings have been updated",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Sent</Badge>;
      case "failed":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    return channel === "email" ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
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
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Communication Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* Auto-Execute Setting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Execution Mode
              </CardTitle>
              <CardDescription>
                Control how communications are processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Auto-Execute Communications</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, emails and SMS will be sent immediately without requiring manual approval.
                    When disabled, all communications will queue for super admin review.
                  </p>
                </div>
                <Switch
                  checked={autoExecute}
                  onCheckedChange={setAutoExecute}
                />
              </div>

              <div className={`p-4 rounded-lg ${autoExecute ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'} border`}>
                <p className="text-sm font-medium">
                  {autoExecute ? (
                    <span className="text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Communications will be sent automatically
                    </span>
                  ) : (
                    <span className="text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> All communications require manual approval before sending
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Email Channel Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Email Channel
              </CardTitle>
              <CardDescription>
                Configure email notifications and sender details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Channel</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow sending emails through the system
                  </p>
                </div>
                <Switch
                  checked={emailChannel.enabled}
                  onCheckedChange={(checked) =>
                    setEmailChannel({ ...emailChannel, enabled: checked })
                  }
                />
              </div>

              {emailChannel.enabled && (
                <>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Sender Name</Label>
                      <Input
                        value={emailChannel.from_name || ""}
                        onChange={(e) =>
                          setEmailChannel({ ...emailChannel, from_name: e.target.value })
                        }
                        placeholder="Business System"
                      />
                      <p className="text-xs text-muted-foreground">
                        Name shown in the "From" field
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Sender Email</Label>
                      <Input
                        value={emailChannel.from_email || ""}
                        onChange={(e) =>
                          setEmailChannel({ ...emailChannel, from_email: e.target.value })
                        }
                        placeholder="onboarding@resend.dev"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be a verified domain in Resend
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* SMS/WhatsApp Channel Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                SMS & WhatsApp Channel
              </CardTitle>
              <CardDescription>
                Configure SMS and WhatsApp notifications via Zend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable SMS & WhatsApp Channel</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow sending SMS and WhatsApp messages through Zend
                  </p>
                </div>
                <Switch
                  checked={smsChannel.enabled}
                  onCheckedChange={(checked) =>
                    setSmsChannel({ ...smsChannel, enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Communication Logs
                  </CardTitle>
                  <CardDescription>
                    Track all sent emails and SMS messages
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={channelFilter} onValueChange={setChannelFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchLogs}>
                    <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No communication logs found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getChannelIcon(log.channel)}
                              <span className="capitalize">{log.channel}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm max-w-[200px] truncate">
                            {log.recipient}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.subject || "-"}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                            {log.error_message && (
                              <p className="text-xs text-destructive mt-1 max-w-[200px] truncate">
                                {log.error_message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
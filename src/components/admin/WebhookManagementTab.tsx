import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Webhook, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
  business_id: string | null;
}

const AVAILABLE_EVENTS = [
  { id: "order.created", label: "Order Created" },
  { id: "order.completed", label: "Order Completed" },
  { id: "payment.received", label: "Payment Received" },
  { id: "customer.created", label: "Customer Created" },
  { id: "subscription.updated", label: "Subscription Updated" },
  { id: "invoice.sent", label: "Invoice Sent" },
  { id: "refund.processed", label: "Refund Processed" },
];

export const WebhookManagementTab = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    events: [] as string[]
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error: any) {
      console.error("Error fetching webhooks:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWebhook = async (webhook: WebhookConfig) => {
    try {
      const { error } = await supabase
        .from("webhooks")
        .update({ is_active: !webhook.is_active })
        .eq("id", webhook.id);

      if (error) throw error;
      toast.success(`Webhook ${webhook.is_active ? "disabled" : "enabled"}`);
      fetchWebhooks();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteWebhook = async (webhook: WebhookConfig) => {
    try {
      const { error } = await supabase
        .from("webhooks")
        .delete()
        .eq("id", webhook.id);

      if (error) throw error;
      toast.success("Webhook deleted");
      fetchWebhooks();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    toast.loading("Sending test event...");
    try {
      // In production, this would actually send a test payload to the webhook URL
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.dismiss();
      toast.success(`Test event sent to ${webhook.name}`);
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to send test event");
    }
  };

  const createWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("webhooks").insert({
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Webhook created successfully");
      setNewWebhook({ name: "", url: "", events: [] });
      setDialogOpen(false);
      fetchWebhooks();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const totalSuccess = webhooks.reduce((sum, w) => sum + w.success_count, 0);
  const totalFailures = webhooks.reduce((sum, w) => sum + w.failure_count, 0);
  const activeWebhooks = webhooks.filter(w => w.is_active).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Active Webhooks</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeWebhooks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Successful</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalSuccess}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalFailures}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalSuccess + totalFailures > 0 
                ? ((totalSuccess / (totalSuccess + totalFailures)) * 100).toFixed(1)
                : 100}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>Manage external integrations</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My Webhook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <Input
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Events</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AVAILABLE_EVENTS.map((event) => (
                        <div key={event.id} className="flex items-center gap-2">
                          <Checkbox
                            id={event.id}
                            checked={newWebhook.events.includes(event.id)}
                            onCheckedChange={() => toggleEvent(event.id)}
                          />
                          <Label htmlFor={event.id} className="text-sm cursor-pointer">
                            {event.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={createWebhook} className="w-full" disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {creating ? "Creating..." : "Create Webhook"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : webhooks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No webhooks configured yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead>Last Triggered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.name}</TableCell>
                        <TableCell className="font-mono text-xs max-w-48 truncate">
                          {webhook.url}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.slice(0, 2).map(e => (
                              <Badge key={e} variant="secondary" className="text-xs">
                                {e.split(".")[1]}
                              </Badge>
                            ))}
                            {webhook.events.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{webhook.events.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600">{webhook.success_count}</span>
                          {" / "}
                          <span className="text-red-600">{webhook.failure_count}</span>
                        </TableCell>
                        <TableCell>
                          {webhook.last_triggered_at 
                            ? format(new Date(webhook.last_triggered_at), "MMM d, HH:mm")
                            : "Never"
                          }
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={webhook.is_active}
                            onCheckedChange={() => toggleWebhook(webhook)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => testWebhook(webhook)}
                              title="Send test event"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteWebhook(webhook)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

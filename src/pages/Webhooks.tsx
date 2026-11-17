import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { Webhook, Plus, Copy, RefreshCw, CheckCircle, XCircle, Clock, MoreVertical, Eye, EyeOff, Trash2, Settings } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldCheck, Activity, Globe } from "lucide-react";

interface WebhookEndpoint {
  id: string;
  url: string;
  name: string;
  secret: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: unknown;
  response_status: number | null;
  status: string;
  created_at: string;
}

const WEBHOOK_EVENTS = [
  { id: 'collection.completed', label: 'Collection Completed', description: 'When a payment is successfully collected' },
  { id: 'collection.failed', label: 'Collection Failed', description: 'When a collection attempt fails' },
  { id: 'disbursement.completed', label: 'Disbursement Completed', description: 'When a payout is successfully sent' },
  { id: 'disbursement.failed', label: 'Disbursement Failed', description: 'When a payout fails' },
  { id: 'wallet.credited', label: 'Wallet Credited', description: 'When funds are added to wallet' },
  { id: 'wallet.debited', label: 'Wallet Debited', description: 'When funds are withdrawn from wallet' },
];

export const Webhooks = () => {
  const { profile } = useBusiness();
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    events: [] as string[],
  });

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    try {
      const [webhooksRes, deliveriesRes] = await Promise.all([
        supabase
          .from('webhook_endpoints')
          .select('*')
          .eq('business_id', profile?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('webhook_deliveries')
          .select('*')
          .in('webhook_id', webhooks.map(w => w.id))
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (webhooksRes.error) throw webhooksRes.error;
      setWebhooks(webhooksRes.data || []);
      
      if (!deliveriesRes.error) {
        setDeliveries(deliveriesRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!newWebhook.url.startsWith('https://')) {
      toast.error("Webhook URL must use HTTPS");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .insert({
          business_id: profile?.id,
          name: newWebhook.name,
          url: newWebhook.url,
          events: newWebhook.events,
        });

      if (error) throw error;

      toast.success("Webhook created successfully");
      setCreateDialogOpen(false);
      setNewWebhook({ name: "", url: "", events: [] });
      fetchData();
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast.error("Failed to create webhook");
    } finally {
      setCreating(false);
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      await supabase
        .from('webhook_endpoints')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      toast.success(isActive ? "Webhook disabled" : "Webhook enabled");
      fetchData();
    } catch (error) {
      toast.error("Failed to update webhook");
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', id);
      
      toast.success("Webhook deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete webhook");
    }
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      delivered: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    };
    const { variant, icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1 capitalize">
        {icon}
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Webhooks"
        description="Receive real-time notifications for payment events"
        rightContent={<Globe className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-colors shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endpoints</p>
                  <p className="text-2xl font-bold text-foreground">{webhooks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-green-500/20 transition-colors shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {webhooks.filter(w => w.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-blue-500/20 transition-colors shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deliveries</p>
                  <p className="text-2xl font-bold text-foreground">{deliveries.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-purple-500/20 transition-colors shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Success Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {deliveries.length > 0
                      ? Math.round((deliveries.filter(d => d.status === 'delivered').length / deliveries.length) * 100)
                      : 100}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="endpoints">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="endpoints" className="gap-2 flex-1 sm:flex-none">
                <Settings className="h-4 w-4" />
                Endpoints
              </TabsTrigger>
              <TabsTrigger value="deliveries" className="gap-2 flex-1 sm:flex-none">
                <Webhook className="h-4 w-4" />
                Deliveries
              </TabsTrigger>
            </TabsList>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Webhook Endpoint</DialogTitle>
                  <DialogDescription>
                    Configure a URL to receive event notifications
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="e.g., Production Server"
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint URL *</Label>
                    <Input
                      placeholder="https://your-server.com/webhook"
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Must use HTTPS</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Events to subscribe *</Label>
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {WEBHOOK_EVENTS.map((event) => (
                        <div key={event.id} className="flex items-start space-x-3 p-2 rounded border">
                          <Checkbox
                            id={event.id}
                            checked={newWebhook.events.includes(event.id)}
                            onCheckedChange={(checked) => {
                              setNewWebhook({
                                ...newWebhook,
                                events: checked
                                  ? [...newWebhook.events, event.id]
                                  : newWebhook.events.filter(e => e !== event.id)
                              });
                            }}
                          />
                          <div className="flex-1">
                            <label htmlFor={event.id} className="text-sm font-medium cursor-pointer">
                              {event.label}
                            </label>
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWebhook} disabled={creating} className="w-full sm:w-auto">
                    {creating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                    Create Webhook
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="endpoints">
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id} className={!webhook.is_active ? "opacity-60" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{webhook.name}</h3>
                          <Badge variant={webhook.is_active ? "default" : "secondary"}>
                            {webhook.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {webhook.failure_count > 0 && (
                            <Badge variant="destructive">{webhook.failure_count} failures</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{webhook.url}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-muted rounded px-2 py-1">
                          <code className="text-xs">
                            {showSecret === webhook.id 
                              ? webhook.secret 
                              : '••••••••••••••••'
                            }
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowSecret(showSecret === webhook.id ? null : webhook.id)}
                          >
                            {showSecret === webhook.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copySecret(webhook.secret)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleWebhook(webhook.id, webhook.is_active)}>
                              {webhook.is_active ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteWebhook(webhook.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {webhooks.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">No webhook endpoints configured</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      Add Your First Webhook
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deliveries">
            <Card>
              <CardContent className="pt-6">
                {deliveries.length > 0 ? (
                  <div className="space-y-3">
                    {deliveries.map((delivery) => (
                      <div key={delivery.id} className="flex items-center justify-between p-3 rounded-lg border gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`p-2 rounded-full ${delivery.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                            {delivery.status === 'delivered' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{delivery.event_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(delivery.created_at), 'MMM d, HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {delivery.response_status && (
                            <Badge variant="outline">{delivery.response_status}</Badge>
                          )}
                          {getStatusBadge(delivery.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No webhook deliveries yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Webhooks;

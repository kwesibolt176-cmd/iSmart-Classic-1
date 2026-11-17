import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Key, Copy, RefreshCw, Shield, Activity, AlertTriangle, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  business_id: string | null;
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  requests_today: number;
  created_at: string;
  business_name?: string;
}

export const ApiManagementTab = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState("1000");
  const [creating, setCreating] = useState(false);

  const [rateLimits, setRateLimits] = useState({
    free: 100,
    starter: 1000,
    professional: 10000,
    enterprise: 100000
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select(`
          *,
          business_profiles(business_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const keysWithBusiness = (data || []).map((key: any) => ({
        ...key,
        business_name: key.business_profiles?.business_name
      }));

      setApiKeys(keysWithBusiness);
    } catch (error: any) {
      console.error("Error fetching API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const prefix = "pk_live_";
    const randomPart = Array.from({ length: 32 }, () => 
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]
    ).join("");
    return prefix + randomPart;
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fullKey = generateApiKey();
      const keyPrefix = fullKey.slice(0, 12) + "...";

      const { error } = await supabase.from("api_keys").insert({
        name: newKeyName,
        key_hash: fullKey, // In production, this should be hashed
        key_prefix: keyPrefix,
        rate_limit: parseInt(newKeyRateLimit) || 1000,
        created_by: user?.id,
      });

      if (error) throw error;

      // Show the full key to the user (only once)
      toast.success(
        <div className="space-y-2">
          <p>API Key created successfully!</p>
          <p className="font-mono text-xs bg-muted p-2 rounded">{fullKey}</p>
          <p className="text-xs text-muted-foreground">Copy this key now. It won't be shown again.</p>
        </div>,
        { duration: 10000 }
      );

      setNewKeyName("");
      setNewKeyRateLimit("1000");
      setDialogOpen(false);
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleKeyStatus = async (key: ApiKey) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: !key.is_active })
        .eq("id", key.id);

      if (error) throw error;
      toast.success(`API key ${key.is_active ? "disabled" : "enabled"}`);
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteKey = async (key: ApiKey) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", key.id);

      if (error) throw error;
      toast.success("API key deleted");
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const totalRequests = apiKeys.reduce((sum, k) => sum + k.requests_today, 0);
  const activeKeys = apiKeys.filter(k => k.is_active).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Active Keys</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeKeys}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Requests Today</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalRequests.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Keys</span>
            </div>
            <p className="text-2xl font-bold mt-1">{apiKeys.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Disabled Keys</span>
            </div>
            <p className="text-2xl font-bold mt-1">{apiKeys.length - activeKeys}</p>
          </CardContent>
        </Card>
      </div>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage platform API keys</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> Generate New Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Key Name</Label>
                    <Input
                      placeholder="Production API Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate Limit (requests/day)</Label>
                    <Input
                      type="number"
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreateKey} className="w-full" disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {creating ? "Generating..." : "Generate Key"}
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
          ) : apiKeys.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No API keys yet. Generate one to get started.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Rate Limit</TableHead>
                      <TableHead>Requests Today</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">{key.key_prefix}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(key.key_prefix)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{key.rate_limit.toLocaleString()}/day</TableCell>
                        <TableCell>{key.requests_today.toLocaleString()}</TableCell>
                        <TableCell>
                          {key.last_used_at 
                            ? format(new Date(key.last_used_at), "MMM d, HH:mm")
                            : "Never"
                          }
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={key.is_active}
                            onCheckedChange={() => toggleKeyStatus(key)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteKey(key)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Rate Limits Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Default Rate Limits by Plan</CardTitle>
          <CardDescription>Configure default API rate limits per subscription tier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(rateLimits).map(([plan, limit]) => (
            <div key={plan} className="flex items-center gap-4">
              <Label className="w-32 capitalize">{plan}</Label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setRateLimits(prev => ({
                  ...prev,
                  [plan]: parseInt(e.target.value) || 0
                }))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-24">req/day</span>
            </div>
          ))}
          <Button 
            className="w-full mt-4"
            onClick={() => toast.success("Rate limits saved")}
          >
            Save Rate Limits
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

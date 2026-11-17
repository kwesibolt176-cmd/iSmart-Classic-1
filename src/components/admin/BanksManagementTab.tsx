import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Plus, Key, Activity, Settings, Trash2, Edit, Check, X, ExternalLink, RefreshCw, Shield } from "lucide-react";
import { format } from "date-fns";

interface Bank {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  provider_type: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  api_endpoint: string | null;
  supported_features: string[];
  supported_countries: string[];
  documentation_url: string | null;
  contact_email: string | null;
  is_globally_enabled: boolean;
  created_at: string;
}

interface IntegrationLog {
  id: string;
  bank_id: string | null;
  business_id: string | null;
  action: string;
  endpoint: string | null;
  request_method: string | null;
  response_status: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

const SUPPORTED_FEATURES = [
  'account_balances',
  'transactions',
  'settlements',
  'transfers',
  'statements',
  'account_verification',
  'payment_initiation'
];

export const BanksManagementTab = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [activeTab, setActiveTab] = useState("banks");
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    provider_type: 'bank',
    api_endpoint: '',
    supported_features: [] as string[],
    supported_countries: ['GH'],
    documentation_url: '',
    contact_email: ''
  });
  
  // Credentials form state
  const [credentials, setCredentials] = useState({
    api_key: '',
    client_id: '',
    client_secret: '',
    environment: 'production'
  });

  useEffect(() => {
    fetchBanks();
    fetchLogs();
  }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks_fintechs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanks((data as Bank[]) || []);
    } catch (error: any) {
      console.error('Error fetching banks:', error);
      toast.error('Failed to load banks');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_integration_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data as IntegrationLog[]) || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleCreateBank = async () => {
    try {
      const { error } = await supabase
        .from('banks_fintechs')
        .insert({
          name: formData.name,
          slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
          description: formData.description || null,
          provider_type: formData.provider_type,
          api_endpoint: formData.api_endpoint || null,
          supported_features: formData.supported_features,
          supported_countries: formData.supported_countries,
          documentation_url: formData.documentation_url || null,
          contact_email: formData.contact_email || null,
          status: 'pending'
        });

      if (error) throw error;
      
      toast.success('Bank/Fintech added successfully');
      setDialogOpen(false);
      resetForm();
      fetchBanks();
    } catch (error: any) {
      console.error('Error creating bank:', error);
      toast.error('Failed to create bank');
    }
  };

  const handleUpdateBank = async () => {
    if (!selectedBank) return;
    
    try {
      const { error } = await supabase
        .from('banks_fintechs')
        .update({
          name: formData.name,
          slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
          description: formData.description || null,
          provider_type: formData.provider_type,
          api_endpoint: formData.api_endpoint || null,
          supported_features: formData.supported_features,
          supported_countries: formData.supported_countries,
          documentation_url: formData.documentation_url || null,
          contact_email: formData.contact_email || null
        })
        .eq('id', selectedBank.id);

      if (error) throw error;
      
      toast.success('Bank/Fintech updated successfully');
      setDialogOpen(false);
      setSelectedBank(null);
      resetForm();
      fetchBanks();
    } catch (error: any) {
      console.error('Error updating bank:', error);
      toast.error('Failed to update bank');
    }
  };

  const handleToggleStatus = async (bank: Bank, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('banks_fintechs')
        .update({
          is_globally_enabled: enabled,
          status: enabled ? 'active' : 'inactive'
        })
        .eq('id', bank.id);

      if (error) throw error;
      
      toast.success(`${bank.name} ${enabled ? 'enabled' : 'disabled'} globally`);
      fetchBanks();
    } catch (error: any) {
      console.error('Error toggling bank:', error);
      toast.error('Failed to update bank status');
    }
  };

  const handleDeleteBank = async (bank: Bank) => {
    if (!confirm(`Are you sure you want to delete ${bank.name}?`)) return;
    
    try {
      const { error } = await supabase
        .from('banks_fintechs')
        .delete()
        .eq('id', bank.id);

      if (error) throw error;
      
      toast.success('Bank/Fintech deleted successfully');
      fetchBanks();
    } catch (error: any) {
      console.error('Error deleting bank:', error);
      toast.error('Failed to delete bank');
    }
  };

  const handleSaveCredentials = async () => {
    if (!selectedBank) return;
    
    try {
      const credentialEntries = [
        { type: 'api_key', value: credentials.api_key },
        { type: 'client_id', value: credentials.client_id },
        { type: 'client_secret', value: credentials.client_secret }
      ].filter(c => c.value.trim());

      for (const cred of credentialEntries) {
        const { error } = await supabase
          .from('bank_api_credentials')
          .upsert({
            bank_id: selectedBank.id,
            credential_type: cred.type,
            encrypted_value: btoa(cred.value), // Base64 encode (actual encryption at DB level)
            environment: credentials.environment,
            is_active: true
          }, {
            onConflict: 'bank_id,credential_type'
          });

        if (error) throw error;
      }
      
      toast.success('API credentials saved successfully');
      setCredentialsDialogOpen(false);
      setSelectedBank(null);
      setCredentials({ api_key: '', client_id: '', client_secret: '', environment: 'production' });
    } catch (error: any) {
      console.error('Error saving credentials:', error);
      toast.error('Failed to save credentials');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      provider_type: 'bank',
      api_endpoint: '',
      supported_features: [],
      supported_countries: ['GH'],
      documentation_url: '',
      contact_email: ''
    });
  };

  const openEditDialog = (bank: Bank) => {
    setSelectedBank(bank);
    setFormData({
      name: bank.name,
      slug: bank.slug,
      description: bank.description || '',
      provider_type: bank.provider_type,
      api_endpoint: bank.api_endpoint || '',
      supported_features: bank.supported_features || [],
      supported_countries: bank.supported_countries || ['GH'],
      documentation_url: bank.documentation_url || '',
      contact_email: bank.contact_email || ''
    });
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      pending: "outline",
      suspended: "destructive"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      supported_features: prev.supported_features.includes(feature)
        ? prev.supported_features.filter(f => f !== feature)
        : [...prev.supported_features, feature]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Banks & Fintechs</h2>
          <p className="text-muted-foreground">Manage bank and fintech integrations for the platform</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setSelectedBank(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bank/Fintech
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedBank ? 'Edit' : 'Add'} Bank/Fintech</DialogTitle>
              <DialogDescription>
                Configure bank or fintech provider details and API settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Ghana Commercial Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g., gcb"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the provider..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider Type</Label>
                  <Select
                    value={formData.provider_type}
                    onValueChange={(value) => setFormData({ ...formData, provider_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="fintech">Fintech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>API Endpoint</Label>
                  <Input
                    value={formData.api_endpoint}
                    onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                    placeholder="https://api.bank.com/v1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Supported Features</Label>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_FEATURES.map((feature) => (
                    <Badge
                      key={feature}
                      variant={formData.supported_features.includes(feature) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFeature(feature)}
                    >
                      {formData.supported_features.includes(feature) && (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      {feature.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Documentation URL</Label>
                  <Input
                    value={formData.documentation_url}
                    onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
                    placeholder="https://docs.bank.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="api-support@bank.com"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={selectedBank ? handleUpdateBank : handleCreateBank}>
                {selectedBank ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="banks" className="gap-2">
            <Building2 className="h-4 w-4" />
            All Providers
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Integration Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="banks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {banks.map((bank) => (
              <Card key={bank.id} className={bank.is_globally_enabled ? "border-primary/50" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        {bank.logo_url ? (
                          <img src={bank.logo_url} alt={bank.name} className="h-6 w-6 object-contain" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{bank.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {bank.provider_type === 'bank' ? 'Bank' : 'Fintech'} • {bank.slug}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(bank.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bank.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{bank.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-1">
                    {bank.supported_features?.slice(0, 3).map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {(bank.supported_features?.length || 0) > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{(bank.supported_features?.length || 0) - 3} more
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={bank.is_globally_enabled}
                        onCheckedChange={(checked) => handleToggleStatus(bank, checked)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {bank.is_globally_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBank(bank);
                          setCredentialsDialogOpen(true);
                        }}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(bank)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteBank(bank)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {banks.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No banks or fintechs configured yet</p>
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Provider
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Integration Logs</CardTitle>
                  <CardDescription>Recent API calls and integration activity</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {log.endpoint || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.request_method || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          {log.response_status ? (
                            <Badge variant={log.response_status < 400 ? "default" : "destructive"}>
                              {log.response_status}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No integration logs yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              API Credentials - {selectedBank?.name}
            </DialogTitle>
            <DialogDescription>
              Securely configure API credentials for this provider
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={credentials.environment}
                onValueChange={(value) => setCredentials({ ...credentials, environment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={credentials.api_key}
                onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
                placeholder="Enter API key..."
              />
            </div>
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                value={credentials.client_id}
                onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
                placeholder="Enter client ID..."
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input
                type="password"
                value={credentials.client_secret}
                onChange={(e) => setCredentials({ ...credentials, client_secret: e.target.value })}
                placeholder="Enter client secret..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCredentials}>Save Credentials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

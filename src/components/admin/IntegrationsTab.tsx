import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  secretKeys: string[];
  docsUrl: string;
  configured: boolean;
  enabled: boolean;
}

interface ServiceToggle {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  parentIntegration: string;
  enabled: boolean;
}

const integrationDefinitions: Omit<Integration, "configured" | "enabled">[] = [
  {
    id: "ismart",
    name: "iSmart API",
    description: "Core API credentials for all iSmart services",
    icon: Shield,
    secretKeys: ["ISMART_API_KEY"],
    docsUrl: "https://api.ismartpay.com/docs",
  },
];

const serviceDefinitions: Omit<ServiceToggle, "enabled">[] = [
  {
    id: "ismart_communications",
    name: "Communications",
    description: "SMS, Email, and WhatsApp messaging",
    icon: MessageSquare,
    parentIntegration: "ismart",
  },
  {
    id: "ismart_collections",
    name: "Collections",
    description: "Payment collections via MoMo and Bank",
    icon: CreditCard,
    parentIntegration: "ismart",
  },
  {
    id: "ismart_disbursements",
    name: "Disbursements",
    description: "Payouts to MoMo and Bank accounts",
    icon: CreditCard,
    parentIntegration: "ismart",
  },
  {
    id: "ismart_wallets",
    name: "Wallets",
    description: "Business wallet management and transfers",
    icon: CreditCard,
    parentIntegration: "ismart",
  },
  {
    id: "ismart_kyc",
    name: "KYC & Verification",
    description: "Identity verification and document uploads",
    icon: Shield,
    parentIntegration: "ismart",
  },
  {
    id: "ismart_settlements",
    name: "Settlements",
    description: "Settlement accounts and fee tracking",
    icon: CreditCard,
    parentIntegration: "ismart",
  },
];

export const IntegrationsTab = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [services, setServices] = useState<ServiceToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [configDialog, setConfigDialog] = useState<{ open: boolean; integration: Integration | null }>({
    open: false,
    integration: null,
  });
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    setLoading(true);
    try {
      // Check system_settings for integration status
      const { data: settings } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .or("setting_key.like.integration_%,setting_key.like.service_%");

      const statusMap = new Map(
        settings?.map((s) => [s.setting_key, s.setting_value]) || []
      );

      const loadedIntegrations: Integration[] = integrationDefinitions.map((def) => ({
        ...def,
        configured: statusMap.get(`integration_${def.id}_configured`) === "true",
        enabled: statusMap.get(`integration_${def.id}_enabled`) === "true",
      }));

      const loadedServices: ServiceToggle[] = serviceDefinitions.map((def) => ({
        ...def,
        enabled: statusMap.get(`service_${def.id}_enabled`) !== "false", // default to enabled
      }));

      setIntegrations(loadedIntegrations);
      setServices(loadedServices);
    } catch (error) {
      console.error("Error loading integrations:", error);
      toast.error("Failed to load integration status");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleService = async (service: ServiceToggle) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newEnabled = !service.enabled;
      
      await supabase.from("system_settings").upsert({
        setting_key: `service_${service.id}_enabled`,
        setting_value: newEnabled.toString(),
        updated_at: new Date().toISOString(),
      });

      // Log audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: newEnabled ? "enable_service" : "disable_service",
        entity_type: "service",
        entity_id: service.id,
        metadata: { service_name: service.name },
      });

      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, enabled: newEnabled } : s))
      );

      toast.success(`${service.name} ${newEnabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  const handleTestIntegration = async (integration: Integration) => {
    setTestingId(integration.id);
    try {
      if (integration.id === "ismart") {
        // Test iSmart by calling the SMS test endpoint
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: { test: true },
        });
        if (error) throw error;
        if (data?.success === false && data?.code === "SERVICE_NOT_CONFIGURED") {
          toast.error("iSmart API key not configured or invalid");
        } else {
          toast.success("iSmart integration is working correctly");
        }
      }
    } catch (error: any) {
      toast.error(`Integration test failed: ${error.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnabled = async (integration: Integration) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newEnabled = !integration.enabled;
      
      await supabase.from("system_settings").upsert({
        setting_key: `integration_${integration.id}_enabled`,
        setting_value: newEnabled.toString(),
        updated_at: new Date().toISOString(),
      });

      // Log audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: newEnabled ? "enable_integration" : "disable_integration",
        entity_type: "integration",
        entity_id: integration.id,
        metadata: { integration_name: integration.name },
      });

      setIntegrations((prev) =>
        prev.map((i) => (i.id === integration.id ? { ...i, enabled: newEnabled } : i))
      );

      toast.success(`${integration.name} ${newEnabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  const openConfigDialog = (integration: Integration) => {
    setSecretValues({});
    setShowSecrets({});
    setConfigDialog({ open: true, integration });
  };

  const handleSaveSecrets = async () => {
    if (!configDialog.integration) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Store secrets via edge function (secure server-side storage)
      const { error } = await supabase.functions.invoke("update-integration-secrets", {
        body: {
          integrationId: configDialog.integration.id,
          secrets: secretValues,
        },
      });

      if (error) throw error;

      // Mark as configured in system_settings
      await supabase.from("system_settings").upsert({
        setting_key: `integration_${configDialog.integration.id}_configured`,
        setting_value: "true",
        updated_at: new Date().toISOString(),
      });

      // Log audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "configure_integration",
        entity_type: "integration",
        entity_id: configDialog.integration.id,
        metadata: { 
          integration_name: configDialog.integration.name,
          keys_updated: Object.keys(secretValues),
        },
      });

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === configDialog.integration!.id ? { ...i, configured: true } : i
        )
      );

      toast.success(`${configDialog.integration.name} configured successfully`);
      setConfigDialog({ open: false, integration: null });
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-muted-foreground">
            Manage third-party service connections and API keys
          </p>
        </div>
        <Button variant="outline" onClick={loadIntegrationStatus}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card key={integration.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.configured ? (
                      <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        <XCircle className="w-3 h-3 mr-1" />
                        Not Configured
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={integration.enabled}
                      onCheckedChange={() => handleToggleEnabled(integration)}
                      disabled={!integration.configured}
                    />
                    <span className="text-sm text-muted-foreground">
                      {integration.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openConfigDialog(integration)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Configure API Keys
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestIntegration(integration)}
                    disabled={!integration.configured || testingId === integration.id}
                  >
                    {testingId === integration.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Docs
                    </a>
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Required keys: {integration.secretKeys.join(", ")}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* iSmart Services Section */}
      {integrations.find(i => i.id === "ismart")?.configured && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">iSmart Services</h3>
            <p className="text-sm text-muted-foreground">
              Enable or disable individual iSmart services
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services
              .filter((s) => s.parentIntegration === "ismart")
              .map((service) => {
                const Icon = service.icon;
                const parentEnabled = integrations.find(i => i.id === "ismart")?.enabled;
                return (
                  <Card key={service.id} className={!parentEnabled ? "opacity-50" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{service.name}</p>
                            <p className="text-xs text-muted-foreground">{service.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={service.enabled && parentEnabled}
                          onCheckedChange={() => handleToggleService(service)}
                          disabled={!parentEnabled}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      <Dialog open={configDialog.open} onOpenChange={(open) => setConfigDialog({ open, integration: open ? configDialog.integration : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {configDialog.integration?.name}</DialogTitle>
            <DialogDescription>
              Enter your API keys securely. These will be encrypted at rest and stored in the backend with AES-256 encryption.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {configDialog.integration?.secretKeys.map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-sm font-medium">
                  {key}
                  {key.includes("PUBLIC") && (
                    <span className="text-xs text-muted-foreground ml-2">(safe for frontend)</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id={key}
                    type={showSecrets[key] ? "text" : "password"}
                    placeholder={`Enter ${key}`}
                    value={secretValues[key] || ""}
                    onChange={(e) =>
                      setSecretValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() =>
                      setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                  >
                    {showSecrets[key] ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog({ open: false, integration: null })}>
              Cancel
            </Button>
            <Button onClick={handleSaveSecrets} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save API Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

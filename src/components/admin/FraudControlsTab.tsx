import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import { 
  Shield, AlertTriangle, CheckCircle2, Clock, Search, 
  RefreshCw, Eye, Settings, Ban, Plus, Building2, Trash2
} from "lucide-react";
import { format } from "date-fns";

interface FraudAlert {
  id: string;
  user_id: string;
  business_id: string | null;
  alert_type: string;
  severity: string;
  status: string;
  description: string;
  metadata: any;
  amount: number | null;
  ip_address: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
}

interface FraudRule {
  id: string;
  rule_name: string;
  rule_type: string;
  description: string | null;
  parameters: any;
  is_active: boolean;
  severity: string;
}

interface BusinessExemption {
  id: string;
  business_id: string;
  fraud_rule_id: string;
  reason: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  business_name?: string;
  rule_name?: string;
}

interface BusinessProfile {
  id: string;
  business_name: string;
  business_email: string | null;
}

export const FraudControlsTab = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [exemptions, setExemptions] = useState<BusinessExemption[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const { formatCurrency } = useCurrency();
  
  // Exemption form state
  const [showExemptionDialog, setShowExemptionDialog] = useState(false);
  const [exemptionForm, setExemptionForm] = useState({
    business_id: "",
    fraud_rule_id: "",
    reason: "",
    expires_at: "",
  });
  const [businessSearch, setBusinessSearch] = useState("");
  const [searchedBusinesses, setSearchedBusinesses] = useState<BusinessProfile[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, rulesRes, exemptionsRes] = await Promise.all([
        supabase
          .from("fraud_alerts")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("fraud_rules")
          .select("*")
          .order("rule_name"),
        supabase
          .from("business_fraud_exemptions")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (alertsRes.error) throw alertsRes.error;
      if (rulesRes.error) throw rulesRes.error;
      if (exemptionsRes.error) throw exemptionsRes.error;

      setAlerts(alertsRes.data || []);
      setRules(rulesRes.data || []);
      
      // Enrich exemptions with business and rule names
      const enrichedExemptions = await Promise.all(
        (exemptionsRes.data || []).map(async (exemption) => {
          const [businessRes, ruleRes] = await Promise.all([
            supabase.from("business_profiles").select("business_name").eq("id", exemption.business_id).single(),
            supabase.from("fraud_rules").select("rule_name").eq("id", exemption.fraud_rule_id).single(),
          ]);
          return {
            ...exemption,
            business_name: businessRes.data?.business_name || "Unknown",
            rule_name: ruleRes.data?.rule_name || "Unknown",
          };
        })
      );
      setExemptions(enrichedExemptions);
    } catch (error: any) {
      toast.error("Failed to load fraud data", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const searchBusinesses = async () => {
    if (!businessSearch.trim()) return;
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name, business_email")
        .or(`business_name.ilike.%${businessSearch}%,business_email.ilike.%${businessSearch}%`)
        .limit(10);
      
      if (error) throw error;
      setSearchedBusinesses(data || []);
    } catch (error: any) {
      toast.error("Search failed", { description: error.message });
    }
  };

  const handleResolveAlert = async (alertId: string, resolution: "resolved" | "false_positive") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("fraud_alerts")
        .update({
          status: resolution,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq("id", alertId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "fraud_alert_resolved",
        entity_type: "fraud_alert",
        entity_id: alertId,
        metadata: { resolution, notes: resolutionNotes },
      });

      toast.success(`Alert marked as ${resolution.replace("_", " ")}`);
      setSelectedAlert(null);
      setResolutionNotes("");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to resolve alert", { description: error.message });
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("fraud_rules")
        .update({ is_active: isActive })
        .eq("id", ruleId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: isActive ? "fraud_rule_enabled" : "fraud_rule_disabled",
        entity_type: "fraud_rule",
        entity_id: ruleId,
      });

      toast.success(`Rule ${isActive ? "enabled" : "disabled"}`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update rule", { description: error.message });
    }
  };

  const handleCreateExemption = async () => {
    if (!exemptionForm.business_id || !exemptionForm.fraud_rule_id || !exemptionForm.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("business_fraud_exemptions").insert({
        business_id: exemptionForm.business_id,
        fraud_rule_id: exemptionForm.fraud_rule_id,
        reason: exemptionForm.reason,
        expires_at: exemptionForm.expires_at || null,
        exempted_by: user.id,
        is_active: true,
      });

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "fraud_exemption_created",
        entity_type: "business_fraud_exemption",
        metadata: {
          business_id: exemptionForm.business_id,
          fraud_rule_id: exemptionForm.fraud_rule_id,
          reason: exemptionForm.reason,
        },
      });

      toast.success("Exemption created successfully");
      setShowExemptionDialog(false);
      setExemptionForm({ business_id: "", fraud_rule_id: "", reason: "", expires_at: "" });
      setSearchedBusinesses([]);
      setBusinessSearch("");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to create exemption", { description: error.message });
    }
  };

  const handleDeleteExemption = async (exemptionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("business_fraud_exemptions")
        .delete()
        .eq("id", exemptionId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "fraud_exemption_deleted",
        entity_type: "business_fraud_exemption",
        entity_id: exemptionId,
      });

      toast.success("Exemption removed");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete exemption", { description: error.message });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-black";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "investigating": return "bg-blue-100 text-blue-800 border-blue-300";
      case "resolved": return "bg-green-100 text-green-800 border-green-300";
      case "false_positive": return "bg-gray-100 text-gray-800 border-gray-300";
      default: return "bg-muted";
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.alert_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const stats = {
    total: alerts.length,
    pending: alerts.filter(a => a.status === "pending").length,
    critical: alerts.filter(a => a.severity === "critical").length,
    resolved: alerts.filter(a => a.status === "resolved").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">{stats.pending}</p>
                <p className="text-sm text-yellow-600">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-500">{stats.critical}</p>
                <p className="text-sm text-red-600">Critical Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-500">{stats.resolved}</p>
                <p className="text-sm text-green-600">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Fraud Alerts
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Settings className="w-4 h-4" />
            Detection Rules
          </TabsTrigger>
          <TabsTrigger value="exemptions" className="gap-2">
            <Building2 className="w-4 h-4" />
            Business Exemptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Alerts Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      No fraud alerts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="text-sm">
                        {format(new Date(alert.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{alert.alert_type.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">{alert.description}</TableCell>
                      <TableCell>
                        {alert.amount ? formatCurrency(alert.amount) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(alert.status)}>
                          {alert.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Alert Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Type</p>
                                  <p className="font-medium">{alert.alert_type.replace(/_/g, " ")}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Severity</p>
                                  <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Amount</p>
                                  <p className="font-medium">{alert.amount ? formatCurrency(alert.amount) : "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">IP Address</p>
                                  <p className="font-medium">{alert.ip_address || "N/A"}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Description</p>
                                <p className="font-medium">{alert.description}</p>
                              </div>
                              {alert.status === "pending" && (
                                <div className="space-y-3 pt-4 border-t">
                                  <Textarea
                                    placeholder="Resolution notes..."
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      className="flex-1"
                                      onClick={() => handleResolveAlert(alert.id, "resolved")}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Mark Resolved
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => handleResolveAlert(alert.id, "false_positive")}
                                    >
                                      <Ban className="w-4 h-4 mr-2" />
                                      False Positive
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Fraud Detection Rules
              </CardTitle>
              <CardDescription>
                Enable or disable fraud detection rules globally
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium">{rule.rule_name}</h4>
                        <Badge className={getSeverityColor(rule.severity)} variant="secondary">
                          {rule.severity}
                        </Badge>
                        <Badge variant="outline">{rule.rule_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Parameters: {JSON.stringify(rule.parameters)}
                      </div>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exemptions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Business Exemptions
                  </CardTitle>
                  <CardDescription>
                    Exempt specific businesses from fraud detection rules
                  </CardDescription>
                </div>
                <Dialog open={showExemptionDialog} onOpenChange={setShowExemptionDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Exemption
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Business Exemption</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Search Business</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Search by name or email..."
                            value={businessSearch}
                            onChange={(e) => setBusinessSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && searchBusinesses()}
                          />
                          <Button variant="outline" onClick={searchBusinesses}>
                            <Search className="w-4 h-4" />
                          </Button>
                        </div>
                        {searchedBusinesses.length > 0 && (
                          <div className="border rounded-lg max-h-40 overflow-auto">
                            {searchedBusinesses.map((b) => (
                              <button
                                key={b.id}
                                className={`w-full text-left px-3 py-2 hover:bg-muted text-sm ${
                                  exemptionForm.business_id === b.id ? "bg-muted" : ""
                                }`}
                                onClick={() => setExemptionForm({ ...exemptionForm, business_id: b.id })}
                              >
                                <p className="font-medium">{b.business_name}</p>
                                <p className="text-xs text-muted-foreground">{b.business_email}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Fraud Rule</Label>
                        <Select
                          value={exemptionForm.fraud_rule_id}
                          onValueChange={(value) => setExemptionForm({ ...exemptionForm, fraud_rule_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a rule" />
                          </SelectTrigger>
                          <SelectContent>
                            {rules.map((rule) => (
                              <SelectItem key={rule.id} value={rule.id}>
                                {rule.rule_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reason for Exemption *</Label>
                        <Textarea
                          placeholder="Why is this business exempt from this rule?"
                          value={exemptionForm.reason}
                          onChange={(e) => setExemptionForm({ ...exemptionForm, reason: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Date (optional)</Label>
                        <Input
                          type="date"
                          value={exemptionForm.expires_at}
                          onChange={(e) => setExemptionForm({ ...exemptionForm, expires_at: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowExemptionDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateExemption}>Create Exemption</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {exemptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No business exemptions configured</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exemptions.map((exemption) => (
                      <TableRow key={exemption.id}>
                        <TableCell className="font-medium">{exemption.business_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{exemption.rule_name}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{exemption.reason}</TableCell>
                        <TableCell>
                          {exemption.expires_at
                            ? format(new Date(exemption.expires_at), "MMM d, yyyy")
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={exemption.is_active ? "default" : "secondary"}>
                            {exemption.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteExemption(exemption.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

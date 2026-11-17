import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Plus, 
  Edit, 
  RefreshCw,
  Globe,
  Key,
  Percent
} from "lucide-react";

interface PaymentProvider {
  id: string;
  name: string;
  slug: string;
  provider_type: string;
  is_active: boolean;
  fee_type: string | null;
  fee_value: number | null;
  fee_cap: number | null;
  min_amount: number | null;
  max_amount: number | null;
  supports_collection: boolean;
  supports_disbursement: boolean;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ProviderStats {
  totalProviders: number;
  activeProviders: number;
  momoProviders: number;
  bankProviders: number;
}

export const PaymentProviderManagementTab = () => {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [stats, setStats] = useState<ProviderStats>({
    totalProviders: 0,
    activeProviders: 0,
    momoProviders: 0,
    bankProviders: 0,
  });

  const [newProvider, setNewProvider] = useState<{
    name: string;
    slug: string;
    provider_type: string;
    fee_type: string;
    fee_value: number;
    fee_cap: number;
    min_amount: number;
    max_amount: number;
    supports_collection: boolean;
    supports_disbursement: boolean;
  }>({
    name: "",
    slug: "",
    provider_type: "mobile_money",
    fee_type: "percentage",
    fee_value: 0,
    fee_cap: 0,
    min_amount: 1,
    max_amount: 100000,
    supports_collection: true,
    supports_disbursement: true,
  });

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_providers")
        .select("*")
        .order("name");

      if (error) throw error;

      const providersData = (data || []) as PaymentProvider[];
      setProviders(providersData);

      setStats({
        totalProviders: providersData.length,
        activeProviders: providersData.filter((p) => p.is_active).length,
        momoProviders: providersData.filter((p) => p.provider_type === "mobile_money").length,
        bankProviders: providersData.filter((p) => p.provider_type === "bank").length,
      });
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Failed to load payment providers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleToggleActive = async (provider: PaymentProvider) => {
    try {
      const { error } = await supabase
        .from("payment_providers")
        .update({ is_active: !provider.is_active, updated_at: new Date().toISOString() })
        .eq("id", provider.id);

      if (error) throw error;

      toast.success(`${provider.name} ${!provider.is_active ? "activated" : "deactivated"}`);
      fetchProviders();
    } catch (error) {
      console.error("Error toggling provider:", error);
      toast.error("Failed to update provider");
    }
  };

  const handleUpdateProvider = async () => {
    if (!editingProvider) return;

    try {
      const { error } = await supabase
        .from("payment_providers")
        .update({
          name: editingProvider.name,
          fee_type: editingProvider.fee_type,
          fee_value: editingProvider.fee_value,
          fee_cap: editingProvider.fee_cap,
          min_amount: editingProvider.min_amount,
          max_amount: editingProvider.max_amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingProvider.id);

      if (error) throw error;

      toast.success("Provider updated successfully");
      setShowEditDialog(false);
      setEditingProvider(null);
      fetchProviders();
    } catch (error) {
      console.error("Error updating provider:", error);
      toast.error("Failed to update provider");
    }
  };

  const handleAddProvider = async () => {
    try {
      const providerType = newProvider.provider_type === "mobile_money" ? "mobile_money" : "bank_transfer";
      const { error } = await supabase.from("payment_providers").insert({
        name: newProvider.name,
        slug: newProvider.slug,
        provider_type: providerType as "mobile_money" | "bank_transfer",
        fee_type: newProvider.fee_type,
        fee_value: newProvider.fee_value,
        fee_cap: newProvider.fee_cap,
        min_amount: newProvider.min_amount,
        max_amount: newProvider.max_amount,
        supports_collection: newProvider.supports_collection,
        supports_disbursement: newProvider.supports_disbursement,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Provider added successfully");
      setShowAddDialog(false);
      setNewProvider({
        name: "",
        slug: "",
        provider_type: "mobile_money",
        fee_type: "percentage",
        fee_value: 0,
        fee_cap: 0,
        min_amount: 1,
        max_amount: 100000,
        supports_collection: true,
        supports_disbursement: true,
      });
      fetchProviders();
    } catch (error) {
      console.error("Error adding provider:", error);
      toast.error("Failed to add provider");
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case "mobile_money":
        return <Smartphone className="h-4 w-4" />;
      case "bank":
        return <Building2 className="h-4 w-4" />;
      case "card":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Provider Management</h2>
          <p className="text-muted-foreground">
            Manage payment providers, fees, and API configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchProviders} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProviders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Key className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeProviders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mobile Money</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.momoProviders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Transfer</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bankProviders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Providers</CardTitle>
          <CardDescription>
            Configure provider settings, fees, and availability
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Fee Structure</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading providers...
                  </TableCell>
                </TableRow>
              ) : providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No providers found
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getProviderIcon(provider.provider_type)}
                        </div>
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-sm text-muted-foreground">{provider.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {provider.provider_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Percent className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {provider.fee_value || 0}
                          {provider.fee_type === "percentage" ? "%" : " GHS"}
                        </span>
                        {(provider.fee_cap || 0) > 0 && (
                          <span className="text-muted-foreground">
                            (cap: GHS {(provider.fee_cap || 0).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {provider.supports_collection && (
                          <Badge variant="secondary" className="text-xs">
                            Collection
                          </Badge>
                        )}
                        {provider.supports_disbursement && (
                          <Badge variant="secondary" className="text-xs">
                            Disbursement
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={provider.is_active}
                        onCheckedChange={() => handleToggleActive(provider)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(provider.updated_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProvider(provider);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Provider Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>
              Update provider configuration and fees
            </DialogDescription>
          </DialogHeader>
          {editingProvider && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Provider Name</Label>
                <Input
                  value={editingProvider.name}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fee Type</Label>
                  <Select
                    value={editingProvider.fee_type}
                    onValueChange={(value) =>
                      setEditingProvider({ ...editingProvider, fee_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fee Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProvider.fee_value}
                    onChange={(e) =>
                      setEditingProvider({
                        ...editingProvider,
                        fee_value: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fee Cap (GHS)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProvider.fee_cap}
                    onChange={(e) =>
                      setEditingProvider({
                        ...editingProvider,
                        fee_cap: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Amount (GHS)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProvider.min_amount}
                    onChange={(e) =>
                      setEditingProvider({
                        ...editingProvider,
                        min_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Max Amount (GHS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingProvider.max_amount}
                  onChange={(e) =>
                    setEditingProvider({
                      ...editingProvider,
                      max_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProvider}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Provider Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Provider</DialogTitle>
            <DialogDescription>
              Configure a new payment provider
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider Name</Label>
                <Input
                  value={newProvider.name}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, name: e.target.value })
                  }
                  placeholder="MTN Mobile Money"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={newProvider.slug}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, slug: e.target.value })
                  }
                  placeholder="mtn-momo"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Provider Type</Label>
              <Select
                value={newProvider.provider_type}
                onValueChange={(value) =>
                  setNewProvider({ ...newProvider, provider_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee Type</Label>
                <Select
                  value={newProvider.fee_type}
                  onValueChange={(value) =>
                    setNewProvider({ ...newProvider, fee_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fee Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newProvider.fee_value}
                  onChange={(e) =>
                    setNewProvider({
                      ...newProvider,
                      fee_value: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee Cap (GHS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newProvider.fee_cap}
                  onChange={(e) =>
                    setNewProvider({
                      ...newProvider,
                      fee_cap: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min Amount (GHS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newProvider.min_amount}
                  onChange={(e) =>
                    setNewProvider({
                      ...newProvider,
                      min_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Amount (GHS)</Label>
              <Input
                type="number"
                step="0.01"
                value={newProvider.max_amount}
                onChange={(e) =>
                  setNewProvider({
                    ...newProvider,
                    max_amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProvider}>Add Provider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

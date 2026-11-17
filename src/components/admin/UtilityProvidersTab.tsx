import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Zap, Wifi, Lightbulb, Tv, Droplets, Phone } from "lucide-react";
import { toast } from "sonner";

type UtilityType = "airtime" | "data" | "electricity" | "tv" | "water" | "internet" | "insurance" | "other";

interface UtilityProvider {
  id: string;
  name: string;
  slug: string;
  utility_type: UtilityType;
  logo_url: string | null;
  is_active: boolean;
  country: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const utilityTypeIcons: Record<UtilityType, React.ElementType> = {
  airtime: Phone,
  data: Wifi,
  electricity: Lightbulb,
  tv: Tv,
  water: Droplets,
  internet: Wifi,
  insurance: Zap,
  other: Zap,
};

const utilityTypeLabels: Record<UtilityType, string> = {
  airtime: "Airtime",
  data: "Data",
  electricity: "Electricity",
  tv: "TV",
  water: "Water",
  internet: "Internet",
  insurance: "Insurance",
  other: "Other",
};

export const UtilityProvidersTab = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<UtilityProvider | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    utility_type: "airtime" as UtilityType,
    logo_url: "",
    is_active: true,
    country: "GH",
  });

  const { data: providers, isLoading } = useQuery({
    queryKey: ["utility-providers-admin", filterType],
    queryFn: async () => {
      let query = supabase
        .from("utility_providers")
        .select("*")
        .order("utility_type", { ascending: true })
        .order("name", { ascending: true });

      if (filterType !== "all") {
        query = query.eq("utility_type", filterType as UtilityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as UtilityProvider[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; utility_type: UtilityType; logo_url: string | null; is_active: boolean; country: string }) => {
      const { error } = await supabase.from("utility_providers").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility-providers-admin"] });
      toast.success("Provider created successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create provider: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; slug?: string; utility_type?: UtilityType; logo_url?: string | null; is_active?: boolean; country?: string } }) => {
      const { error } = await supabase.from("utility_providers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility-providers-admin"] });
      toast.success("Provider updated successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update provider: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("utility_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility-providers-admin"] });
      toast.success("Provider deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete provider: ${error.message}`);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("utility_providers").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility-providers-admin"] });
      toast.success("Status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      utility_type: "airtime",
      logo_url: "",
      is_active: true,
      country: "GH",
    });
    setEditingProvider(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (provider: UtilityProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      slug: provider.slug,
      utility_type: provider.utility_type,
      logo_url: provider.logo_url || "",
      is_active: provider.is_active,
      country: provider.country,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
      utility_type: formData.utility_type,
      logo_url: formData.logo_url || null,
      is_active: formData.is_active,
      country: formData.country,
    };

    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const stats = providers
    ? {
        total: providers.length,
        active: providers.filter((p) => p.is_active).length,
        byType: Object.entries(
          providers.reduce((acc, p) => {
            acc[p.utility_type] = (acc[p.utility_type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ),
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              {(stats?.total || 0) - (stats?.active || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.byType.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Utility Providers</CardTitle>
            <CardDescription>Manage bill payment providers for airtime, data, electricity, and more</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(utilityTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingProvider ? "Edit Provider" : "Add New Provider"}</DialogTitle>
                  <DialogDescription>
                    {editingProvider ? "Update the provider details" : "Add a new utility provider"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., MTN Ghana"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="e.g., mtn-ghana"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.utility_type}
                      onValueChange={(v) => setFormData({ ...formData, utility_type: v as UtilityType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(utilityTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="e.g., GH"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!formData.name}>
                    {editingProvider ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers?.map((provider) => {
                  const Icon = utilityTypeIcons[provider.utility_type];
                  return (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {provider.logo_url ? (
                            <img src={provider.logo_url} alt={provider.name} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                              <Icon className="w-4 h-4" />
                            </div>
                          )}
                          <span className="font-medium">{provider.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{utilityTypeLabels[provider.utility_type]}</Badge>
                      </TableCell>
                      <TableCell>{provider.country}</TableCell>
                      <TableCell>
                        <Switch
                          checked={provider.is_active}
                          onCheckedChange={(checked) =>
                            toggleStatusMutation.mutate({ id: provider.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(provider)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Delete this provider?")) {
                                deleteMutation.mutate(provider.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {providers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No providers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

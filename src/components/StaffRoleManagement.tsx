import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Shield, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { getIndustryRoles, PredefinedRole, getIndustryFeatures } from "@/lib/industry-roles";

interface StaffRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  is_active: boolean;
}

const allPermissionLabels: Record<string, string> = {
  products: "Products & Inventory",
  orders: "Orders & Sales",
  customers: "Customers",
  kitchen: "Kitchen Display",
  tables: "Tables",
  reservations: "Reservations",
  settings: "Settings",
  reports: "Reports",
  staff_management: "Staff Management",
};

export const StaffRoleManagement = () => {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {
      products: true,
      orders: true,
      customers: true,
      kitchen: true,
      tables: true,
      reservations: true,
      settings: false,
      reports: false,
      staff_management: false,
    },
  });
  const { user, profile } = useBusiness();
  const { toast } = useToast();

  // Get industry-specific role suggestions
  const suggestedRoles = useMemo(() => {
    return getIndustryRoles(profile?.industry);
  }, [profile?.industry]);

  // Get industry-specific features for filtering permissions
  const industryFeatures = useMemo(() => {
    return getIndustryFeatures(profile?.industry);
  }, [profile?.industry]);

  // Filter permission labels to only show relevant ones for this industry
  const permissionLabels = useMemo(() => {
    const filtered: Record<string, string> = {};
    industryFeatures.forEach(feature => {
      if (allPermissionLabels[feature]) {
        filtered[feature] = allPermissionLabels[feature];
      }
    });
    return filtered;
  }, [industryFeatures]);

  // Filter out already created roles from suggestions
  const availableSuggestions = useMemo(() => {
    const existingNames = roles.map(r => r.name.toLowerCase());
    return suggestedRoles.filter(sr => !existingNames.includes(sr.name.toLowerCase()));
  }, [suggestedRoles, roles]);

  useEffect(() => {
    if (user) fetchRoles();
  }, [user]);

  const fetchRoles = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("staff_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRoles((data || []).map(role => ({
        ...role,
        permissions: role.permissions as Record<string, boolean>
      })));
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!user || !formData.name.trim()) return;

    try {
      if (editingRole) {
        const { error } = await supabase
          .from("staff_roles")
          .update({
            name: formData.name,
            description: formData.description || null,
            permissions: formData.permissions,
          })
          .eq("id", editingRole.id);
        if (error) throw error;
        toast({ title: "Role updated" });
      } else {
        const { error } = await supabase
          .from("staff_roles")
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description || null,
            permissions: formData.permissions,
          });
        if (error) throw error;
        toast({ title: "Role created" });
      }
      
      setIsDialogOpen(false);
      setEditingRole(null);
      resetForm();
      fetchRoles();
    } catch (error) {
      console.error("Error saving role:", error);
      toast({ title: "Error saving role", variant: "destructive" });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("staff_roles")
        .update({ is_active: false })
        .eq("id", roleId);
      if (error) throw error;
      toast({ title: "Role deleted" });
      fetchRoles();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast({ title: "Error deleting role", variant: "destructive" });
    }
  };

  const handleAddSuggestedRole = async (suggested: PredefinedRole) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("staff_roles")
        .insert({
          user_id: user.id,
          name: suggested.name,
          description: suggested.description,
          permissions: suggested.permissions,
        });
      if (error) throw error;
      toast({ title: `${suggested.name} role created` });
      fetchRoles();
    } catch (error) {
      console.error("Error creating role:", error);
      toast({ title: "Error creating role", variant: "destructive" });
    }
  };

  const handleAddAllSuggested = async () => {
    if (!user || availableSuggestions.length === 0) return;
    try {
      const rolesToInsert = availableSuggestions.map(role => ({
        user_id: user.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      }));
      
      const { error } = await supabase
        .from("staff_roles")
        .insert(rolesToInsert);
      
      if (error) throw error;
      toast({ title: `${availableSuggestions.length} roles created` });
      fetchRoles();
    } catch (error) {
      console.error("Error creating roles:", error);
      toast({ title: "Error creating roles", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: {
        products: true,
        orders: true,
        customers: true,
        kitchen: true,
        tables: true,
        reservations: true,
        settings: false,
        reports: false,
        staff_management: false,
      },
    });
  };

  const openEditDialog = (role: StaffRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: {
        products: role.permissions.products ?? true,
        orders: role.permissions.orders ?? true,
        customers: role.permissions.customers ?? true,
        kitchen: role.permissions.kitchen ?? true,
        tables: role.permissions.tables ?? true,
        reservations: role.permissions.reservations ?? true,
        settings: role.permissions.settings ?? false,
        reports: role.permissions.reports ?? false,
        staff_management: role.permissions.staff_management ?? false,
      },
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingRole(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key as keyof typeof prev.permissions],
      },
    }));
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Shield className="w-5 h-5" />
            Staff Roles
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Define custom roles with specific permissions</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Role Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Manager, Cashier"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this role can do..."
                  rows={2}
                />
              </div>
              <div>
                <Label className="mb-3 block">Permissions</Label>
                <div className="space-y-3">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      <Switch
                        checked={formData.permissions[key as keyof typeof formData.permissions] || false}
                        onCheckedChange={() => togglePermission(key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={handleSaveRole} className="w-full">
                {editingRole ? "Update Role" : "Create Role"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Suggested Roles Section */}
        {availableSuggestions.length > 0 && (
          <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
            <div className="border rounded-lg bg-primary/5">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-3 text-left hover:bg-primary/10 transition-colors rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Suggested Roles for Your Industry</span>
                    <Badge variant="secondary" className="text-xs">{availableSuggestions.length} available</Badge>
                  </div>
                  {showSuggestions ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {availableSuggestions.map((role) => (
                      <Button
                        key={role.name}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSuggestedRole(role)}
                        className="h-auto py-1.5 px-3"
                      >
                        <Plus className="w-3 h-3 mr-1.5" />
                        {role.name}
                      </Button>
                    ))}
                  </div>
                  {availableSuggestions.length > 1 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddAllSuggested}
                      className="w-full mt-2"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Add All {availableSuggestions.length} Suggested Roles
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Existing Roles */}
        <div className="grid gap-3">
          {roles.map((role) => (
            <div key={role.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base">{role.name}</div>
                {role.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{role.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(role.permissions)
                    .filter(([_, value]) => value)
                    .map(([key]) => (
                      <Badge key={key} variant="secondary" className="text-[10px] sm:text-xs">
                        {permissionLabels[key] || key}
                      </Badge>
                    ))}
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(role)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {roles.length === 0 && availableSuggestions.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No roles created yet. Create roles to assign to your staff.
            </p>
          )}
          {roles.length === 0 && availableSuggestions.length > 0 && (
            <p className="text-center text-muted-foreground py-4">
              No roles created yet. Use the suggested roles above or create a custom one.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

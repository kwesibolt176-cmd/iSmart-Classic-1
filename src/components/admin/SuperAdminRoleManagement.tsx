import { useEffect, useState } from "react";
import { Shield, Plus, Trash2, UserCheck, Search, Crown, AlertTriangle, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SuperAdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  created_by: string | null;
  email?: string;
  business_name?: string;
}

interface SuperAdminPermission {
  id: string;
  user_id: string;
  permission_key: string;
  granted_by: string | null;
  created_at: string;
}

interface BusinessProfile {
  user_id: string;
  business_name: string;
  business_email: string | null;
}

// Define all available super admin permissions
const SUPER_ADMIN_PERMISSIONS = [
  { key: "manage_users", label: "Manage Users", description: "View, suspend, and delete user accounts" },
  { key: "manage_subscriptions", label: "Manage Subscriptions", description: "Modify subscription plans and billing" },
  { key: "manage_roles", label: "Manage Roles", description: "Assign and revoke platform roles" },
  { key: "view_analytics", label: "View Analytics", description: "Access platform-wide analytics and reports" },
  { key: "manage_features", label: "Manage Features", description: "Control feature flags and access" },
  { key: "system_settings", label: "System Settings", description: "Modify platform configuration" },
  { key: "view_audit_logs", label: "View Audit Logs", description: "Access security and audit logs" },
  { key: "impersonate_users", label: "Impersonate Users", description: "Login as other users for support" },
  { key: "manage_credits", label: "Manage Credits", description: "Grant and revoke business credits" },
  { key: "send_announcements", label: "Send Announcements", description: "Create platform-wide announcements" },
  { key: "manage_integrations", label: "Manage Integrations", description: "Configure API keys and integrations" },
  { key: "database_access", label: "Database Access", description: "Direct database management tools" },
];

export const SuperAdminRoleManagement = () => {
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [permissions, setPermissions] = useState<SuperAdminPermission[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedAdmin, setSelectedAdmin] = useState<SuperAdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BusinessProfile[]>([]);
  const [confirmRemove, setConfirmRemove] = useState<SuperAdminUser | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch super admin roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "super_admin")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch all permissions
      const { data: permData, error: permError } = await supabase
        .from("super_admin_permissions")
        .select("*");

      if (permError) throw permError;

      // Fetch businesses for display
      const { data: bizData, error: bizError } = await supabase
        .from("business_profiles")
        .select("user_id, business_name, business_email")
        .order("business_name");

      if (bizError) throw bizError;

      // Enrich super admin data with business info
      const enrichedAdmins = (rolesData || []).map(role => {
        const business = (bizData || []).find(b => b.user_id === role.user_id);
        return {
          ...role,
          email: business?.business_email || undefined,
          business_name: business?.business_name || undefined,
        };
      });

      setSuperAdmins(enrichedAdmins);
      setPermissions(permData || []);
      setBusinesses(bizData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = businesses.filter(b => 
      b.business_name.toLowerCase().includes(query.toLowerCase()) ||
      b.business_email?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  const selectUser = (business: BusinessProfile) => {
    setSelectedUserId(business.user_id);
    setSearchQuery(business.business_email || business.business_name);
    setSearchResults([]);
  };

  const getUserDisplay = (userId: string) => {
    const business = businesses.find(b => b.user_id === userId);
    return business?.business_email || business?.business_name || userId.slice(0, 12) + "...";
  };

  const handleAddSuperAdmin = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      // Check if already super admin
      const existing = superAdmins.find(a => a.user_id === selectedUserId);
      if (existing) {
        toast({
          title: "Error",
          description: "User is already a Super Admin",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("user_roles").insert([{
        user_id: selectedUserId,
        role: "super_admin" as any,
        created_by: currentUser?.user?.id,
      }]);

      if (error) throw error;

      // Log audit event
      await supabase.from("audit_logs").insert({
        user_id: currentUser?.user?.id,
        action_type: "grant_super_admin",
        entity_type: "user_role",
        entity_id: selectedUserId,
        metadata: { granted_to: selectedUserId },
      });

      toast({
        title: "Success",
        description: "Super Admin role granted successfully",
      });
      
      setIsAddDialogOpen(false);
      setSelectedUserId("");
      setSearchQuery("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveSuperAdmin = async () => {
    if (!confirmRemove) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      // Don't allow removing yourself
      if (confirmRemove.user_id === currentUser?.user?.id) {
        toast({
          title: "Error",
          description: "You cannot remove your own Super Admin role",
          variant: "destructive",
        });
        setConfirmRemove(null);
        return;
      }

      // Remove the role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", confirmRemove.id);

      if (roleError) throw roleError;

      // Remove all permissions for this user
      await supabase
        .from("super_admin_permissions")
        .delete()
        .eq("user_id", confirmRemove.user_id);

      // Log audit event
      await supabase.from("audit_logs").insert({
        user_id: currentUser?.user?.id,
        action_type: "revoke_super_admin",
        entity_type: "user_role",
        entity_id: confirmRemove.user_id,
        metadata: { revoked_from: confirmRemove.user_id },
      });

      toast({
        title: "Success",
        description: "Super Admin role revoked successfully",
      });
      
      setConfirmRemove(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openPermissionDialog = (admin: SuperAdminUser) => {
    setSelectedAdmin(admin);
    
    // Initialize pending permissions
    const currentPerms: Record<string, boolean> = {};
    SUPER_ADMIN_PERMISSIONS.forEach(p => {
      currentPerms[p.key] = permissions.some(
        perm => perm.user_id === admin.user_id && perm.permission_key === p.key
      );
    });
    setPendingPermissions(currentPerms);
    setIsPermissionDialogOpen(true);
  };

  const togglePermission = (key: string) => {
    setPendingPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const savePermissions = async () => {
    if (!selectedAdmin) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      // Get current permissions for this user
      const currentPerms = permissions.filter(p => p.user_id === selectedAdmin.user_id);
      
      // Determine what to add and remove
      const toAdd: string[] = [];
      const toRemove: string[] = [];

      SUPER_ADMIN_PERMISSIONS.forEach(p => {
        const hasPerm = currentPerms.some(cp => cp.permission_key === p.key);
        const shouldHave = pendingPermissions[p.key];

        if (shouldHave && !hasPerm) {
          toAdd.push(p.key);
        } else if (!shouldHave && hasPerm) {
          toRemove.push(p.key);
        }
      });

      // Add new permissions
      if (toAdd.length > 0) {
        const insertData = toAdd.map(key => ({
          user_id: selectedAdmin.user_id,
          permission_key: key,
          granted_by: currentUser?.user?.id,
        }));
        
        const { error } = await supabase
          .from("super_admin_permissions")
          .insert(insertData);
        
        if (error) throw error;
      }

      // Remove revoked permissions
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("super_admin_permissions")
          .delete()
          .eq("user_id", selectedAdmin.user_id)
          .in("permission_key", toRemove);
        
        if (error) throw error;
      }

      // Log audit event
      await supabase.from("audit_logs").insert({
        user_id: currentUser?.user?.id,
        action_type: "update_super_admin_permissions",
        entity_type: "super_admin_permissions",
        entity_id: selectedAdmin.user_id,
        metadata: { 
          added: toAdd,
          removed: toRemove,
        },
      });

      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });

      setIsPermissionDialogOpen(false);
      setSelectedAdmin(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPermissionCount = (userId: string) => {
    return permissions.filter(p => p.user_id === userId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10">
                <Crown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{superAdmins.length}</p>
                <p className="text-sm text-muted-foreground">Super Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/10">
                <Key className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{permissions.length}</p>
                <p className="text-sm text-muted-foreground">Active Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{SUPER_ADMIN_PERMISSIONS.length}</p>
                <p className="text-sm text-muted-foreground">Permission Types</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-red-500" />
                Super Admin Management
              </CardTitle>
              <CardDescription>
                Manage platform-wide administrative access and permissions
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" variant="destructive">
                  <Plus className="w-4 h-4" />
                  Add Super Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Grant Super Admin Access</DialogTitle>
                  <DialogDescription>
                    Super Admins have platform-wide access. Grant this role carefully.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div className="flex gap-2 items-start">
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Security Warning</p>
                        <p className="text-xs text-muted-foreground">
                          Super Admin access grants full control over the platform. Only grant to trusted individuals.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Search User by Business</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by business name or email..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg max-h-48 overflow-y-auto">
                        {searchResults.map((business) => (
                          <button
                            key={business.user_id}
                            onClick={() => selectUser(business)}
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                          >
                            <p className="font-medium">{business.business_name}</p>
                            <p className="text-sm text-muted-foreground">{business.business_email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedUserId && (
                      <p className="text-sm text-green-600">
                        Selected: {getUserDisplay(selectedUserId)}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleAddSuperAdmin} 
                      disabled={!selectedUserId}
                    >
                      Grant Super Admin
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admins">
            <TabsList className="mb-4">
              <TabsTrigger value="admins">Super Admins ({superAdmins.length})</TabsTrigger>
              <TabsTrigger value="permissions">Permission Reference</TabsTrigger>
            </TabsList>

            <TabsContent value="admins">
              {superAdmins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No Super Admins assigned</p>
                  <p className="text-sm">Add a Super Admin to manage the platform</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {superAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-red-500/10">
                          <Crown className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {admin.business_name || admin.email || admin.user_id.slice(0, 12) + "..."}
                            </span>
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                              SUPER ADMIN
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {admin.email && <span>{admin.email}</span>}
                            <span>•</span>
                            <span>{getPermissionCount(admin.user_id)} permissions</span>
                            <span>•</span>
                            <span>Since {new Date(admin.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissionDialog(admin)}
                          className="gap-1"
                        >
                          <Key className="w-4 h-4" />
                          Permissions
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmRemove(admin)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="permissions">
              <div className="grid gap-3 sm:grid-cols-2">
                {SUPER_ADMIN_PERMISSIONS.map((perm) => (
                  <div
                    key={perm.key}
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="font-medium">{perm.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{perm.description}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Permission Dialog */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>
              Configure granular permissions for {selectedAdmin?.business_name || selectedAdmin?.email || "Super Admin"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {SUPER_ADMIN_PERMISSIONS.map((perm) => (
              <div
                key={perm.key}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium">{perm.label}</p>
                  <p className="text-sm text-muted-foreground">{perm.description}</p>
                </div>
                <Switch
                  checked={pendingPermissions[perm.key] || false}
                  onCheckedChange={() => togglePermission(perm.key)}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsPermissionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePermissions}>
              Save Permissions
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Super Admin Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all Super Admin privileges and permissions from{" "}
              <span className="font-semibold">
                {confirmRemove?.business_name || confirmRemove?.email || "this user"}
              </span>
              . This action can be undone by re-granting access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveSuperAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

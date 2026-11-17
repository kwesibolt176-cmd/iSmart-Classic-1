import { useEffect, useState } from "react";
import { Shield, Plus, Trash2, UserCheck, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  created_by: string | null;
}

interface BusinessProfile {
  user_id: string;
  business_name: string;
  business_email: string | null;
}

const roleDescriptions = {
  admin: "Full access to all features and settings",
  manager: "Manage staff, inventory, and view reports",
  cashier: "Process sales and handle payments",
  kitchen_staff: "View and manage kitchen orders",
  inventory_manager: "Manage inventory and stock levels",
  super_admin: "Platform-wide administrative access",
};

const roleColors = {
  admin: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  manager: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  cashier: "bg-green-500/10 text-green-500 border-green-500/20",
  kitchen_staff: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  inventory_manager: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  super_admin: "bg-red-500/10 text-red-500 border-red-500/20",
};

export const RoleManagementTab = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BusinessProfile[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoles();
    fetchBusinesses();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("user_id, business_name, business_email")
        .order("business_name");

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error: any) {
      console.error("Error fetching businesses:", error);
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

  const handleAddRole = async () => {
    if (!selectedRole || !selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user and role",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      // Check if user already has this role
      const existingRole = roles.find(r => r.user_id === selectedUserId && r.role === selectedRole);
      if (existingRole) {
        toast({
          title: "Error",
          description: "User already has this role",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("user_roles").insert([{
        user_id: selectedUserId,
        role: selectedRole as any,
        created_by: currentUser?.user?.id,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role assigned successfully",
      });
      
      setIsDialogOpen(false);
      setSelectedRole("");
      setSelectedUserId("");
      setSearchQuery("");
      fetchRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role removed successfully",
      });
      
      fetchRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Platform Role Management
            </CardTitle>
            <CardDescription>
              Assign and manage user roles across the platform
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Role to User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
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
                <div className="space-y-2">
                  <Label>Select Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="kitchen_staff">Kitchen Staff</SelectItem>
                      <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedRole && (
                    <p className="text-sm text-muted-foreground">
                      {roleDescriptions[selectedRole as keyof typeof roleDescriptions]}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddRole} disabled={!selectedRole || !selectedUserId}>
                    Assign Role
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No roles assigned yet</p>
              <p className="text-sm">Assign roles to control user access</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={roleColors[role.role as keyof typeof roleColors]}
                        >
                          {role.role.replace("_", " ").toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {getUserDisplay(role.user_id)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {roleDescriptions[role.role as keyof typeof roleDescriptions]}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRole(role.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

import { useEffect, useState } from "react";
import { Shield, Plus, Trash2, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

const roleDescriptions = {
  admin: "Full access to all features and settings",
  manager: "Manage staff, inventory, and view reports",
  cashier: "Process sales and handle payments",
  kitchen_staff: "View and manage kitchen orders",
  inventory_manager: "Manage inventory and stock levels",
};

const roleColors = {
  admin: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  manager: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  cashier: "bg-green-500/10 text-green-500 border-green-500/20",
  kitchen_staff: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  inventory_manager: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
};

export const RoleManagement = () => {
  const { user } = useBusiness();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRoles(data || []);
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

  const handleAddRole = async () => {
    if (!selectedRole || !user) return;

    try {
      const { error } = await supabase.from("user_roles").insert([{
        user_id: user.id,
        role: selectedRole as any,
        created_by: user.id,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role assigned successfully",
      });
      
      setIsDialogOpen(false);
      setSelectedRole("");
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
              Role Management
            </CardTitle>
            <CardDescription>
              Assign roles to control access and permissions
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
                <DialogTitle>Assign Role</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
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
                  <Button onClick={handleAddRole} disabled={!selectedRole}>
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
              <p className="text-sm">Assign roles to control feature access</p>
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
                      <Badge
                        variant="outline"
                        className={roleColors[role.role as keyof typeof roleColors]}
                      >
                        {role.role.replace("_", " ").toUpperCase()}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
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

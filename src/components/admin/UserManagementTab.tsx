import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Users, UserCheck, UserX, Calendar, MoreHorizontal, Ban, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface User {
  id: string;
  user_id: string;
  business_name: string;
  business_email: string | null;
  plan_tier: string | null;
  created_at: string;
  is_suspended: boolean | null;
  industry: string;
}

export const UserManagementTab = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'suspend' | 'activate'; user: User | null }>({
    open: false,
    type: 'suspend',
    user: null
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("business_profiles")
      .select("id, user_id, business_name, business_email, plan_tier, created_at, is_suspended, industry")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleSuspendUser = async (user: User) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ is_suspended: true })
        .eq("id", user.id);

      if (error) throw error;

      // Log the action
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from("audit_logs").insert({
          user_id: currentUser.id,
          action_type: "suspend_user",
          entity_type: "business_profile",
          entity_id: user.id,
          old_data: { is_suspended: false },
          new_data: { is_suspended: true },
          metadata: { business_name: user.business_name }
        } as never);
      }

      toast.success(`${user.business_name} has been suspended`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleActivateUser = async (user: User) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ is_suspended: false })
        .eq("id", user.id);

      if (error) throw error;

      // Log the action
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from("audit_logs").insert({
          user_id: currentUser.id,
          action_type: "activate_user",
          entity_type: "business_profile",
          entity_id: user.id,
          old_data: { is_suspended: true },
          new_data: { is_suspended: false },
          metadata: { business_name: user.business_name }
        } as never);
      }

      toast.success(`${user.business_name} has been activated`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const confirmAction = () => {
    if (!actionDialog.user) return;
    
    if (actionDialog.type === 'suspend') {
      handleSuspendUser(actionDialog.user);
    } else {
      handleActivateUser(actionDialog.user);
    }
    setActionDialog({ open: false, type: 'suspend', user: null });
  };

  const filteredUsers = users.filter(user =>
    user.business_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.is_suspended).length;
  const suspendedUsers = users.filter(u => u.is_suspended).length;
  const thisMonthUsers = users.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Suspended</span>
            </div>
            <p className="text-2xl font-bold mt-1">{suspendedUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">This Month</span>
            </div>
            <p className="text-2xl font-bold mt-1">{thisMonthUsers}</p>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>All Users</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading users...</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.business_name}</TableCell>
                        <TableCell>{user.business_email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.industry}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.plan_tier === "enterprise" ? "default" : "secondary"}>
                            {user.plan_tier || "free"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_suspended ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(user.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                View Details
                              </DropdownMenuItem>
                              {user.is_suspended ? (
                                <DropdownMenuItem 
                                  onClick={() => setActionDialog({ open: true, type: 'activate', user })}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" /> Activate User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => setActionDialog({ open: true, type: 'suspend', user })}
                                  className="text-destructive"
                                >
                                  <Ban className="w-4 h-4 mr-2" /> Suspend User
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{selectedUser.user_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium">{selectedUser.business_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{selectedUser.business_email || "Not set"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <Badge variant="outline">{selectedUser.industry}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <Badge>{selectedUser.plan_tier || "free"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {selectedUser.is_suspended ? (
                  <Badge variant="destructive">Suspended</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p>{format(new Date(selectedUser.created_at), "PPpp")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === 'suspend' ? 'Suspend User' : 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === 'suspend' 
                ? `Are you sure you want to suspend ${actionDialog.user?.business_name}? They will lose access to the platform.`
                : `Are you sure you want to activate ${actionDialog.user?.business_name}? They will regain access to the platform.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              className={actionDialog.type === 'suspend' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {actionDialog.type === 'suspend' ? 'Suspend' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

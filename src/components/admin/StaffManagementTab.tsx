import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Mail, UserCheck, Clock, Building2, Shield, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface StaffRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  is_active: boolean;
  auth_user_id: string | null;
  invitation_sent_at: string | null;
  invitation_accepted_at: string | null;
  created_at: string;
  business_name: string;
  role_name: string | null;
}

interface StaffRole {
  id: string;
  name: string;
  business_name: string;
  permissions: Record<string, boolean>;
  staff_count: number;
}

export const StaffManagementTab = () => {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"staff" | "roles">("staff");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStaff(), fetchRoles()]);
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select(`
          id,
          name,
          email,
          phone,
          position,
          is_active,
          auth_user_id,
          invitation_sent_at,
          invitation_accepted_at,
          created_at,
          user_id,
          role_id
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch business names for each staff
      const staffWithBusiness: StaffRecord[] = [];
      for (const member of data || []) {
        const { data: business } = await supabase
          .from("business_profiles")
          .select("business_name")
          .eq("user_id", member.user_id)
          .maybeSingle();

        let roleName = null;
        if (member.role_id) {
          const { data: role } = await supabase
            .from("staff_roles")
            .select("name")
            .eq("id", member.role_id)
            .maybeSingle();
          roleName = role?.name || null;
        }

        staffWithBusiness.push({
          ...member,
          business_name: business?.business_name || "Unknown",
          role_name: roleName,
        });
      }

      setStaff(staffWithBusiness);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast({ title: "Failed to load staff", variant: "destructive" });
    }
  };

  const fetchRoles = async () => {
    try {
      const { data: rolesData, error } = await supabase
        .from("staff_roles")
        .select("id, name, permissions, user_id, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rolesWithDetails: StaffRole[] = [];
      for (const role of rolesData || []) {
        const { data: business } = await supabase
          .from("business_profiles")
          .select("business_name")
          .eq("user_id", role.user_id)
          .maybeSingle();

        const { count } = await supabase
          .from("staff")
          .select("id", { count: "exact", head: true })
          .eq("role_id", role.id);

        rolesWithDetails.push({
          id: role.id,
          name: role.name,
          business_name: business?.business_name || "Unknown",
          permissions: role.permissions as Record<string, boolean>,
          staff_count: count || 0,
        });
      }

      setRoles(rolesWithDetails);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const getStaffStatus = (member: StaffRecord) => {
    if (member.auth_user_id) return "active";
    if (member.invitation_sent_at && !member.invitation_accepted_at) return "pending";
    return "no-invite";
  };

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.business_name.toLowerCase().includes(searchQuery.toLowerCase());

    const status = getStaffStatus(member);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && status === "active") ||
      (statusFilter === "pending" && status === "pending") ||
      (statusFilter === "no-invite" && status === "no-invite");

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.auth_user_id).length,
    pending: staff.filter((s) => s.invitation_sent_at && !s.invitation_accepted_at).length,
    noInvite: staff.filter((s) => !s.invitation_sent_at && !s.auth_user_id).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">With Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.noInvite}</p>
                <p className="text-sm text-muted-foreground">No Invite Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "staff" ? "default" : "outline"}
          onClick={() => setActiveTab("staff")}
        >
          <Users className="w-4 h-4 mr-2" />
          Staff Members
        </Button>
        <Button
          variant={activeTab === "roles" ? "default" : "outline"}
          onClick={() => setActiveTab("roles")}
        >
          <Shield className="w-4 h-4 mr-2" />
          Roles ({roles.length})
        </Button>
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {activeTab === "staff" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>All Staff Members</CardTitle>
                <CardDescription>View and manage staff across all businesses</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Has Account</SelectItem>
                    <SelectItem value="pending">Pending Invite</SelectItem>
                    <SelectItem value="no-invite">No Invite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => {
                    const status = getStaffStatus(member);
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {member.business_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.role_name ? (
                            <Badge variant="secondary">{member.role_name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No role</span>
                          )}
                        </TableCell>
                        <TableCell>{member.email || "-"}</TableCell>
                        <TableCell>
                          {status === "active" && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                          {status === "pending" && (
                            <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {status === "no-invite" && (
                            <Badge variant="outline">No Invite</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(member.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredStaff.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No staff found matching your criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "roles" && (
        <Card>
          <CardHeader>
            <CardTitle>All Custom Roles</CardTitle>
            <CardDescription>View roles created by businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Staff Using</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {role.business_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(role.permissions || {})
                          .filter(([_, v]) => v)
                          .slice(0, 3)
                          .map(([key]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}
                            </Badge>
                          ))}
                        {Object.values(role.permissions || {}).filter(Boolean).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.values(role.permissions).filter(Boolean).length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.staff_count} staff</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No custom roles created yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

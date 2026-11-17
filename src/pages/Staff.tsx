import { useState, useEffect } from "react";
import { UserPlus, Loader2, Mail, CheckCircle, Users, Clock, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffCard } from "@/components/StaffCard";
import { NewStaffDialog } from "@/components/NewStaffDialog";
import { TimeTrackingCard } from "@/components/TimeTrackingCard";
import { StaffRoleManagement } from "@/components/StaffRoleManagement";
import { StaffInviteDialog } from "@/components/StaffInviteDialog";
import { StaffCommissionTipTracker } from "@/components/StaffCommissionTipTracker";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { MerchantTeamsPanel } from "@/components/merchant/MerchantIntegrationPanels";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "on-break";
  avatar?: string;
  shift?: string;
  pin?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  invitationSent?: boolean;
  invitationAccepted?: boolean;
  authUserId?: string | null;
  accessStatus?: "active" | "suspended" | "revoked";
  revokedAt?: string | null;
  revokeReason?: string | null;
  businessCount?: number;
  locationId?: string | null;
  locationName?: string | null;
}

export const Staff = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const { user } = useBusiness();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchStaff();
    }
  }, [user?.id]);

  const fetchStaff = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff")
        .select(`
          *,
          staff_roles (id, name),
          locations (id, name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get multi-business counts for staff with auth accounts
      const authUserIds = (data || [])
        .filter(m => m.auth_user_id)
        .map(m => m.auth_user_id);

      const businessCounts: Record<string, number> = {};
      if (authUserIds.length > 0) {
        const { data: countData } = await supabase
          .from("staff")
          .select("auth_user_id")
          .in("auth_user_id", authUserIds);
        
        if (countData) {
          countData.forEach(item => {
            if (item.auth_user_id) {
              businessCounts[item.auth_user_id] = (businessCounts[item.auth_user_id] || 0) + 1;
            }
          });
        }
      }

      setStaff((data || []).map(member => ({
        id: member.id,
        name: member.name,
        role: (member.staff_roles as any)?.name || member.position || "Staff",
        email: member.email || "",
        phone: member.phone || "",
        status: member.is_active ? "active" : "inactive",
        pin: member.pin,
        roleId: member.role_id,
        roleName: (member.staff_roles as any)?.name || null,
        invitationSent: !!member.invitation_sent_at,
        invitationAccepted: !!member.invitation_accepted_at,
        authUserId: member.auth_user_id,
        accessStatus: (member.access_status as "active" | "suspended" | "revoked") || "active",
        revokedAt: member.revoked_at,
        revokeReason: member.revoke_reason,
        businessCount: member.auth_user_id ? businessCounts[member.auth_user_id] : undefined,
        locationId: member.location_id,
        locationName: (member.locations as any)?.name || null,
      })));
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast({
        title: "Error",
        description: "Failed to load staff",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = (member: StaffMember) => {
    setSelectedStaff(member);
    setInviteDialogOpen(true);
  };

  const activeStaff = staff.filter((s) => s.status === "active");
  const onBreak = staff.filter((s) => s.status === "on-break");
  const inactive = staff.filter((s) => s.status === "inactive");

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Team Management"
        description="Oversee your workforce, manage roles and permissions, and track staff performance."
        rightContent={<Users className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
        <MerchantTeamsPanel />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10 shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-foreground">Staff Directory</h3>
            <p className="text-sm text-muted-foreground">{staff.length} team members • {activeStaff.length} currently active</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/20">
            <UserPlus className="w-4 h-4" />
            Add Team Member
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Staff</p>
                  <p className="text-2xl font-bold text-foreground">{staff.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-[hsl(217_91%_60%)]/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[hsl(217_91%_60%)]/10 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-[hsl(217_91%_60%)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</p>
                  <p className="text-2xl font-bold text-[hsl(217_91%_60%)]">{activeStaff.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-orange-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On Break</p>
                  <p className="text-2xl font-bold text-orange-600">{onBreak.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-[hsl(217_91%_60%)]/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[hsl(217_91%_60%)]/10 rounded-xl">
                  <ShieldAlert className="h-6 w-6 text-[hsl(217_91%_60%)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Off Duty</p>
                  <p className="text-2xl font-bold text-[hsl(217_91%_60%)]">{inactive.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="staff" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="staff">Staff Members</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="commissions">Commissions & Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="xl:col-span-1">
                <TimeTrackingCard />
              </div>
              <div className="xl:col-span-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {staff.map((member) => (
                    <StaffCard 
                      key={member.id} 
                      member={member} 
                      onInvite={handleInvite}
                      onStatusChanged={fetchStaff}
                    />
                  ))}
                </div>
                {staff.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No staff members yet. Add your first team member to get started.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>


          <TabsContent value="roles">
            <StaffRoleManagement />
          </TabsContent>

          <TabsContent value="commissions">
            <StaffCommissionTipTracker />
          </TabsContent>
        </Tabs>
      </div>

      <NewStaffDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onStaffAdded={fetchStaff}
      />

      {selectedStaff && (
        <StaffInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          staffId={selectedStaff.id}
          staffName={selectedStaff.name}
          staffEmail={selectedStaff.email}
          staffPhone={selectedStaff.phone}
          staffPin={selectedStaff.pin}
          currentRoleId={selectedStaff.roleId || null}
          onInviteSent={fetchStaff}
        />
      )}
    </div>
  );
};

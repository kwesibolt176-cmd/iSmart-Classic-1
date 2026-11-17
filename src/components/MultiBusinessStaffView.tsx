import { useState, useEffect } from "react";
import { Building2, Shield, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BusinessAssignment {
  id: string;
  businessName: string;
  roleName: string;
  status: string;
  assignedAt: string;
}

interface MultiBusinessStaffViewProps {
  authUserId: string;
}

export const MultiBusinessStaffView = ({ authUserId }: MultiBusinessStaffViewProps) => {
  const [assignments, setAssignments] = useState<BusinessAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, [authUserId]);

  const fetchAssignments = async () => {
    try {
      // Get all staff records for this auth user across businesses
      const { data: staffRecords, error } = await supabase
        .from("staff")
        .select(`
          id,
          user_id,
          access_status,
          created_at,
          staff_roles (name)
        `)
        .eq("auth_user_id", authUserId);

      if (error) throw error;

      if (!staffRecords || staffRecords.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Fetch business names for each assignment
      const businessUserIds = [...new Set(staffRecords.map(s => s.user_id))];
      const { data: businesses } = await supabase
        .from("business_profiles")
        .select("user_id, business_name")
        .in("user_id", businessUserIds);

      const businessMap = new Map(businesses?.map(b => [b.user_id, b.business_name]) || []);

      const mappedAssignments: BusinessAssignment[] = staffRecords.map(staff => ({
        id: staff.id,
        businessName: businessMap.get(staff.user_id) || "Unknown Business",
        roleName: (staff.staff_roles as any)?.name || "Staff",
        status: staff.access_status || "active",
        assignedAt: staff.created_at,
      }));

      setAssignments(mappedAssignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast({ title: "Failed to load business assignments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "suspended":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "revoked":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Shield className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Suspended</Badge>;
      case "revoked":
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="w-5 h-5" />
          Business Assignments
        </CardTitle>
        <CardDescription>
          Staff member is assigned to {assignments.length} business{assignments.length > 1 ? "es" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(assignment.status)}
                <div>
                  <p className="font-medium">{assignment.businessName}</p>
                  <p className="text-sm text-muted-foreground">{assignment.roleName}</p>
                </div>
              </div>
              {getStatusBadge(assignment.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from "react";
import { 
  Shield, ShieldOff, Clock, AlertTriangle, 
  MoreVertical, UserX, RefreshCw, Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";

interface StaffAccessManagementProps {
  staffId: string;
  staffName: string;
  currentStatus: string;
  authUserId: string | null;
  onStatusChanged: () => void;
}

export const StaffAccessManagement = ({
  staffId,
  staffName,
  currentStatus,
  authUserId,
  onStatusChanged,
}: StaffAccessManagementProps) => {
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [suspendUntil, setSuspendUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useBusiness();
  const { toast } = useToast();

  const handleRevokeAccess = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("staff")
        .update({
          access_status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          revoke_reason: reason || "Access revoked by business owner",
          is_active: false,
        })
        .eq("id", staffId);

      if (error) throw error;

      toast({ title: "Access revoked", description: `${staffName}'s access has been revoked` });
      setRevokeDialogOpen(false);
      setReason("");
      onStatusChanged();
    } catch (error) {
      console.error("Error revoking access:", error);
      toast({ title: "Failed to revoke access", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendAccess = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("staff")
        .update({
          access_status: "suspended",
          suspended_at: new Date().toISOString(),
          suspended_until: suspendUntil ? new Date(suspendUntil).toISOString() : null,
          revoke_reason: reason || "Temporarily suspended",
          is_active: false,
        })
        .eq("id", staffId);

      if (error) throw error;

      toast({ title: "Access suspended", description: `${staffName}'s access has been suspended` });
      setSuspendDialogOpen(false);
      setReason("");
      setSuspendUntil("");
      onStatusChanged();
    } catch (error) {
      console.error("Error suspending access:", error);
      toast({ title: "Failed to suspend access", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReinstateAccess = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("staff")
        .update({
          access_status: "active",
          revoked_at: null,
          revoked_by: null,
          revoke_reason: null,
          suspended_at: null,
          suspended_until: null,
          is_active: true,
        })
        .eq("id", staffId);

      if (error) throw error;

      toast({ title: "Access reinstated", description: `${staffName}'s access has been restored` });
      onStatusChanged();
    } catch (error) {
      console.error("Error reinstating access:", error);
      toast({ title: "Failed to reinstate access", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "revoked":
        return <Badge variant="destructive" className="gap-1"><ShieldOff className="w-3 h-3" />Revoked</Badge>;
      case "suspended":
        return <Badge variant="secondary" className="gap-1 bg-orange-500/10 text-orange-600"><Clock className="w-3 h-3" />Suspended</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600"><Shield className="w-3 h-3" />Active</Badge>;
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {currentStatus === "active" && (
              <>
                <DropdownMenuItem 
                  onClick={() => setSuspendDialogOpen(true)}
                  className="text-orange-600"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Suspend Temporarily
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setRevokeDialogOpen(true)}
                  className="text-destructive"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Revoke Access
                </DropdownMenuItem>
              </>
            )}
            {(currentStatus === "revoked" || currentStatus === "suspended") && (
              <DropdownMenuItem onClick={handleReinstateAccess} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reinstate Access
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              Revoke Access for {staffName}
            </DialogTitle>
            <DialogDescription>
              This will permanently remove this staff member's access. They won't be able to log in or use the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                This action will deactivate their account immediately. You can reinstate access later if needed.
              </p>
            </div>
            <div>
              <Label>Reason for Revocation (Optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Employment ended, policy violation..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setRevokeDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRevokeAccess} disabled={loading} className="flex-1">
                {loading ? "Revoking..." : "Revoke Access"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Clock className="w-5 h-5" />
              Suspend {staffName} Temporarily
            </DialogTitle>
            <DialogDescription>
              Temporarily suspend this staff member's access. You can set an end date or reinstate manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Suspend Until (Optional)</Label>
              <Input
                type="date"
                value={suspendUntil}
                onChange={(e) => setSuspendUntil(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for indefinite suspension
              </p>
            </div>
            <div>
              <Label>Reason (Optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Leave of absence, investigation..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSuspendAccess} 
                disabled={loading}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {loading ? "Suspending..." : "Suspend Access"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

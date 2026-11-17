import { StaffMember } from "@/pages/Staff";
import { Phone, Mail, Clock, Shield, Send, CheckCircle, UserCheck, ShieldOff, Building2, MapPin, Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffAccessManagement } from "./StaffAccessManagement";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StaffCardProps {
  member: StaffMember;
  onInvite?: (member: StaffMember) => void;
  onStatusChanged?: () => void;
}


const statusConfig = {
  active: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Active",
  },
  "on-break": {
    bg: "bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-500",
    label: "On Break",
  },
  inactive: {
    bg: "bg-muted/50 border-border",
    dot: "bg-muted-foreground",
    label: "Off Duty",
  },
};

const accessStatusConfig = {
  active: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    label: "Access Active",
    icon: Shield,
  },
  suspended: {
    bg: "bg-orange-500/10 border-orange-500/20",
    label: "Suspended",
    icon: Clock,
  },
  revoked: {
    bg: "bg-destructive/10 border-destructive/20",
    label: "Revoked",
    icon: ShieldOff,
  },
};

export const StaffCard = ({ member, onInvite, onStatusChanged }: StaffCardProps) => {
  const config = statusConfig[member.status];
  const accessConfig = accessStatusConfig[member.accessStatus || "active"];
  const hasAccount = !!member.authUserId;
  const invitePending = member.invitationSent && !member.invitationAccepted;
  const isAccessRestricted = member.accessStatus === "revoked" || member.accessStatus === "suspended";
  const { locations } = useLocation();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("staff").delete().eq("id", member.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Staff removed", description: `${member.name} has been deleted.` });
    setConfirmDelete(false);
    onStatusChanged?.();
  };


  const assignToBranch = async (locationId: string | null) => {
    const { error } = await supabase
      .from("staff")
      .update({ location_id: locationId })
      .eq("id", member.id);
    if (error) {
      toast({ title: "Failed to update branch", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Branch updated",
      description: locationId
        ? `${member.name} assigned to ${locations.find((l) => l.id === locationId)?.name || "branch"}`
        : `${member.name} unassigned from any branch`,
    });
    onStatusChanged?.();
  };

  return (
    <div className={cn(
      "bg-card rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6",
      isAccessRestricted ? accessConfig.bg : config.bg
    )}>
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <div className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center",
              isAccessRestricted ? "bg-muted" : "bg-primary/10"
            )}>
              <span className={cn(
                "text-base sm:text-lg font-semibold",
                isAccessRestricted ? "text-muted-foreground" : "text-primary"
              )}>
                {member.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <div className={cn(
              "absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-card",
              isAccessRestricted ? "bg-muted-foreground" : config.dot
            )} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn(
              "font-semibold text-sm sm:text-base truncate",
              isAccessRestricted ? "text-muted-foreground" : "text-foreground"
            )}>
              {member.name}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{member.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {member.roleName && (
            <Badge variant="secondary" className="text-xs">
              {member.roleName}
            </Badge>
          )}
          {onStatusChanged && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete staff
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>


      <div className="space-y-1.5 sm:space-y-2">
        {member.email && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Mail className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
        )}
        {member.phone && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Phone className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{member.phone}</span>
          </div>
        )}
        {member.shift && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <span>{member.shift}</span>
          </div>
        )}
        {locations.length > 0 && (
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">
                {member.locationName || "All branches"}
              </span>
            </div>
            {onStatusChanged && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">
                    Change
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => assignToBranch(null)}>
                    All branches
                  </DropdownMenuItem>
                  {locations.map((loc) => (
                    <DropdownMenuItem
                      key={loc.id}
                      onClick={() => assignToBranch(loc.id)}
                      disabled={loc.id === member.locationId}
                    >
                      {loc.name}
                      {loc.id === member.locationId && " ✓"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
        {member.businessCount && member.businessCount > 1 && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-primary">
            <Building2 className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <span>Works at {member.businessCount} businesses</span>
          </div>
        )}
      </div>

      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", 
            isAccessRestricted ? accessConfig.bg : config.bg
          )}>
            {isAccessRestricted ? accessConfig.label : config.label}
          </span>
          <div className="flex items-center gap-2">
            {member.pin && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" />
                <span>PIN</span>
              </div>
            )}
            {hasAccount && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <UserCheck className="w-3 h-3" />
                <span>Account</span>
              </div>
            )}
          </div>
        </div>

        {/* Access Management for staff with accounts */}
        {hasAccount && onStatusChanged && (
          <div className="pt-2">
            <StaffAccessManagement
              staffId={member.id}
              staffName={member.name}
              currentStatus={member.accessStatus || "active"}
              authUserId={member.authUserId}
              onStatusChanged={onStatusChanged}
            />
          </div>
        )}

        {!hasAccount && onInvite && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onInvite(member)}
          >
            {invitePending ? (
              <>
                <Clock className="w-3 h-3 mr-1" />
                Resend Invite
              </>
            ) : (
              <>
                <Send className="w-3 h-3 mr-1" />
                Send Invite
              </>
            )}
          </Button>
        )}

        {hasAccount && !onStatusChanged && (
          <div className="flex items-center justify-center gap-1 text-xs text-green-600 bg-green-500/10 rounded-lg py-1.5">
            <CheckCircle className="w-3 h-3" />
            <span>Logged in via email</span>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the staff record. Their login account (if any) will lose access immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

};

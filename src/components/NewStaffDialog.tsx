import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { getIndustryRoles } from "@/lib/industry-roles";
import { describeInviteDelivery } from "@/lib/staff-invite-delivery";

interface StaffRole {
  id: string;
  name: string;
}

interface NewStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStaffAdded?: () => void;
}

export const NewStaffDialog = ({ open, onOpenChange, onStaffAdded }: NewStaffDialogProps) => {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    shift: "",
    locationId: "",
  });
  const [loading, setLoading] = useState(false);
  const { user, profile } = useBusiness();
  const { locations, currentLocation } = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user && open) {
      fetchRoles();
      loadSuggestedRoles();
      if (currentLocation && !formData.locationId) {
        setFormData((p) => ({ ...p, locationId: currentLocation.id }));
      }
    }
  }, [user, open, profile?.industry, currentLocation?.id]);

  const fetchRoles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("staff_roles")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true);
    setRoles(data || []);
  };

  const loadSuggestedRoles = () => {
    const industryRoles = getIndustryRoles(profile?.industry);
    setSuggestedRoles(industryRoles.map(role => role.name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    try {
      // Generate a secure invitation token
      const invitationToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

      const { data: insertedStaff, error } = await supabase
        .from("staff")
        .insert({
          user_id: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          position: formData.role,
          location_id: formData.locationId || null,
          is_active: true,
          invitation_token: invitationToken,
          invitation_sent_at: new Date().toISOString(),
          access_status: "invited",
        })
        .select("id")
        .single();

      if (error) throw error;

      // Build the invite URL pointing at the staff accept page
      const inviteUrl = `${window.location.origin}/staff-invite?token=${invitationToken}`;

      // Send invitation email (always — that's how the staff gets the link)
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke("send-staff-invitation", {
        body: {
          staffName: formData.name,
          staffEmail: formData.email,
          staffPhone: formData.phone,
          businessName: profile.business_name,
          sendEmail: !!formData.email,
          sendSms: !!formData.phone,
          inviteUrl,
          roleName: formData.role,
        },
      });

      if (inviteError) console.error("Staff invitation delivery failed");
      const outcome = describeInviteDelivery(formData.name, inviteData, Boolean(inviteError));
      toast({
        title: outcome.title,
        description: outcome.description,
        variant: outcome.ok ? undefined : "destructive",
      });

      onStaffAdded?.();
      onOpenChange(false);
      setFormData({ name: "", email: "", phone: "", role: "", shift: "", locationId: "" });
    } catch (error: any) {
      console.error("Error adding staff:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>Add a new team member to your business.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
              id="phone"
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {/* Show existing custom roles first */}
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
                
                {/* Show suggested industry roles if no custom roles exist */}
                {roles.length === 0 && suggestedRoles.map((roleName) => (
                  <SelectItem key={roleName} value={roleName}>
                    {roleName}
                  </SelectItem>
                ))}
                
                {/* Fallback generic roles */}
                {roles.length === 0 && suggestedRoles.length === 0 && (
                  <>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {roles.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Create custom roles in Staff Management for more options
              </p>
            )}
          </div>

          {locations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="branch">Branch / Location</Label>
              <Select
                value={formData.locationId || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, locationId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All branches / Unassigned</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Staff will only see data for the branch they're assigned to.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <Select value={formData.shift} onValueChange={(value) => setFormData({ ...formData, shift: value })}>
              <SelectTrigger id="shift">
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning (9AM - 5PM)</SelectItem>
                <SelectItem value="evening">Evening (5PM - 11PM)</SelectItem>
                <SelectItem value="allday">All Day (9AM - 9PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-sm text-muted-foreground">
            An invitation link will be emailed to the staff member. They'll set
            their own password and 4-digit PIN when they accept the invite.
          </div>


          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Adding..." : "Add Staff Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from "react";
import { Mail, Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { describeInviteDelivery } from "@/lib/staff-invite-delivery";

interface StaffRole {
  id: string;
  name: string;
}

interface StaffInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  staffEmail: string;
  staffPhone?: string;
  staffPin?: string | null;
  currentRoleId?: string | null;
  onInviteSent: () => void;
}

export const StaffInviteDialog = ({
  open,
  onOpenChange,
  staffId,
  staffName,
  staffEmail,
  staffPhone = "",
  staffPin = null,
  currentRoleId = null,
  onInviteSent,
}: StaffInviteDialogProps) => {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedRoleName, setSelectedRoleName] = useState<string>("");
  const [email, setEmail] = useState(staffEmail);
  const [phone, setPhone] = useState(staffPhone);
  const [sendEmailInvite, setSendEmailInvite] = useState(true);
  const [sendSmsInvite, setSendSmsInvite] = useState(!!staffPhone);
  const [sending, setSending] = useState(false);
  const { user, profile } = useBusiness();
  const { toast } = useToast();

  useEffect(() => {
    if (user && open) {
      fetchRoles();
      setEmail(staffEmail);
      setPhone(staffPhone);
      setSendSmsInvite(!!staffPhone);
    }
  }, [user, open, staffEmail, staffPhone, currentRoleId]);

  const fetchRoles = async () => {
    if (!user) return;
    setLoadingRoles(true);
    const { data, error } = await supabase
      .from("staff_roles")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("name");
    setLoadingRoles(false);
    if (error) {
      console.error("Failed to load roles", error);
    }
    const list = data || [];
    setRoles(list);
    // Preselect current role if it exists, else first role
    const preferred = currentRoleId && list.find(r => r.id === currentRoleId);
    if (preferred) {
      setSelectedRoleId(preferred.id);
      setSelectedRoleName(preferred.name);
    } else if (list.length > 0) {
      setSelectedRoleId(list[0].id);
      setSelectedRoleName(list[0].name);
    } else {
      setSelectedRoleId("");
      setSelectedRoleName("");
    }
  };

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    const role = roles.find(r => r.id === roleId);
    setSelectedRoleName(role?.name || "");
  };

  const handleSendInvite = async () => {
    if (!user || !profile || (!email && !phone)) {
      toast({ title: "Please provide email or phone", variant: "destructive" });
      return;
    }

    if (!sendEmailInvite && !sendSmsInvite) {
      toast({ title: "Please select at least one channel", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Generate invitation token
      const invitationToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const inviteUrl = `${window.location.origin}/staff-invite?token=${invitationToken}`;

      // Update staff record with invitation details
      const { error: updateError } = await supabase
        .from("staff")
        .update({
          email: email,
          phone: phone,
          role_id: selectedRoleId || null,
          invitation_token: invitationToken,
          invitation_sent_at: new Date().toISOString(),
          access_status: "invited",
        })
        .eq("id", staffId);

      if (updateError) throw updateError;

      // Call edge function to send invitation
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke("send-staff-invitation", {
        body: {
          staffName,
          staffEmail: email,
          staffPhone: phone,
          businessName: profile.business_name,
          sendEmail: sendEmailInvite && !!email,
          sendSms: sendSmsInvite && !!phone,
          inviteUrl,
          roleName: selectedRoleName,
        },
      });

      const outcome = describeInviteDelivery(staffName, inviteData, Boolean(inviteError));
      if (!outcome.ok) throw new Error(outcome.description);
      toast({ title: outcome.title, description: outcome.description });
      onInviteSent();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({ title: "Failed to send invitation", description: "Check their email address and phone number, then try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invite {staffName}
          </DialogTitle>
          <DialogDescription>
            Send an invitation to this staff member with their login details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
            />
          </div>
          
          <div>
            <Label>Phone Number</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+233 XX XXX XXXX"
            />
          </div>

          <div>
            <Label>Assign Role</Label>
            <Select value={selectedRoleId} onValueChange={handleRoleChange} disabled={loadingRoles || roles.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select a role"} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingRoles && roles.length === 0 && (
              <p className="text-sm text-destructive mt-1">
                No roles found. Create roles in the "Roles" tab first.
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-base font-semibold">Send Invitation Via</Label>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="email-channel" 
                checked={sendEmailInvite}
                onCheckedChange={(checked) => setSendEmailInvite(checked as boolean)}
                disabled={!email}
              />
              <label
                htmlFor="email-channel"
                className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="sms-channel" 
                checked={sendSmsInvite}
                onCheckedChange={(checked) => setSendSmsInvite(checked as boolean)}
                disabled={!phone}
              />
              <label
                htmlFor="sms-channel"
                className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                SMS / WhatsApp
              </label>
            </div>
          </div>

          <Button
            onClick={handleSendInvite}
            disabled={sending || (!email && !phone) || (!sendEmailInvite && !sendSmsInvite)}
            className="w-full"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

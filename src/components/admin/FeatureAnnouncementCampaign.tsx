import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Megaphone, Send, Users, Mail, MessageSquare, 
  Loader2, CheckCircle2, XCircle, Clock, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Business {
  id: string;
  business_name: string;
  business_email: string | null;
  business_phone: string | null;
  user_id: string;
  plan_tier: string | null;
}

interface CampaignLog {
  id: string;
  title: string;
  content: string;
  sent_at: string;
  recipients_count: number;
  success_count: number;
  failed_count: number;
  include_staff: boolean;
}

export const FeatureAnnouncementCampaign = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [campaignLogs, setCampaignLogs] = useState<CampaignLog[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    sendEmail: true,
    sendSMS: false,
    includeStaff: true,
    selectedTiers: [] as string[],
  });

  const TIERS = ["free", "basic", "professional", "enterprise"];

  useEffect(() => {
    fetchBusinesses();
    fetchCampaignLogs();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name, business_email, business_phone, user_id, plan_tier")
        .order("business_name");

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("feature_announcement_campaigns" as any)
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setCampaignLogs((data as unknown as CampaignLog[]) || []);
    } catch (error) {
      console.error("Error fetching campaign logs:", error);
    }
  };

  const getFilteredBusinesses = () => {
    if (formData.selectedTiers.length === 0) return businesses;
    return businesses.filter(b => 
      formData.selectedTiers.includes(b.plan_tier || "free")
    );
  };

  const handleSendCampaign = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Please fill in title and content");
      return;
    }

    const targetBusinesses = getFilteredBusinesses();
    if (targetBusinesses.length === 0) {
      toast.error("No businesses match the selected tiers");
      return;
    }

    setSending(true);
    let successCount = 0;
    let failedCount = 0;
    let totalRecipients = 0;

    try {
      // Send to business owners
      for (const business of targetBusinesses) {
        totalRecipients++;
        
        if (formData.sendEmail && business.business_email) {
          const { error } = await supabase.functions.invoke("send-email-direct", {
            body: {
              to: business.business_email,
              subject: `[Update] ${formData.title}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">New Feature Update</h1>
                  </div>
                  <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #1f2937; margin-top: 0;">${formData.title}</h2>
                    <div style="color: #4b5563; line-height: 1.6;">
                      ${formData.content.replace(/\n/g, '<br/>')}
                    </div>
                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                      <p>Best regards,<br/>The Dowo Africa Team</p>
                    </div>
                  </div>
                </div>
              `,
            },
          });

          if (error) {
            failedCount++;
          } else {
            successCount++;
          }
        }

        if (formData.sendSMS && business.business_phone) {
          const { error } = await supabase.functions.invoke("send-sms", {
            body: {
              to: business.business_phone,
              message: `[Update] ${formData.title}\n\n${formData.content.substring(0, 300)}${formData.content.length > 300 ? '...' : ''}`,
            },
          });

          if (error) {
            failedCount++;
          } else {
            successCount++;
          }
        }

        // Send to staff if enabled
        if (formData.includeStaff) {
          const { data: staffMembers } = await (supabase
            .from("staff") as any)
            .select("id, name, email, phone")
            .eq("business_user_id", business.user_id)
            .eq("status", "active");

          if (staffMembers) {
            for (const staff of staffMembers) {
              totalRecipients++;
              
              if (formData.sendEmail && staff.email) {
                const { error } = await supabase.functions.invoke("send-email-direct", {
                  body: {
                    to: staff.email,
                    subject: `[Update] ${formData.title} - ${business.business_name}`,
                    html: `
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0;">
                          <h1 style="color: white; margin: 0; font-size: 24px;">New Feature Update</h1>
                        </div>
                        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                          <p style="color: #6b7280;">Hi ${staff.name},</p>
                          <h2 style="color: #1f2937;">${formData.title}</h2>
                          <div style="color: #4b5563; line-height: 1.6;">
                            ${formData.content.replace(/\n/g, '<br/>')}
                          </div>
                          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                            <p>Best regards,<br/>The Dowo Africa Team</p>
                          </div>
                        </div>
                      </div>
                    `,
                  },
                });

                if (!error) successCount++;
                else failedCount++;
              }

              if (formData.sendSMS && staff.phone) {
                const { error } = await supabase.functions.invoke("send-sms", {
                  body: {
                    to: staff.phone,
                    message: `[Update] ${formData.title}\n\n${formData.content.substring(0, 250)}`,
                  },
                });

                if (!error) successCount++;
                else failedCount++;
              }
            }
          }
        }
      }

      // Log the campaign
      await supabase.from("feature_announcement_campaigns" as any).insert({
        title: formData.title,
        content: formData.content,
        recipients_count: totalRecipients,
        success_count: successCount,
        failed_count: failedCount,
        include_staff: formData.includeStaff,
        target_tiers: formData.selectedTiers.length > 0 ? formData.selectedTiers : TIERS,
      });

      toast.success(`Campaign sent! ${successCount} successful, ${failedCount} failed`);
      
      setFormData({
        title: "",
        content: "",
        sendEmail: true,
        sendSMS: false,
        includeStaff: true,
        selectedTiers: [],
      });
      setIsDialogOpen(false);
      fetchCampaignLogs();
    } catch (error) {
      console.error("Error sending campaign:", error);
      toast.error("Failed to send campaign");
    } finally {
      setSending(false);
    }
  };

  const filteredBusinessCount = getFilteredBusinesses().length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Feature Announcement Campaigns
              </CardTitle>
              <CardDescription>
                Send new feature updates to all businesses and their staff
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Megaphone className="w-4 h-4" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5" />
                    Send Feature Announcement
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Announcement Title</Label>
                    <Input
                      placeholder="e.g., Introducing AI-Powered Inventory Predictions"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      placeholder="Describe the new feature and its benefits..."
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={6}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Target Subscription Tiers</Label>
                    <div className="flex flex-wrap gap-3">
                      {TIERS.map((tier) => (
                        <div key={tier} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tier-${tier}`}
                            checked={formData.selectedTiers.includes(tier)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  selectedTiers: [...formData.selectedTiers, tier],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedTiers: formData.selectedTiers.filter((t) => t !== tier),
                                });
                              }
                            }}
                          />
                          <label htmlFor={`tier-${tier}`} className="text-sm capitalize cursor-pointer">
                            {tier}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to send to all tiers ({businesses.length} businesses)
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Include Staff Members</p>
                        <p className="text-sm text-muted-foreground">
                          Send to all active staff in selected businesses
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.includeStaff}
                      onCheckedChange={(checked) => setFormData({ ...formData, includeStaff: checked })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <span className="font-medium">Email</span>
                      </div>
                      <Switch
                        checked={formData.sendEmail}
                        onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-green-500" />
                        <span className="font-medium">SMS</span>
                      </div>
                      <Switch
                        checked={formData.sendSMS}
                        onCheckedChange={(checked) => setFormData({ ...formData, sendSMS: checked })}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium">
                      Target Audience: {filteredBusinessCount} businesses
                      {formData.includeStaff && " + their staff"}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSendCampaign} 
                      disabled={sending || (!formData.sendEmail && !formData.sendSMS)}
                      className="gap-2"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Campaign
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {campaignLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No campaigns sent yet</p>
              <p className="text-sm">Create your first feature announcement campaign</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {log.content}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.recipients_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="w-4 h-4" />
                        {log.success_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-4 h-4" />
                        {log.failed_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.include_staff ? (
                        <Badge className="bg-blue-500/10 text-blue-500">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.sent_at), "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, MessageSquare, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  recipient_count: number;
  success_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
  user_id: string;
  business_name?: string;
}

interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  status: string;
  recipient_count: number;
  success_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
  user_id: string;
  business_name?: string;
}

export const CampaignMonitoringTab = () => {
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [smsCampaigns, setSmsCampaigns] = useState<SMSCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);

    // Fetch email campaigns
    const { data: emailData } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    // Fetch SMS campaigns
    const { data: smsData } = await supabase
      .from("sms_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    // Get business names
    const userIds = [
      ...new Set([
        ...(emailData?.map(c => c.user_id) || []),
        ...(smsData?.map(c => c.user_id) || [])
      ])
    ];
    
    const { data: businessData } = await supabase
      .from("business_profiles")
      .select("user_id, business_name")
      .in("user_id", userIds);

    const businessMap = new Map(businessData?.map(b => [b.user_id, b.business_name]) || []);

    if (emailData) {
      setEmailCampaigns(emailData.map(c => ({
        ...c,
        recipient_count: c.recipient_count || 0,
        success_count: c.success_count || 0,
        failed_count: c.failed_count || 0,
        business_name: businessMap.get(c.user_id) || "Unknown"
      })));
    }

    if (smsData) {
      setSmsCampaigns(smsData.map(c => ({
        ...c,
        recipient_count: c.recipient_count || 0,
        success_count: c.success_count || 0,
        failed_count: c.failed_count || 0,
        business_name: businessMap.get(c.user_id) || "Unknown"
      })));
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalEmails = emailCampaigns.reduce((sum, c) => sum + c.recipient_count, 0);
  const totalSMS = smsCampaigns.reduce((sum, c) => sum + c.recipient_count, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Email Campaigns</span>
            </div>
            <p className="text-2xl font-bold mt-1">{emailCampaigns.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Emails Sent</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalEmails.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">SMS Campaigns</span>
            </div>
            <p className="text-2xl font-bold mt-1">{smsCampaigns.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">SMS Sent</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalSMS.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email">
            <TabsList>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" /> Email
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-2">
                <MessageSquare className="w-4 h-4" /> SMS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-4">
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <div className="min-w-[700px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Business</TableHead>
                          <TableHead>Recipients</TableHead>
                          <TableHead>Success</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailCampaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{campaign.name}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-48">{campaign.subject}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{campaign.business_name}</TableCell>
                            <TableCell>{campaign.recipient_count}</TableCell>
                            <TableCell>
                              <span className="text-green-600">{campaign.success_count}</span>
                              {campaign.failed_count > 0 && (
                                <span className="text-red-600 ml-2">({campaign.failed_count} failed)</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                            <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sms" className="mt-4">
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <div className="min-w-[700px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Business</TableHead>
                          <TableHead>Recipients</TableHead>
                          <TableHead>Success</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {smsCampaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{campaign.name}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-48">{campaign.message}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{campaign.business_name}</TableCell>
                            <TableCell>{campaign.recipient_count}</TableCell>
                            <TableCell>
                              <span className="text-green-600">{campaign.success_count}</span>
                              {campaign.failed_count > 0 && (
                                <span className="text-red-600 ml-2">({campaign.failed_count} failed)</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                            <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

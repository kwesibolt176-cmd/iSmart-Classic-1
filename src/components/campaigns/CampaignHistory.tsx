import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Users,
  RefreshCw,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { useBusiness } from "@/contexts/BusinessContext";
import { sanitizeCampaignHtml } from "@/lib/campaign-html";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Campaign {
  id: string;
  name: string;
  subject?: string;
  message?: string;
  body?: string;
  status: string;
  recipient_count: number | null;
  success_count: number | null;
  failed_count: number | null;
  created_at: string;
  sent_at: string | null;
}

export const CampaignHistory = () => {
  const { user } = useBusiness();
  const { data: emailCampaigns, isLoading: emailLoading, refetch: refetchEmail } = useQuery({
    queryKey: ['email-campaigns-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user?.id,
  });

  const { data: smsCampaigns, isLoading: smsLoading, refetch: refetchSms } = useQuery({
    queryKey: ['sms-campaigns-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('sms_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'scheduled':
      case 'sending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const CampaignCard = ({ campaign, type }: { campaign: Campaign; type: 'email' | 'sms' }) => (
    <div className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          {type === 'email' ? (
            <Mail className="h-4 w-4 text-primary" />
          ) : (
            <MessageSquare className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{campaign.name}</span>
            {getStatusBadge(campaign.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {type === 'email' ? campaign.subject : campaign.message}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {campaign.recipient_count || 0} recipients
            </span>
            {campaign.success_count !== null && (
              <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {campaign.success_count} sent</span>
            )}
            {campaign.failed_count !== null && campaign.failed_count > 0 && (
              <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> {campaign.failed_count} failed</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 ml-4">
        <span className="text-xs text-muted-foreground">
          {format(new Date(campaign.created_at), 'MMM d, yyyy')}
        </span>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7">
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{campaign.name}</DialogTitle>
              <DialogDescription>
                {type === 'email' ? 'Email' : 'SMS'} Campaign Details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="mt-1">{getStatusBadge(campaign.status)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Created</span>
                  <p className="font-medium">{format(new Date(campaign.created_at), 'PPp')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Recipients</span>
                  <p className="font-medium">{campaign.recipient_count || 0}</p>
                </div>
                {campaign.sent_at && (
                  <div>
                    <span className="text-sm text-muted-foreground">Sent At</span>
                    <p className="font-medium">{format(new Date(campaign.sent_at), 'PPp')}</p>
                  </div>
                )}
              </div>
              
              {type === 'email' && campaign.subject && (
                <div>
                  <span className="text-sm text-muted-foreground">Subject</span>
                  <p className="font-medium">{campaign.subject}</p>
                </div>
              )}
              
              <div>
                <span className="text-sm text-muted-foreground">
                  {type === 'email' ? 'Email Body' : 'Message'}
                </span>
                {type === 'email' ? (
                  <div 
                    className="mt-2 p-4 bg-muted rounded-lg prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeCampaignHtml(campaign.body || '') }}
                  />
                ) : (
                  <p className="mt-2 p-4 bg-muted rounded-lg">{campaign.message}</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  const isLoading = emailLoading || smsLoading;
  const allCampaigns = [
    ...(emailCampaigns?.map(c => ({ ...c, type: 'email' as const })) || []),
    ...(smsCampaigns?.map(c => ({ ...c, type: 'sms' as const })) || []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Campaign History
            </CardTitle>
            <CardDescription>
              View all your past email and SMS campaigns
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              refetchEmail();
              refetchSms();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allCampaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No campaigns yet</p>
            <p className="text-sm">Create your first campaign to get started</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {allCampaigns.map((campaign) => (
                <CampaignCard 
                  key={`${campaign.type}-${campaign.id}`} 
                  campaign={campaign} 
                  type={campaign.type} 
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

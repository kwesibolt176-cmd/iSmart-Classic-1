import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailCampaignManager } from "@/components/EmailCampaignManager";
import { SMSCampaignManager } from "@/components/SMSCampaignManager";
import { TemplateManager } from "@/components/TemplateManager";
import { CampaignHistory } from "@/components/campaigns/CampaignHistory";
import { CampaignAutomation } from "@/components/campaigns/CampaignAutomation";
import { CampaignABTesting } from "@/components/campaigns/CampaignABTesting";
import { Mail, MessageSquare, FileText, History, Zap, FlaskConical, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export const Campaigns = () => {
  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Communication Campaigns"
        description="Create and send professional email and SMS campaigns to your customers"
        rightContent={<Send className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-700">

        <Tabs defaultValue="email" className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 gap-1 h-auto p-1">
              <TabsTrigger value="email" className="whitespace-nowrap gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="sms" className="whitespace-nowrap gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="ab-testing" className="whitespace-nowrap gap-2">
                <FlaskConical className="h-4 w-4" />
                A/B Testing
              </TabsTrigger>
              <TabsTrigger value="automation" className="whitespace-nowrap gap-2">
                <Zap className="h-4 w-4" />
                Automation
              </TabsTrigger>
              <TabsTrigger value="history" className="whitespace-nowrap gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="templates" className="whitespace-nowrap gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="email" className="space-y-4 mt-4">
            <EmailCampaignManager />
          </TabsContent>
          
          <TabsContent value="sms" className="space-y-4 mt-4">
            <SMSCampaignManager />
          </TabsContent>

          <TabsContent value="ab-testing" className="space-y-4 mt-4">
            <CampaignABTesting />
          </TabsContent>

          <TabsContent value="automation" className="space-y-4 mt-4">
            <CampaignAutomation />
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <CampaignHistory />
          </TabsContent>
          
          <TabsContent value="templates" className="space-y-4 mt-4">
            <TemplateManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

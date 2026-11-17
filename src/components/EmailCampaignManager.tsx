import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { resolveCampaignVariables } from "@/lib/campaign-html";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { Mail, Send, Users, Eye, Edit3, Smartphone, Monitor, Loader2 } from "lucide-react";
import { RichEmailEditor } from "./campaigns/RichEmailEditor";
import { EmailPreview } from "./campaigns/EmailPreview";
import { IndustryTemplates } from "./campaigns/IndustryTemplates";

export const EmailCampaignManager = () => {
  const { toast } = useToast();
  const { profile } = useBusiness();
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-with-email', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', profile.user_id)
        .not('email', 'is', null)
        .order('name');
      
      if (error) throw error;
      // Deduplicate by email
      const seen = new Set<string>();
      return (data || []).filter(c => {
        const key = c.email?.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    enabled: !!profile?.user_id,
  });

  const { data: templates } = useQuery({
    queryKey: ['email-templates', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('type', 'email')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id,
  });

  // Generate preview data from first selected customer or dummy data
  const previewData = useMemo(() => {
    const firstCustomer = customers?.find(c => selectedCustomers.includes(c.id));
    return {
      customer_name: firstCustomer?.name || "John Doe",
      customer_email: firstCustomer?.email || "john@example.com",
      customer_phone: firstCustomer?.phone || "+1 234 567 890",
      business_name: profile?.business_name || "Your Business",
      order_number: "ORD-2024-0001",
      order_total: "99.99",
      invoice_number: "INV-2024-0001",
      due_date: "January 15, 2024",
      payment_link: "#",
      reservation_date: "January 20, 2024",
      reservation_time: "7:00 PM",
      party_size: "4",
      table_name: "Table 5",
      business_phone: "+1 555 123 4567",
    };
  }, [customers, selectedCustomers, profile]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject || "");
      setBody(template.content);
    }
  };

  const handleIndustryTemplateSelect = (templateSubject: string, templateBody: string) => {
    setSubject(templateSubject);
    setBody(templateBody);
    setSelectedTemplate("");
    toast({
      title: "Template Applied",
      description: "Industry template has been applied. Customize it as needed.",
    });
  };

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const toggleAll = () => {
    if (selectedCustomers.length === customers?.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers?.map(c => c.id) || []);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !subject || !body || selectedCustomers.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selectedCustomerData = customers?.filter(c => selectedCustomers.includes(c.id)) || [];
      const recipientEmails = selectedCustomerData.map(c => c.email).filter(Boolean);

      if (recipientEmails.length === 0) {
        throw new Error("Selected customers have no email addresses");
      }

      const { data: loyaltyRows } = await supabase
        .from("customer_loyalty")
        .select("customer_id, points_balance")
        .in("customer_id", selectedCustomerData.map((customer) => customer.id));
      const loyaltyByCustomer = new Map(
        (loyaltyRows || []).map((row) => [row.customer_id, Number(row.points_balance)]),
      );

      // Resolve variables at send time using current recipient and business data.
      const processedEmails = selectedCustomerData.map(customer => {
        const variables: Record<string, string | number> = {
          customer_name: customer.name || "",
          customer_email: customer.email || "",
          customer_phone: customer.phone || "",
          business_name: profile?.business_name || "",
          points_balance: loyaltyByCustomer.get(customer.id) ?? 0,
        };

        return {
          email: customer.email!,
          subject: resolveCampaignVariables(subject, variables),
          body: resolveCampaignVariables(body, variables),
          customerId: customer.id,
        };
      });

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert({
          user_id: user.id,
          name: campaignName,
          subject,
          body,
          status: 'sending',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Add recipients as pending
      const recipientData = recipientEmails.map(email => ({
        campaign_id: campaign.id,
        campaign_type: 'email',
        recipient: email,
        status: 'pending',
      }));

      const { error: recipientsError } = await supabase
        .from('campaign_recipients')
        .insert(recipientData);

      if (recipientsError) throw recipientsError;

      // Send emails directly via edge function
      let successCount = 0;
      let failedCount = 0;

      for (const emailData of processedEmails) {
        try {
          const { error } = await supabase.functions.invoke('send-email-direct', {
            body: {
              to: emailData.email,
              subject: emailData.subject,
              html: emailData.body,
              campaignId: campaign.id,
            },
          });

          if (error) throw error;

          // Update recipient status
          await supabase
            .from('campaign_recipients')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('campaign_id', campaign.id)
            .eq('recipient', emailData.email);

          successCount++;
        } catch (error: any) {
          console.error(`Failed to send to ${emailData.email}:`, error);
          
          await supabase
            .from('campaign_recipients')
            .update({ status: 'failed', error_message: error.message })
            .eq('campaign_id', campaign.id)
            .eq('recipient', emailData.email);
          
          failedCount++;
        }
      }

      // Update campaign with results
      await supabase
        .from('email_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          recipient_count: recipientEmails.length,
          success_count: successCount,
          failed_count: failedCount,
        })
        .eq('id', campaign.id);

      toast({
        title: "Campaign Sent!",
        description: `Successfully sent ${successCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      });

      // Reset form
      setCampaignName("");
      setSubject("");
      setBody("");
      setSelectedCustomers([]);
      setSelectedTemplate("");
    } catch (error: any) {
      console.error('Campaign error:', error);
      toast({
        title: "Campaign Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Create Email Campaign
                </CardTitle>
                <CardDescription>
                  Compose and send professional emails to your customers
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "edit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("edit")}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant={viewMode === "preview" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("preview")}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {viewMode === "edit" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g., January Newsletter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-select">Use Saved Template</Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger id="template-select">
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Special Offer Just for You, {{customer_name}}!"
                  />
                </div>

                <RichEmailEditor
                  value={body}
                  onChange={setBody}
                  variables={["customer_name", "customer_email", "business_name", "points_balance"]}
                />
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center gap-2 pb-2 border-b">
                  <Button
                    variant={previewDevice === "desktop" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewDevice("desktop")}
                  >
                    <Monitor className="h-4 w-4 mr-1" />
                    Desktop
                  </Button>
                  <Button
                    variant={previewDevice === "mobile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewDevice("mobile")}
                  >
                    <Smartphone className="h-4 w-4 mr-1" />
                    Mobile
                  </Button>
                </div>
                <EmailPreview
                  subject={subject}
                  body={body}
                  senderName={profile?.business_name || "Your Business"}
                  previewData={previewData}
                  viewMode={previewDevice}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading customers...</p>
            ) : customers && customers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Checkbox
                    checked={selectedCustomers.length === customers.length}
                    onCheckedChange={toggleAll}
                    id="select-all"
                  />
                  <Label htmlFor="select-all" className="cursor-pointer">
                    Select All ({customers.length} customers)
                  </Label>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
                  {customers.map((customer) => (
                    <div key={customer.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => toggleCustomer(customer.id)}
                        id={customer.id}
                      />
                      <Label htmlFor={customer.id} className="cursor-pointer flex-1 text-sm">
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-muted-foreground ml-2">{customer.email}</span>
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomers.length} recipient(s) selected
                  </p>
                  <Button 
                    onClick={handleCreateCampaign} 
                    disabled={isSending || selectedCustomers.length === 0 || !subject || !body}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? "Sending..." : "Send Campaign"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No customers with email addresses found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Industry Templates */}
      <div className="space-y-4">
        <IndustryTemplates 
          industry={profile?.industry} 
          onSelectTemplate={handleIndustryTemplateSelect}
        />
      </div>
    </div>
  );
};

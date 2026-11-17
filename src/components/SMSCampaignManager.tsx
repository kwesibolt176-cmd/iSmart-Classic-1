import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { MessageSquare, Send, Users, AlertTriangle } from "lucide-react";
import { createSMSAction } from "@/lib/pending-actions";
import { CreditExhaustedAlert } from "@/components/CreditExhaustedAlert";

export const SMSCampaignManager = () => {
  const { toast } = useToast();
  const { user } = useBusiness();
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [smsCredits, setSmsCredits] = useState<number | null>(null);
  const [showCreditAlert, setShowCreditAlert] = useState(false);

  // Fetch SMS credits
  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("business_credits")
        .select("sms_credits")
        .eq("business_id", user.id)
        .maybeSingle();
      setSmsCredits(data?.sms_credits ?? 0);
    };
    fetchCredits();
  }, [user?.id]);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-with-phone', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .not('phone', 'is', null)
        .order('name');
      
      if (error) throw error;
      // Deduplicate by phone
      const seen = new Set<string>();
      return (data || []).filter(c => {
        const key = c.phone?.replace(/\D/g, '');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    enabled: !!user?.id,
  });

  const { data: templates } = useQuery({
    queryKey: ['sms-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'sms')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content.slice(0, 160));
    }
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
    if (!campaignName || !message || selectedCustomers.length === 0) {
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

      // Get selected customers' phone numbers
      const selectedCustomerData = customers?.filter(c => selectedCustomers.includes(c.id)) || [];
      const recipientPhones = selectedCustomerData.map(c => c.phone).filter(Boolean);

      if (recipientPhones.length === 0) {
        throw new Error("Selected customers have no phone numbers");
      }

      // Check if enough credits
      if (smsCredits !== null && smsCredits < recipientPhones.length) {
        setShowCreditAlert(true);
        toast({
          title: "Insufficient SMS Credits",
          description: `You need ${recipientPhones.length} credits but only have ${smsCredits} remaining.`,
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('sms_campaigns')
        .insert({
          user_id: user.id,
          name: campaignName,
          message,
          status: 'draft',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Add recipients
      const recipientData = recipientPhones.map(phone => ({
        campaign_id: campaign.id,
        campaign_type: 'sms',
        recipient: phone,
      }));

      const { error: recipientsError } = await supabase
        .from('campaign_recipients')
        .insert(recipientData);

      if (recipientsError) throw recipientsError;

      // Update campaign with recipient count and mark as scheduled
      await supabase
        .from('sms_campaigns')
        .update({ 
          recipient_count: recipientPhones.length,
          status: 'scheduled'
        })
        .eq('id', campaign.id);

      // Create pending actions for each recipient
      for (const phone of recipientPhones) {
        await createSMSAction(
          phone,
          message,
          'normal'
        );
      }

      toast({
        title: "Campaign Queued!",
        description: `Your SMS campaign has been queued with ${recipientPhones.length} recipients for admin approval.`,
      });

      // Reset form
      setCampaignName("");
      setMessage("");
      setSelectedCustomers([]);
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

  const requiredCredits = selectedCustomers.length;
  const hasEnoughCredits = smsCredits === null || smsCredits >= requiredCredits;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS Campaign Manager
          {smsCredits !== null && (
            <Badge 
              variant={smsCredits < 50 ? "destructive" : "secondary"} 
              className="ml-auto"
            >
              {smsCredits.toLocaleString()} credits
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCreditAlert && (
          <CreditExhaustedAlert 
            type="sms" 
            required={requiredCredits}
            available={smsCredits || 0}
            onDismiss={() => setShowCreditAlert(false)}
          />
        )}
        <div className="space-y-2">
          <Label htmlFor="sms-template-select">Use Template (Optional)</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger id="sms-template-select">
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

        <div className="space-y-2">
          <Label htmlFor="sms-campaign-name">Campaign Name</Label>
          <Input
            id="sms-campaign-name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g., Weekend Sale Promotion"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sms-message">Message (max 160 characters)</Label>
          <Textarea
            id="sms-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 160))}
            placeholder="Your SMS message here..."
            rows={3}
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground">{message.length}/160 characters</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Select Recipients from Customers
          </Label>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading customers...</p>
          ) : customers && customers.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Checkbox
                  checked={selectedCustomers.length === customers.length}
                  onCheckedChange={toggleAll}
                  id="select-all-sms"
                />
                <Label htmlFor="select-all-sms" className="cursor-pointer">
                  Select All ({customers.length} customers)
                </Label>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
                {customers.map((customer) => (
                  <div key={customer.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedCustomers.includes(customer.id)}
                      onCheckedChange={() => toggleCustomer(customer.id)}
                      id={`sms-${customer.id}`}
                    />
                    <Label htmlFor={`sms-${customer.id}`} className="cursor-pointer flex-1">
                      {customer.name} - {customer.phone}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedCustomers.length} recipient(s) selected
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No customers with phone numbers found</p>
          )}
        </div>

        <Button 
          onClick={handleCreateCampaign} 
          disabled={isSending || selectedCustomers.length === 0}
          className="w-full"
        >
          <Send className="mr-2 h-4 w-4" />
          {isSending ? "Sending..." : "Send Campaign"}
        </Button>
      </CardContent>
    </Card>
  );
};

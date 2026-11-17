import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, 
  Calendar, 
  UserX, 
  ShoppingBag, 
  Gift, 
  Star, 
  Clock,
  Plus,
  Trash2,
  Save,
  Mail,
  MessageSquare
} from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: 'email' | 'sms';
  template_id?: string;
  custom_message?: string;
  custom_subject?: string;
  is_active: boolean;
  created_at: string;
  last_triggered_at?: string;
  trigger_count: number;
}

const TRIGGER_TYPES = [
  { value: 'birthday', label: 'Customer Birthday', icon: Gift, description: 'Send on customer birthday' },
  { value: 'inactive', label: 'Inactive Customer', icon: UserX, description: 'Customer has not ordered' },
  { value: 'post_purchase', label: 'Post Purchase', icon: ShoppingBag, description: 'After order completion' },
  { value: 'loyalty_milestone', label: 'Loyalty Milestone', icon: Star, description: 'Points threshold reached' },
  { value: 'first_purchase', label: 'First Purchase', icon: Calendar, description: 'Welcome new customers' },
  { value: 'abandoned_cart', label: 'Cart Reminder', icon: Clock, description: 'Pending order follow-up' },
];

export const CampaignAutomation = () => {
  const { user } = useBusiness();
  const { toast } = useToast();
  
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewRule, setShowNewRule] = useState(false);
  
  const [newRule, setNewRule] = useState({
    name: '',
    trigger_type: 'birthday',
    trigger_config: {} as Record<string, unknown>,
    action_type: 'email' as 'email' | 'sms',
    template_id: '',
    custom_message: '',
    custom_subject: '',
    is_active: true,
  });

  useEffect(() => {
    if (user) {
      fetchRulesAndTemplates();
    }
  }, [user?.id]);

  const fetchRulesAndTemplates = async () => {
    setLoading(true);
    try {
      const [rulesRes, templatesRes] = await Promise.all([
        supabase
          .from('campaign_automation_rules' as 'communication_templates')
          .select('*')
          .eq('user_id', user?.id as string)
          .order('created_at', { ascending: false }),
        supabase
          .from('communication_templates')
          .select('id, name, type')
          .eq('user_id', user?.id as string)
          .eq('is_active', true),
      ]);

      if (rulesRes.data) setRules(rulesRes.data as unknown as AutomationRule[]);
      if (templatesRes.data) setTemplates(templatesRes.data);
    } catch (error) {
      console.error('Error fetching automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.trigger_type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('exec_insert_automation_rule' as never, {
        p_user_id: user?.id,
        p_name: newRule.name,
        p_trigger_type: newRule.trigger_type,
        p_trigger_config: newRule.trigger_config,
        p_action_type: newRule.action_type,
        p_template_id: newRule.template_id || null,
        p_custom_message: newRule.custom_message || null,
        p_custom_subject: newRule.custom_subject || null,
        p_is_active: newRule.is_active,
      } as never) as { error: Error | null };

      if (error) throw error;

      toast({
        title: "Success",
        description: "Automation rule created successfully",
      });
      
      setShowNewRule(false);
      setNewRule({
        name: '',
        trigger_type: 'birthday',
        trigger_config: {},
        action_type: 'email',
        template_id: '',
        custom_message: '',
        custom_subject: '',
        is_active: true,
      });
      fetchRulesAndTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleRuleActive = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('campaign_automation_rules' as 'communication_templates')
        .update({ is_active: isActive } as unknown as Record<string, unknown>)
        .eq('id', ruleId);

      if (error) throw error;

      setRules(rules.map(r => r.id === ruleId ? { ...r, is_active: isActive } : r));
      
      toast({
        title: "Success",
        description: `Automation ${isActive ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_automation_rules' as 'communication_templates')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setRules(rules.filter(r => r.id !== ruleId));
      
      toast({
        title: "Success",
        description: "Automation rule deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTriggerIcon = (triggerType: string) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === triggerType);
    return trigger?.icon || Zap;
  };

  const getTriggerLabel = (triggerType: string) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === triggerType);
    return trigger?.label || triggerType;
  };

  const renderTriggerConfig = () => {
    const config = newRule.trigger_config as Record<string, number>;
    switch (newRule.trigger_type) {
      case 'inactive':
        return (
          <div className="space-y-2">
            <Label>Days of inactivity</Label>
            <Input
              type="number"
              min="7"
              max="365"
              value={config.days ?? 30}
              onChange={(e) => setNewRule({
                ...newRule,
                trigger_config: { ...newRule.trigger_config, days: parseInt(e.target.value) }
              })}
            />
          </div>
        );
      case 'post_purchase':
        return (
          <div className="space-y-2">
            <Label>Hours after purchase</Label>
            <Input
              type="number"
              min="1"
              max="168"
              value={config.hours ?? 24}
              onChange={(e) => setNewRule({
                ...newRule,
                trigger_config: { ...newRule.trigger_config, hours: parseInt(e.target.value) }
              })}
            />
          </div>
        );
      case 'loyalty_milestone':
        return (
          <div className="space-y-2">
            <Label>Points threshold</Label>
            <Input
              type="number"
              min="100"
              value={config.points ?? 500}
              onChange={(e) => setNewRule({
                ...newRule,
                trigger_config: { ...newRule.trigger_config, points: parseInt(e.target.value) }
              })}
            />
          </div>
        );
      case 'birthday':
        return (
          <div className="space-y-2">
            <Label>Days before birthday</Label>
            <Input
              type="number"
              min="0"
              max="7"
              value={config.days_before ?? 0}
              onChange={(e) => setNewRule({
                ...newRule,
                trigger_config: { ...newRule.trigger_config, days_before: parseInt(e.target.value) }
              })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Campaign Automation
          </h2>
          <p className="text-sm text-muted-foreground">
            Set up automatic campaigns based on customer behavior
          </p>
        </div>
        <Button onClick={() => setShowNewRule(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Automation
        </Button>
      </div>

      {showNewRule && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Automation Rule</CardTitle>
            <CardDescription>
              Define trigger conditions and automated actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Rule Name *</Label>
                <Input
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g., Birthday Discount"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Trigger Type *</Label>
                <Select
                  value={newRule.trigger_type}
                  onValueChange={(value) => setNewRule({ ...newRule, trigger_type: value, trigger_config: {} })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        <div className="flex items-center gap-2">
                          <trigger.icon className="h-4 w-4" />
                          {trigger.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {renderTriggerConfig()}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Action Type *</Label>
                <Select
                  value={newRule.action_type}
                  onValueChange={(value: 'email' | 'sms') => setNewRule({ ...newRule, action_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Use Template</Label>
                <Select
                  value={newRule.template_id || "custom"}
                  onValueChange={(value) => setNewRule({ ...newRule, template_id: value === "custom" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom message</SelectItem>
                    {templates
                      .filter(t => t.type === newRule.action_type)
                      .map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!newRule.template_id && (
              <>
                {newRule.action_type === 'email' && (
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      value={newRule.custom_subject}
                      onChange={(e) => setNewRule({ ...newRule, custom_subject: e.target.value })}
                      placeholder="Enter email subject"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={newRule.custom_message}
                    onChange={(e) => setNewRule({ ...newRule, custom_message: e.target.value })}
                    placeholder={`Enter ${newRule.action_type === 'email' ? 'email body' : 'SMS message'}`}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available variables: {'{customer_name}'}, {'{business_name}'}, {'{points_balance}'}
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newRule.is_active}
                  onCheckedChange={(checked) => setNewRule({ ...newRule, is_active: checked })}
                />
                <Label>Enable immediately</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewRule(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRule} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Creating..." : "Create Rule"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 && !showNewRule ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Automation Rules</h3>
            <p className="text-muted-foreground mb-4">
              Create your first automation to engage customers automatically
            </p>
            <Button onClick={() => setShowNewRule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => {
            const TriggerIcon = getTriggerIcon(rule.trigger_type);
            return (
              <Card key={rule.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TriggerIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getTriggerLabel(rule.trigger_type)} → {rule.action_type.toUpperCase()}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Active" : "Paused"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Triggered {rule.trigger_count || 0} times
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleRuleActive(rule.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

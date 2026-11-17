import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  Save, 
  Plus, 
  Trash2, 
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  ArrowRight
} from "lucide-react";

interface EscalationLevel {
  id: string;
  level: number;
  days_overdue: number;
  action: 'email' | 'sms' | 'both' | 'call_reminder';
  message_template: string;
  subject_template?: string;
  include_late_fee_warning: boolean;
  cc_owner: boolean;
}

export const PaymentReminderEscalation = () => {
  const { user } = useBusiness();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [levels, setLevels] = useState<EscalationLevel[]>([
    {
      id: '1',
      level: 1,
      days_overdue: 1,
      action: 'email',
      message_template: 'Hi {customer_name}, this is a friendly reminder that your invoice #{invoice_number} for {amount} is now overdue. Please make payment at your earliest convenience.',
      subject_template: 'Friendly Reminder: Invoice #{invoice_number} is Due',
      include_late_fee_warning: false,
      cc_owner: false,
    },
    {
      id: '2',
      level: 2,
      days_overdue: 7,
      action: 'both',
      message_template: 'Hi {customer_name}, your invoice #{invoice_number} for {amount} is now 7 days overdue. Please process payment to avoid late fees.',
      subject_template: 'Second Notice: Invoice #{invoice_number} - 7 Days Overdue',
      include_late_fee_warning: true,
      cc_owner: false,
    },
    {
      id: '3',
      level: 3,
      days_overdue: 14,
      action: 'both',
      message_template: 'URGENT: Invoice #{invoice_number} for {amount} is now 14 days overdue. Late fees may apply. Please contact us immediately to arrange payment.',
      subject_template: 'Urgent: Invoice #{invoice_number} - 14 Days Overdue',
      include_late_fee_warning: true,
      cc_owner: true,
    },
  ]);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user?.id]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_escalation_settings' as 'invoice_reminder_settings')
        .select('*')
        .eq('user_id', user?.id as string)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const d = data as unknown as { enabled: boolean; escalation_levels: unknown[] };
        setEnabled(d.enabled);
        if (d.escalation_levels && Array.isArray(d.escalation_levels)) {
          setLevels(d.escalation_levels as unknown as EscalationLevel[]);
        }
      }
    } catch (error) {
      console.error('Error fetching escalation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: user?.id,
        enabled,
        escalation_levels: levels,
      };
      
      const { error } = await supabase
        .from('payment_escalation_settings' as 'invoice_reminder_settings')
        .upsert(payload as never);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Escalation settings saved successfully",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addLevel = () => {
    const newLevel: EscalationLevel = {
      id: Date.now().toString(),
      level: levels.length + 1,
      days_overdue: (levels[levels.length - 1]?.days_overdue || 0) + 7,
      action: 'email',
      message_template: '',
      subject_template: '',
      include_late_fee_warning: false,
      cc_owner: false,
    };
    setLevels([...levels, newLevel]);
  };

  const removeLevel = (id: string) => {
    const filtered = levels.filter(l => l.id !== id);
    // Renumber levels
    setLevels(filtered.map((l, i) => ({ ...l, level: i + 1 })));
  };

  const updateLevel = (id: string, updates: Partial<EscalationLevel>) => {
    setLevels(levels.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'both':
        return (
          <div className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <MessageSquare className="h-4 w-4" />
          </div>
        );
      case 'call_reminder':
        return <Phone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg sm:text-xl">Payment Reminder Escalation</CardTitle>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Automatically escalate reminders based on how overdue invoices are
        </CardDescription>
      </CardHeader>
      
      {enabled && (
        <CardContent className="space-y-6">
          {/* Escalation Flow Preview */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {levels.map((level, index) => (
              <div key={level.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-muted min-w-[100px]">
                  <Badge variant="outline" className="mb-1">
                    Day {level.days_overdue}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {getActionIcon(level.action)}
                  </div>
                </div>
                {index < levels.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Escalation Levels */}
          <div className="space-y-4">
            {levels.map((level) => (
              <div key={level.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge>Level {level.level}</Badge>
                    {level.include_late_fee_warning && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Late Fee
                      </Badge>
                    )}
                  </div>
                  {levels.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLevel(level.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Days Overdue</Label>
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={level.days_overdue}
                      onChange={(e) => updateLevel(level.id, { 
                        days_overdue: parseInt(e.target.value) || 1 
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select
                      value={level.action}
                      onValueChange={(value: 'email' | 'sms' | 'both' | 'call_reminder') => 
                        updateLevel(level.id, { action: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Only</SelectItem>
                        <SelectItem value="sms">SMS Only</SelectItem>
                        <SelectItem value="both">Email + SMS</SelectItem>
                        <SelectItem value="call_reminder">Call Reminder (Manual)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {level.action !== 'call_reminder' && (
                  <>
                    {(level.action === 'email' || level.action === 'both') && (
                      <div className="space-y-2">
                        <Label>Email Subject</Label>
                        <Input
                          value={level.subject_template || ''}
                          onChange={(e) => updateLevel(level.id, { 
                            subject_template: e.target.value 
                          })}
                          placeholder="e.g., Invoice #{invoice_number} Payment Reminder"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Message Template</Label>
                      <Textarea
                        value={level.message_template}
                        onChange={(e) => updateLevel(level.id, { 
                          message_template: e.target.value 
                        })}
                        rows={3}
                        placeholder="Enter reminder message..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables: {'{customer_name}'}, {'{invoice_number}'}, {'{amount}'}, {'{due_date}'}, {'{days_overdue}'}
                      </p>
                    </div>
                  </>
                )}

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={level.include_late_fee_warning}
                      onCheckedChange={(checked) => updateLevel(level.id, { 
                        include_late_fee_warning: checked 
                      })}
                    />
                    <Label className="text-sm">Include late fee warning</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={level.cc_owner}
                      onCheckedChange={(checked) => updateLevel(level.id, { 
                        cc_owner: checked 
                      })}
                    />
                    <Label className="text-sm">CC business owner</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addLevel} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Escalation Level
          </Button>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

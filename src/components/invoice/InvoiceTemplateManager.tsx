import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Palette, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InvoiceTemplate {
  id: string;
  name: string;
  is_default: boolean;
  logo_url: string | null;
  header_color: string;
  accent_color: string;
  footer_text: string | null;
  terms_and_conditions: string | null;
  bank_details: string | null;
  show_payment_instructions: boolean;
}

export const InvoiceTemplateManager = () => {
  const { user, profile } = useBusiness();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    header_color: "#1a1a1a",
    accent_color: "#3b82f6",
    footer_text: "",
    terms_and_conditions: "",
    bank_details: "",
    show_payment_instructions: true,
    is_default: false,
  });

  useEffect(() => {
    if (user?.id) fetchTemplates();
  }, [user?.id]);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("invoice_templates")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at");

    if (!error) setTemplates(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("invoice_templates")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast({ title: "Template updated" });
      } else {
        const { error } = await supabase.from("invoice_templates").insert({
          user_id: user.id,
          ...formData,
        });

        if (error) throw error;
        toast({ title: "Template created" });
      }

      setDialogOpen(false);
      fetchTemplates();
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      // First unset all defaults
      await supabase
        .from("invoice_templates")
        .update({ is_default: false })
        .eq("user_id", user!.id);

      // Set new default
      await supabase
        .from("invoice_templates")
        .update({ is_default: true })
        .eq("id", templateId);

      toast({ title: "Default template updated" });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await supabase.from("invoice_templates").delete().eq("id", templateId);
      toast({ title: "Template deleted" });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      header_color: "#1a1a1a",
      accent_color: "#3b82f6",
      footer_text: "",
      terms_and_conditions: "",
      bank_details: "",
      show_payment_instructions: true,
      is_default: false,
    });
    setEditingTemplate(null);
  };

  const openEdit = (template: InvoiceTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      header_color: template.header_color,
      accent_color: template.accent_color,
      footer_text: template.footer_text || "",
      terms_and_conditions: template.terms_and_conditions || "",
      bank_details: template.bank_details || "",
      show_payment_instructions: template.show_payment_instructions,
      is_default: template.is_default,
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Invoice Templates
        </CardTitle>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No templates yet. Create your first invoice template!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="relative">
                <div
                  className="h-2 rounded-t-lg"
                  style={{ backgroundColor: template.header_color }}
                />
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: template.accent_color }}
                        />
                        <span className="text-xs text-muted-foreground">Accent</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => openEdit(template)}>
                      Edit
                    </Button>
                    {!template.is_default && (
                      <Button size="sm" variant="outline" onClick={() => handleSetDefault(template.id)}>
                        Set Default
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Professional Template"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Header Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.header_color}
                      onChange={(e) => setFormData({ ...formData, header_color: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.header_color}
                      onChange={(e) => setFormData({ ...formData, header_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.accent_color}
                      onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bank Details</Label>
                <Textarea
                  value={formData.bank_details}
                  onChange={(e) => setFormData({ ...formData, bank_details: e.target.value })}
                  placeholder="Bank Name: ...&#10;Account Number: ...&#10;Account Name: ..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  placeholder="Payment is due within 30 days..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Input
                  value={formData.footer_text}
                  onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                  placeholder="Thank you for your business!"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Show Payment Instructions</Label>
                <Switch
                  checked={formData.show_payment_instructions}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_payment_instructions: checked })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingTemplate ? "Update" : "Create"} Template
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

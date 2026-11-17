import { useState, useEffect } from "react";
import {
  Mail,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Copy,
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SystemTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  subject: string | null;
  content: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_CATEGORIES = [
  { value: "order", label: "Order Management" },
  { value: "invoice", label: "Invoicing" },
  { value: "reservation", label: "Reservations" },
  { value: "payment", label: "Payments" },
  { value: "customer", label: "Customer Communication" },
  { value: "staff", label: "Staff Management" },
  { value: "marketing", label: "Marketing" },
  { value: "system", label: "System Notifications" },
];

const COMMON_VARIABLES = [
  { name: "business_name", description: "Business name" },
  { name: "customer_name", description: "Customer's name" },
  { name: "customer_email", description: "Customer's email" },
  { name: "customer_phone", description: "Customer's phone" },
  { name: "order_number", description: "Order number" },
  { name: "order_total", description: "Order total amount" },
  { name: "invoice_number", description: "Invoice number" },
  { name: "invoice_total", description: "Invoice total" },
  { name: "due_date", description: "Due date" },
  { name: "payment_link", description: "Payment link URL" },
  { name: "tracking_link", description: "Order tracking URL" },
  { name: "reservation_date", description: "Reservation date" },
  { name: "reservation_time", description: "Reservation time" },
  { name: "party_size", description: "Party size" },
  { name: "transaction_number", description: "Transaction/receipt number" },
  { name: "payment_method", description: "Payment method" },
  { name: "amount", description: "Payment amount" },
  { name: "currency", description: "Currency symbol" },
  { name: "business_address", description: "Business address" },
  { name: "business_phone", description: "Business phone" },
];

export const SystemTemplatesTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SystemTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<SystemTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "email",
    category: "order",
    subject: "",
    content: "",
    is_active: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from("system_templates" as any)
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true }) as any);

      if (error) throw error;
      setTemplates((data || []) as SystemTemplate[]);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  };

  const handleOpenDialog = (template?: SystemTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        type: template.type,
        category: template.category,
        subject: template.subject || "",
        content: template.content,
        is_active: template.is_active,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        type: "email",
        category: "order",
        subject: "",
        content: "",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast({
        title: "Validation Error",
        description: "Name and content are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const variables = extractVariables(formData.content + (formData.subject || ""));

      const templateData = {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        subject: formData.type === "email" ? formData.subject : null,
        content: formData.content,
        variables: variables,
        is_active: formData.is_active,
        is_system: false,
      };

      if (editingTemplate) {
        const { error } = await (supabase
          .from("system_templates" as any)
          .update(templateData as any)
          .eq("id", editingTemplate.id) as any);

        if (error) throw error;
        toast({ title: "Success", description: "Template updated successfully" });
      } else {
        const { error } = await (supabase
          .from("system_templates" as any)
          .insert(templateData as any) as any);

        if (error) throw error;
        toast({ title: "Success", description: "Template created successfully" });
      }

      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await (supabase
        .from("system_templates" as any)
        .delete()
        .eq("id", templateToDelete.id) as any);

      if (error) throw error;

      toast({ title: "Success", description: "Template deleted successfully" });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (template: SystemTemplate) => {
    try {
      const { error } = await (supabase
        .from("system_templates" as any)
        .update({ is_active: !template.is_active } as any)
        .eq("id", template.id) as any);

      if (error) throw error;

      setTemplates(prev =>
        prev.map(t =>
          t.id === template.id ? { ...t, is_active: !t.is_active } : t
        )
      );
    } catch (error: any) {
      console.error("Error toggling template:", error);
      toast({
        title: "Error",
        description: "Failed to update template status",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = (template: SystemTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      type: template.type,
      category: template.category,
      subject: template.subject || "",
      content: template.content,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + `{{${variable}}}`,
    }));
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || template.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">System Templates</h2>
          <p className="text-muted-foreground">
            Manage email and SMS templates for all customer communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTemplates}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TEMPLATE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Templates ({filteredTemplates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found. Create your first template to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {template.is_system && (
                            <Badge variant="outline" className="text-xs">System</Badge>
                          )}
                          {template.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.type === "email" ? "default" : "secondary"}>
                          {template.type === "email" ? (
                            <><Mail className="w-3 h-3 mr-1" />Email</>
                          ) : (
                            <><MessageSquare className="w-3 h-3 mr-1" />SMS</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{template.category}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.slice(0, 3).map((v) => (
                            <Badge key={v} variant="outline" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                          {template.variables.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.variables.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {template.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={() => handleToggleActive(template)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(template.updated_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(template)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!template.is_system && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setTemplateToDelete(template);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              Configure your email or SMS template with variable placeholders
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Order Confirmation Email"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.type === "email" && (
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Your Order {{order_number}} is Confirmed!"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={formData.type === "email" 
                  ? "Write your email content with HTML..."
                  : "Write your SMS message (max 160 chars)..."
                }
                rows={formData.type === "email" ? 12 : 4}
              />
              {formData.type === "sms" && (
                <p className="text-xs text-muted-foreground">
                  {formData.content.length}/160 characters
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quick Insert Variables</Label>
              <div className="flex flex-wrap gap-1">
                {COMMON_VARIABLES.map((v) => (
                  <Button
                    key={v.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(v.name)}
                    className="text-xs"
                  >
                    {`{{${v.name}}}`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingTemplate ? "Update Template" : "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

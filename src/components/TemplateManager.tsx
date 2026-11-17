import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Mail, MessageSquare, Edit, Trash2 } from "lucide-react";
import { TemplateDialog } from "./TemplateDialog";
import { useBusiness } from "@/contexts/BusinessContext";

interface Template {
  id: string;
  name: string;
  type: "email" | "sms";
  subject: string | null;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export const TemplateManager = () => {
  const { user } = useBusiness();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["communication-templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("communication_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("communication_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("communication_templates")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication-templates"] });
      toast.success("Template status updated");
    },
  });

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(2, -2).trim()))];
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communication Templates</h2>
          <p className="text-muted-foreground">
            Create reusable templates with variable placeholders like {"{{customer_name}}"}, {"{{order_number}}"}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <Card key={template.id} className={!template.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {template.type === "email" ? (
                    <Mail className="h-4 w-4 text-primary" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  )}
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {template.subject && (
                <CardDescription className="line-clamp-1">
                  {template.subject}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Content Preview:</p>
                  <p className="text-sm line-clamp-3 bg-muted p-2 rounded">
                    {template.content}
                  </p>
                </div>

                {template.variables && template.variables.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: template.id,
                        isActive: template.is_active,
                      })
                    }
                  >
                    {template.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(template.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              No templates yet. Create your first template to get started.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      <TemplateDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        template={editingTemplate}
      />
    </div>
  );
};

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface TemplateFormData {
  name: string;
  type: "email" | "sms";
  subject: string;
  content: string;
}

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: {
    id: string;
    name: string;
    type: "email" | "sms";
    subject: string | null;
    content: string;
  } | null;
}

export const TemplateDialog = ({ open, onOpenChange, template }: TemplateDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, setValue } = useForm<TemplateFormData>({
    defaultValues: {
      type: "email",
    },
  });

  const templateType = watch("type");
  const content = watch("content");

  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        type: template.type,
        subject: template.subject || "",
        content: template.content,
      });
    } else {
      reset({
        name: "",
        type: "email",
        subject: "",
        content: "",
      });
    }
  }, [template, reset]);

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(2, -2).trim()))];
  };

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const variables = extractVariables(data.content);
      
      const templateData = {
        name: data.name,
        type: data.type,
        subject: data.type === "email" ? data.subject : null,
        content: data.content,
        variables,
        is_active: true,
      };

      if (template) {
        const { error } = await supabase
          .from("communication_templates")
          .update(templateData)
          .eq("id", template.id);

        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase
          .from("communication_templates")
          .insert({
            ...templateData,
            user_id: user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication-templates"] });
      toast.success(template ? "Template updated successfully" : "Template created successfully");
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      toast.error("Failed to save template: " + error.message);
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    saveMutation.mutate(data);
  };

  const insertVariable = (variable: string) => {
    const currentContent = content || "";
    setValue("content", `${currentContent}{{${variable}}}`);
  };

  const commonVariables = [
    "customer_name",
    "customer_email",
    "customer_phone",
    "business_name",
    "points_balance",
    "order_number",
    "order_total",
    "invoice_number",
    "due_date",
    "business_name",
    "payment_amount",
    "reservation_date",
    "reservation_time",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            Use {"{{variable_name}}"} syntax to add placeholders that will be replaced with actual values
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              {...register("name", { required: true })}
              placeholder="e.g., Order Confirmation, Payment Reminder"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={templateType}
              onValueChange={(value) => setValue("type", value as "email" | "sms")}
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

          {templateType === "email" && (
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                {...register("subject", { required: templateType === "email" })}
                placeholder="e.g., Your order {{order_number}} has been confirmed"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              {...register("content", { required: true })}
              placeholder="Write your template here. Use {{variable_name}} for placeholders."
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Detected variables: {extractVariables(content || "").length > 0 ? (
                extractVariables(content || "").map(v => (
                  <Badge key={v} variant="outline" className="ml-1">
                    {v}
                  </Badge>
                ))
              ) : (
                "None"
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Quick Insert Variables</Label>
            <div className="flex flex-wrap gap-2">
              {commonVariables.map((variable) => (
                <Button
                  key={variable}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable(variable)}
                >
                  {variable}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : template ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

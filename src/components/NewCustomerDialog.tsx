import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";

interface NewCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerAdded?: () => void;
}

export const NewCustomerDialog = ({ open, onOpenChange, onCustomerAdded }: NewCustomerDialogProps) => {
  const { toast } = useToast();
  const { user } = useBusiness();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes || null,
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Customer added",
      description: `${formData.name} has been added to your customer list.`,
    });
    
    onCustomerAdded?.();
    onOpenChange(false);
    setFormData({ name: "", email: "", phone: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <PhoneInput
              id="phone"
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (Preferences, Allergies, etc.)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Enter any important customer notes or preferences..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Customer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

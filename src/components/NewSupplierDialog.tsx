import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface NewSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierAdded: () => void;
}

const NewSupplierDialog = ({ open, onOpenChange, onSupplierAdded }: NewSupplierDialogProps) => {
  const { user } = useBusiness();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    payment_terms: "",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('suppliers')
      .insert({
        user_id: user.id,
        name: formData.name,
        contact_name: formData.contact_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        website: formData.website || null,
        payment_terms: formData.payment_terms || null,
        notes: formData.notes || null
      });

    if (error) {
      console.error('Error creating supplier:', error);
      toast({ title: "Failed to create supplier", variant: "destructive" });
    } else {
      toast({ title: "Supplier added successfully" });
      onSupplierAdded();
      onOpenChange(false);
      setFormData({
        name: "",
        contact_name: "",
        email: "",
        phone: "",
        address: "",
        website: "",
        payment_terms: "",
        notes: ""
      });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="contact_name">Contact Person</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="phone">Phone</Label>
              <PhoneInput
                id="phone"
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Input
              id="payment_terms"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              placeholder="e.g., Net 30"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? "Adding..." : "Add Supplier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewSupplierDialog;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Supplier {
  id: string;
  name: string;
  is_active?: boolean;
}

interface NewSupplierOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  onOrderAdded: () => void;
}

const NewSupplierOrderDialog = ({ open, onOpenChange, suppliers, onOrderAdded }: NewSupplierOrderDialogProps) => {
  const { user } = useBusiness();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: "",
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_delivery: "",
    total_amount: "",
    notes: ""
  });

  const generateOrderNumber = () => {
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PO-${date}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.supplier_id) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('supplier_orders')
      .insert({
        user_id: user.id,
        supplier_id: formData.supplier_id,
        order_number: generateOrderNumber(),
        order_date: formData.order_date,
        expected_delivery: formData.expected_delivery || null,
        total_amount: parseFloat(formData.total_amount) || 0,
        notes: formData.notes || null,
        status: 'pending'
      });

    if (error) {
      console.error('Error creating order:', error);
      toast({ title: "Failed to create order", variant: "destructive" });
    } else {
      toast({ title: "Purchase order created" });
      onOrderAdded();
      onOpenChange(false);
      setFormData({
        supplier_id: "",
        order_date: format(new Date(), 'yyyy-MM-dd'),
        expected_delivery: "",
        total_amount: "",
        notes: ""
      });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.filter(s => s.is_active !== false).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order_date">Order Date</Label>
              <Input
                id="order_date"
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="expected_delivery">Expected Delivery</Label>
              <Input
                id="expected_delivery"
                type="date"
                value={formData.expected_delivery}
                onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="total_amount">Total Amount</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Order details, items, etc."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.supplier_id}>
              {isLoading ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewSupplierOrderDialog;

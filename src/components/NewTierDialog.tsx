import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { normalizeLoyaltyBenefits } from "@/lib/loyalty-benefits";

interface NewTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingTier?: any;
}

export const NewTierDialog = ({ open, onOpenChange, onSuccess, editingTier }: NewTierDialogProps) => {
  const { user } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    min_points: 0,
    max_points: "",
    discount_percentage: 0,
    color: "#6366f1",
    benefits: "",
  });

  useEffect(() => {
    if (editingTier) {
      setFormData({
        name: editingTier.name,
        min_points: editingTier.min_points,
        max_points: editingTier.max_points?.toString() || "",
        discount_percentage: editingTier.discount_percentage,
        color: editingTier.color || "#6366f1",
        benefits: editingTier.benefits?.join("\n") || "",
      });
    } else {
      setFormData({
        name: "",
        min_points: 0,
        max_points: "",
        discount_percentage: 0,
        color: "#6366f1",
        benefits: "",
      });
    }
  }, [editingTier, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const benefitsArray = normalizeLoyaltyBenefits(formData.benefits);

      const tierData = {
        user_id: user!.id,
        name: formData.name,
        min_points: formData.min_points,
        max_points: formData.max_points ? parseInt(formData.max_points) : null,
        discount_percentage: formData.discount_percentage,
        color: formData.color,
        benefits: benefitsArray,
      };

      if (editingTier) {
        const { error } = await supabase
          .from("loyalty_tiers")
          .update(tierData)
          .eq("id", editingTier.id);

        if (error) throw error;
        toast.success("Tier updated successfully");
      } else {
        const { error } = await supabase.from("loyalty_tiers").insert(tierData);

        if (error) throw error;
        toast.success("Tier created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving tier:", error);
      toast.error("Failed to save tier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTier ? "Edit Tier" : "Create New Tier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tier Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Bronze, Silver, Gold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_points">Min Points *</Label>
              <Input
                id="min_points"
                type="number"
                value={formData.min_points}
                onChange={(e) =>
                  setFormData({ ...formData, min_points: parseInt(e.target.value) })
                }
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_points">Max Points</Label>
              <Input
                id="max_points"
                type="number"
                value={formData.max_points}
                onChange={(e) => setFormData({ ...formData, max_points: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Discount % *</Label>
            <Input
              id="discount"
              type="number"
              value={formData.discount_percentage}
              onChange={(e) =>
                setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })
              }
              min="0"
              max="100"
              step="0.1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Tier Color</Label>
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Benefits (one per line)</Label>
            <Textarea
              id="benefits"
              value={formData.benefits}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              placeholder="Priority support&#10;Early access to sales&#10;Free shipping"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : editingTier ? "Update Tier" : "Create Tier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

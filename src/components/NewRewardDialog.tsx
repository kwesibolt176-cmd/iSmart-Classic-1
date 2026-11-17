import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

interface NewRewardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingReward?: any;
}

export const NewRewardDialog = ({ open, onOpenChange, onSuccess, editingReward }: NewRewardDialogProps) => {
  const { user } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    points_cost: 0,
    reward_type: "discount",
    stock_quantity: "",
  });

  useEffect(() => {
    if (editingReward) {
      setFormData({
        name: editingReward.name,
        description: editingReward.description || "",
        points_cost: editingReward.points_cost,
        reward_type: editingReward.reward_type,
        stock_quantity: editingReward.stock_quantity?.toString() || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        points_cost: 0,
        reward_type: "discount",
        stock_quantity: "",
      });
    }
  }, [editingReward, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const rewardData = {
        user_id: user!.id,
        name: formData.name,
        description: formData.description || null,
        points_cost: formData.points_cost,
        reward_type: formData.reward_type,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
      };

      if (editingReward) {
        const { error } = await supabase
          .from("loyalty_rewards")
          .update(rewardData)
          .eq("id", editingReward.id);

        if (error) throw error;
        toast.success("Reward updated successfully");
      } else {
        const { error } = await supabase.from("loyalty_rewards").insert(rewardData);

        if (error) throw error;
        toast.success("Reward created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving reward:", error);
      toast.error("Failed to save reward");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingReward ? "Edit Reward" : "Create New Reward"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Reward Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 10% Off Next Purchase"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the reward..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="points_cost">Points Cost *</Label>
            <Input
              id="points_cost"
              type="number"
              value={formData.points_cost}
              onChange={(e) =>
                setFormData({ ...formData, points_cost: parseInt(e.target.value) })
              }
              min="1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reward_type">Reward Type *</Label>
            <Select
              value={formData.reward_type}
              onValueChange={(value) => setFormData({ ...formData, reward_type: value })}
            >
              <SelectTrigger id="reward_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="free_item">Free Item</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="gift">Gift</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_quantity">Stock Quantity (Optional)</Label>
            <Input
              id="stock_quantity"
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              placeholder="Leave empty for unlimited"
              min="0"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : editingReward ? "Update Reward" : "Create Reward"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

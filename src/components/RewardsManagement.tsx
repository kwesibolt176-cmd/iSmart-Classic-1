import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { NewRewardDialog } from "@/components/NewRewardDialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: string;
  is_active: boolean;
  stock_quantity: number | null;
}

export const RewardsManagement = () => {
  const { user } = useBusiness();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  useEffect(() => {
    if (user) {
      fetchRewards();
    }
  }, [user?.id]);

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("user_id", user!.id)
        .order("points_cost");

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      toast.error("Failed to load rewards");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rewardId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("loyalty_rewards")
        .update({ is_active: isActive })
        .eq("id", rewardId);

      if (error) throw error;
      toast.success(isActive ? "Reward activated" : "Reward deactivated");
      fetchRewards();
    } catch (error) {
      console.error("Error updating reward:", error);
      toast.error("Failed to update reward");
    }
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm("Are you sure you want to delete this reward?")) return;

    try {
      const { error } = await supabase
        .from("loyalty_rewards")
        .delete()
        .eq("id", rewardId);

      if (error) throw error;
      toast.success("Reward deleted successfully");
      fetchRewards();
    } catch (error) {
      console.error("Error deleting reward:", error);
      toast.error("Failed to delete reward");
    }
  };

  const getRewardTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      discount: "Discount",
      free_item: "Free Item",
      service: "Service",
      gift: "Gift",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Create rewards that customers can redeem with their loyalty points
        </p>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 w-full sm:w-auto text-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Reward</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading rewards...</p>
          </CardContent>
        </Card>
      ) : rewards.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No rewards configured yet. Add your first reward to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {rewards.map((reward) => (
            <Card key={reward.id} className={!reward.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    {reward.name}
                  </span>
                  <div className="flex gap-2">
                    <Switch
                      checked={reward.is_active}
                      onCheckedChange={(checked) =>
                        handleToggleActive(reward.id, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingReward(reward);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(reward.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reward.description && (
                  <p className="text-sm text-muted-foreground">
                    {reward.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-bold">
                    {reward.points_cost} Points
                  </Badge>
                  <Badge>{getRewardTypeLabel(reward.reward_type)}</Badge>
                </div>
                {reward.stock_quantity !== null && (
                  <p className="text-sm text-muted-foreground">
                    Stock: {reward.stock_quantity} remaining
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewRewardDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingReward(null);
        }}
        onSuccess={() => {
          fetchRewards();
          setDialogOpen(false);
          setEditingReward(null);
        }}
        editingReward={editingReward}
      />
    </div>
  );
};

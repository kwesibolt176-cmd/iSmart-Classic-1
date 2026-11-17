import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { NewTierDialog } from "@/components/NewTierDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Tier {
  id: string;
  name: string;
  min_points: number;
  max_points: number | null;
  discount_percentage: number;
  color: string | null;
  benefits: any;
  display_order: number;
}

export const TierManagement = () => {
  const { user } = useBusiness();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);

  useEffect(() => {
    if (user) {
      fetchTiers();
    }
  }, [user]);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("loyalty_tiers")
        .select("*")
        .eq("user_id", user!.id)
        .order("display_order");

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error("Error fetching tiers:", error);
      toast.error("Failed to load tiers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tierId: string) => {
    if (!confirm("Are you sure you want to delete this tier?")) return;

    try {
      const { error } = await supabase
        .from("loyalty_tiers")
        .delete()
        .eq("id", tierId);

      if (error) throw error;
      toast.success("Tier deleted successfully");
      fetchTiers();
    } catch (error) {
      console.error("Error deleting tier:", error);
      toast.error("Failed to delete tier");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Create reward tiers to recognize and reward your best customers
        </p>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 w-full sm:w-auto text-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Tier</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading tiers...</p>
          </CardContent>
        </Card>
      ) : tiers.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No tiers configured yet. Add your first tier to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {tiers.map((tier) => (
            <Card key={tier.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span
                    className="flex items-center gap-2"
                    style={{ color: tier.color || undefined }}
                  >
                    {tier.name}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTier(tier);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tier.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Points Required:</span>{" "}
                    {tier.min_points}
                    {tier.max_points ? ` - ${tier.max_points}` : "+"}
                  </p>
                  {tier.discount_percentage > 0 && (
                    <Badge variant="secondary">
                      {tier.discount_percentage}% Discount
                    </Badge>
                  )}
                </div>
                {tier.benefits && tier.benefits.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Benefits:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {tier.benefits.map((benefit: string, i: number) => (
                        <li key={i}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewTierDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTier(null);
        }}
        onSuccess={() => {
          fetchTiers();
          setDialogOpen(false);
          setEditingTier(null);
        }}
        editingTier={editingTier}
      />
    </div>
  );
};

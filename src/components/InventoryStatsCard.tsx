import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";

export const InventoryStatsCard = ({ loading: parentLoading, variant, initialCount }: { loading: boolean; variant?: "hero"; initialCount?: number }) => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [loading, setLoading] = useState(initialCount === undefined);

  useEffect(() => {
    if (user && initialCount === undefined) {
      fetchInventoryCount();
    }
  }, [user?.id, currentLocation?.id]);

  const fetchInventoryCount = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("inventory_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { count: itemCount, error } = await query;

      if (error) throw error;
      setCount(itemCount || 0);
    } catch (error) {
      console.error("Error fetching inventory count:", error);
    } finally {
      setLoading(false);
    }
  };

  // For hero variant, just return the raw value so parent controls styling
  if (variant === "hero") {
    return <>{loading || parentLoading ? "—" : count.toString()}</>;
  }

  return (
    <StatsCard
      title="Inventory Items"
      value={loading || parentLoading ? "..." : count.toString()}
      icon={TrendingUp}
    />
  );
};

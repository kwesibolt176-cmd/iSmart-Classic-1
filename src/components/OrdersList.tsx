import { useState, useEffect } from "react";
import { UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";

interface TopItem {
  name: string;
  total_quantity: number;
}

export const OrdersList = () => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTopItems();
    }
  }, [user?.id, currentLocation]);

  const fetchTopItems = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase
        .from("order_items")
        .select(`
          name,
          quantity,
          order:orders!inner(user_id, created_at, location_id)
        `)
        .eq("order.user_id", user.id)
        .gte("order.created_at", today.toISOString());

      if (currentLocation) {
        query = query.eq("order.location_id", currentLocation.id);
      }

      const { data: orderItems, error } = await query;

      if (error) throw error;

      const itemCounts = (orderItems || []).reduce((acc: Record<string, number>, item: any) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
      }, {});

      const sortedItems = Object.entries(itemCounts)
        .map(([name, total_quantity]) => ({ name, total_quantity: total_quantity as number }))
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 4);

      setTopItems(sortedItems);
    } catch (error) {
      console.error("Error fetching top items:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all duration-300">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Today's Top Items</h3>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : topItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">No items sold today</p>
        ) : (
          topItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/30 transition-all duration-300 group hover:scale-[1.02] border border-transparent hover:border-primary/20"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm sm:text-base truncate">{item.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{item.total_quantity} sold today</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

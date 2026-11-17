import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";

interface ItemSale {
  name: string;
  quantity: number;
  revenue: number;
}

export const ItemSalesCard = () => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const { formatCurrency } = useCurrency();
  const [itemSales, setItemSales] = useState<ItemSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchItemSales();
    }
  }, [user?.id, currentLocation]);

  const fetchItemSales = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // First get today's completed orders
      let ordersQuery = supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["completed", "delivered"])
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString());

      if (currentLocation) {
        ordersQuery = ordersQuery.eq("location_id", currentLocation.id);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setItemSales([]);
        setLoading(false);
        return;
      }

      const orderIds = orders.map((o) => o.id);

      // Get order items for those orders
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("name, quantity, price")
        .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      // Aggregate by item name
      const salesByItem: Record<string, ItemSale> = {};
      
      (orderItems || []).forEach((item) => {
        if (!salesByItem[item.name]) {
          salesByItem[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }
        salesByItem[item.name].quantity += item.quantity;
        salesByItem[item.name].revenue += item.quantity * Number(item.price);
      });

      // Convert to array and sort by quantity
      const salesArray = Object.values(salesByItem)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setItemSales(salesArray);
    } catch (error) {
      console.error("Error fetching item sales:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Package className="w-5 h-5" />
            Top Selling Items
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Package className="w-5 h-5" />
          Top Selling Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        {itemSales.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No sales data available for today</p>
        ) : (
          <div className="space-y-4">
            {itemSales.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.quantity} units sold</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{formatCurrency(item.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

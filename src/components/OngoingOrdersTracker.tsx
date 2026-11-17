import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, ChefHat, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";

interface OngoingOrder {
  id: string;
  order_number: string;
  table_number: number | null;
  status: string;
  total: number;
  created_at: string;
  order_type?: string;
  items?: { name: string; quantity: number }[];
}

export const OngoingOrdersTracker = () => {
  const [orders, setOrders] = useState<OngoingOrder[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const { user } = useBusiness();
  const { format: formatCurrency } = useCurrency();

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          table_number,
          status,
          total,
          created_at,
          order_type,
          order_items (name, quantity)
        `)
        .eq("user_id", user.id)
        .in("status", ["pending", "processing", "ready"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      setOrders(
        (data || []).map((order) => ({
          id: order.id,
          order_number: order.order_number,
          table_number: order.table_number,
          status: order.status,
          total: Number(order.total),
          created_at: order.created_at,
          order_type: order.order_type,
          items: order.order_items,
        }))
      );
    } catch (error) {
      console.error("Error fetching ongoing orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();

      // Real-time subscription
      const channel = supabase
        .channel("ongoing-orders-tracker")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchOrders()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
            <Clock className="w-3 h-3 mr-1" />
            New
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <ChefHat className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Ready
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTimeSince = (dateStr: string) => {
    const now = new Date();
    const orderDate = new Date(dateStr);
    const diffMs = now.getTime() - orderDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const processingCount = orders.filter((o) => o.status === "processing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;

  if (orders.length === 0 && !loading) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Ongoing Orders</span>
              <Badge variant="secondary" className="text-xs">
                {orders.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchOrders();
                }}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-2 flex gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
              {pendingCount} new
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              {processingCount} cooking
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              {readyCount} ready
            </span>
          </div>

          <ScrollArea className="max-h-[200px] px-3 pb-3">
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-2 bg-muted/50 rounded-lg space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{order.order_number}</span>
                      {order.table_number && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          Table {order.table_number}
                        </Badge>
                      )}
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="truncate max-w-[150px]">
                      {order.items?.slice(0, 2).map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                      {(order.items?.length || 0) > 2 && "..."}
                    </span>
                    <span>{getTimeSince(order.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

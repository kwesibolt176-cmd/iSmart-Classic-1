import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { toast } from "sonner";
import { Clock, Check, ChefHat, X, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useCurrency } from "@/hooks/use-currency";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface SelfServeOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  ordering_stations: {
    station_name: string;
  } | null;
}

export const SelfServeOrdersManager = () => {
  const { format: formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["self-serve-orders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("self_serve_orders")
        .select(`
          *,
          ordering_stations (
            station_name
          )
        `)
        .eq("business_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data.map(order => ({
        ...order,
        items: order.items as unknown as OrderItem[],
      })) as SelfServeOrder[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("self-serve-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "self_serve_orders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["self-serve-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("self_serve_orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["self-serve-orders"] });
      toast.success("Order status updated");
    },
    onError: (error) => {
      toast.error("Failed to update order");
      console.error(error);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "confirmed":
        return "bg-orange-500";
      case "processing":
        return "bg-blue-500";
      case "ready":
        return "bg-green-500";
      case "completed":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "confirmed":
        return <Check className="w-4 h-4" />;
      case "processing":
        return <ChefHat className="w-4 h-4" />;
      case "ready":
        return <Check className="w-4 h-4" />;
      case "cancelled":
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const pendingOrders = orders?.filter(o => o.status === "pending") || [];
  const confirmedOrders = orders?.filter(o => o.status === "confirmed") || [];
  const processingOrders = orders?.filter(o => o.status === "processing") || [];
  const readyOrders = orders?.filter(o => o.status === "ready") || [];
  const completedOrders = orders?.filter(o => ["completed", "cancelled"].includes(o.status)) || [];

  const OrderCard = ({ order }: { order: SelfServeOrder }) => (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-mono">{order.order_number}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {order.ordering_stations?.station_name || "Unknown Station"}
            </p>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {getStatusIcon(order.status)}
            <span className="ml-1 capitalize">{order.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {order.customer_name && (
          <p className="text-sm">
            <span className="text-muted-foreground">Customer:</span> {order.customer_name}
          </p>
        )}
        
        <div className="space-y-1">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>{item.quantity}× {item.name}</span>
              <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="bg-muted/50 rounded p-2 text-sm">
            <span className="text-muted-foreground">Notes:</span> {order.notes}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <div>
            <span className="font-bold">{formatCurrency(order.total)}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {format(new Date(order.created_at), "HH:mm")}
            </span>
          </div>
          <div className="flex gap-2">
            {order.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({ 
                    orderId: order.id, 
                    status: "cancelled" 
                  })}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ 
                    orderId: order.id, 
                    status: "confirmed" 
                  })}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Confirm
                </Button>
              </>
            )}
            {order.status === "confirmed" && (
              <Button
                size="sm"
                onClick={() => updateStatusMutation.mutate({ 
                  orderId: order.id, 
                  status: "processing" 
                })}
              >
                <ChefHat className="w-4 h-4 mr-1" />
                Start Prep
              </Button>
            )}
            {order.status === "processing" && (
              <Button
                size="sm"
                onClick={() => updateStatusMutation.mutate({ 
                  orderId: order.id, 
                  status: "ready" 
                })}
              >
                <Check className="w-4 h-4 mr-1" />
                Ready
              </Button>
            )}
            {order.status === "ready" && (
              <Button
                size="sm"
                onClick={() => updateStatusMutation.mutate({ 
                  orderId: order.id, 
                  status: "completed" 
                })}
              >
                Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Self-Serve Orders</h2>
          <p className="text-muted-foreground">
            Orders placed via QR code scanning
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-16 bg-muted/50" />
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Pending Column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-yellow-50">
                <Clock className="w-3 h-3 mr-1" />
                Pending ({pendingOrders.length})
              </Badge>
            </div>
            <ScrollArea className="h-[600px]">
              {pendingOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {pendingOrders.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No pending orders
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Confirmed Column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-orange-50">
                <Check className="w-3 h-3 mr-1" />
                Confirmed ({confirmedOrders.length})
              </Badge>
            </div>
            <ScrollArea className="h-[600px]">
              {confirmedOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {confirmedOrders.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No confirmed orders
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Processing Column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-blue-50">
                <ChefHat className="w-3 h-3 mr-1" />
                Processing ({processingOrders.length})
              </Badge>
            </div>
            <ScrollArea className="h-[600px]">
              {processingOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {processingOrders.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No orders in preparation
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Ready Column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-green-50">
                <Check className="w-3 h-3 mr-1" />
                Ready ({readyOrders.length})
              </Badge>
            </div>
            <ScrollArea className="h-[600px]">
              {readyOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {readyOrders.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No orders ready
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};

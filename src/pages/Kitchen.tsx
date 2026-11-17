import { useState, useEffect, useRef } from "react";
import { KitchenOrderCard } from "@/components/KitchenOrderCard";
import { Order, OrderStatus } from "@/pages/Orders";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2, RefreshCw } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { useKitchenSound } from "@/hooks/use-kitchen-sound";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

export const Kitchen = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("new");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useBusiness();
  const { toast } = useToast();
  const { playNewOrderSound, initializeAudio } = useKitchenSound();
  const previousOrderCountRef = useRef<number | null>(null); // null = not initialized yet

  useEffect(() => {
    if (user) {
      fetchOrders();
      
      // Set up real-time subscription
      const channel = supabase
        .channel("kitchen-orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Order change received:", payload);
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  // Play sound when new pending orders appear
  useEffect(() => {
    const pendingCount = orders.filter((o) => o.status === "pending").length;
    
    // Only play sound if:
    // 1. Sound is enabled
    // 2. We've already loaded orders before (previousOrderCountRef.current !== null)
    // 3. There are more pending orders than before
    if (soundEnabled && previousOrderCountRef.current !== null && pendingCount > previousOrderCountRef.current) {
      console.log(`New orders detected: ${previousOrderCountRef.current} -> ${pendingCount}`);
      playNewOrderSound();
    }
    
    previousOrderCountRef.current = pendingCount;
  }, [orders, soundEnabled, playNewOrderSound]);

  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "processing", "ready"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

          return {
            id: order.id,
            orderNumber: order.order_number,
            tableNumber: order.table_number,
            status: order.status as OrderStatus,
            items: (items || []).map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: Number(item.price),
              notes: item.notes || undefined,
            })),
            total: Number(order.total),
            time: new Date(order.created_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
            server: order.server || undefined,
            created_at: order.created_at,
            order_type: order.order_type || undefined,
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error("Error fetching kitchen orders:", error);
      toast({
        title: "Error",
        description: "Failed to load kitchen orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      // Optimistically update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus as OrderStatus } : order
        ).filter((order) => 
          newStatus !== "served" || order.id !== orderId
        )
      );

      toast({
        title: "Status Updated",
        description: `Order marked as ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const processingOrders = orders.filter((o) => o.status === "processing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Kitchen Display"
        description={`${pendingOrders.length} new • ${processingOrders.length} processing • ${readyOrders.length} ready`}
        rightContent={
          <div className="flex gap-2">
            <Button
              variant={soundEnabled ? "default" : "outline"}
              size="icon"
              onClick={() => {
                // Initialize audio on first click (required by browsers)
                initializeAudio();
                setSoundEnabled(!soundEnabled);
              }}
              className="shrink-0"
              title={soundEnabled ? "Sound On" : "Sound Off"}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-700">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-slate-300/50 dark:border-slate-600/50 p-1 rounded-xl shadow-lg">
            <TabsTrigger
              value="new"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 font-semibold"
            >
              <div className={cn("w-2 h-2 rounded-full", activeTab === "new" ? "bg-white" : "bg-amber-500", "animate-pulse hidden sm:block")}></div>
              <span>New Orders</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs tabular-nums", activeTab === 'new' ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-500")}>
                {pendingOrders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 font-semibold"
            >
              <div className={cn("w-2 h-2 rounded-full", activeTab === "progress" ? "bg-white" : "bg-[hsl(217_91%_60%)]", "hidden sm:block")}></div>
              <span>In Progress</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs tabular-nums", activeTab === 'progress' ? "bg-white/20 text-white" : "bg-[hsl(217_91%_60%)]/10 text-[hsl(217_91%_60%)] dark:text-[hsl(217_91%_60%)]")}>
                {processingOrders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="ready"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 font-semibold"
            >
              <div className={cn("w-2 h-2 rounded-full", activeTab === "ready" ? "bg-white" : "bg-emerald-500", "hidden sm:block")}></div>
              <span>Ready</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs tabular-nums", activeTab === 'ready' ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500")}>
                {readyOrders.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {pendingOrders.length === 0 ? (
                <div className="col-span-full h-40 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 border border-border/50 rounded-xl">
                  <p className="text-sm font-medium">No new orders</p>
                </div>
              ) : (
                pendingOrders.map((order) => (
                  <KitchenOrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {processingOrders.length === 0 ? (
                <div className="col-span-full h-40 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 border border-border/50 rounded-xl">
                  <p className="text-sm font-medium">No orders in progress</p>
                </div>
              ) : (
                processingOrders.map((order) => (
                  <KitchenOrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="ready" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {readyOrders.length === 0 ? (
                <div className="col-span-full h-40 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 border border-border/50 rounded-xl">
                  <p className="text-sm font-medium">No orders ready</p>
                </div>
              ) : (
                readyOrders.map((order) => (
                  <KitchenOrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

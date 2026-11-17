import { useState, useEffect, useMemo } from "react";
import { OrderCard } from "@/components/OrderCard";
import { OrderStatusFilter } from "@/components/OrderStatusFilter";
import { CustomerPhoneLookup } from "@/components/CustomerPhoneLookup";
import { OrderFilters } from "@/components/OrderFilters";
import { OrderBulkActions } from "@/components/OrderBulkActions";
import { OrderTimeline } from "@/components/OrderTimeline";
import { SelfServeOrdersManager } from "@/components/qr-ordering/SelfServeOrdersManager";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LayoutGrid, List, Phone, QrCode } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { getIndustryConfig, isFoodIndustry } from "@/lib/industry-config";
import { PageHeader } from "@/components/ui/PageHeader";

export type OrderStatus = "pending" | "processing" | "ready" | "served" | "completed";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  inventory_item_id?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableNumber: number | null;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  time: string;
  server?: string;
  customer_name?: string;
  customer_phone?: string;
  payment_link?: string;
  payment_link_expires_at?: string;
  order_type?: string;
  created_at?: string;
}

export const Orders = () => {
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("orders");
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { user, profile } = useBusiness();
  const { currentLocation } = useLocation();
  const { format: formatCurrency } = useCurrency();
  const { toast } = useToast();
  
  // Industry-specific configuration
  const industryConfig = useMemo(() => getIndustryConfig(profile?.industry), [profile?.industry]);
  const isFood = useMemo(() => isFoodIndustry(profile?.industry), [profile?.industry]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user?.id, currentLocation]);

  // Real-time subscription — updates order status live without manual refresh
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders(prev => [newOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev =>
              prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } as Order : o)
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let ordersQuery = supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (currentLocation) {
        ordersQuery = ordersQuery.eq("location_id", currentLocation.id);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

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
              inventory_item_id: item.inventory_item_id || undefined,
            })),
            total: Number(order.total),
            time: new Date(order.created_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
            server: order.server || undefined,
            customer_name: order.customer_name || undefined,
            customer_phone: order.customer_phone || undefined,
            payment_link: order.payment_link || undefined,
            payment_link_expires_at: order.payment_link_expires_at || undefined,
            order_type: order.order_type || undefined,
            created_at: order.created_at,
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderDeleted = () => {
    fetchOrders();
  };

  const handleOrderUpdated = () => {
    fetchOrders();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setOrderTypeFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const handleOrderSelect = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (filterStatus !== "all" && order.status !== filterStatus) return false;
      
      // Search filter
      if (searchQuery && !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Order type filter
      if (orderTypeFilter !== "all" && order.order_type !== orderTypeFilter) {
        return false;
      }
      
      // Date range filter
      if (dateRange.from || dateRange.to) {
        const orderDate = order.created_at ? parseISO(order.created_at) : null;
        if (!orderDate) return false;
        
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(orderDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          })) {
            return false;
          }
        } else if (dateRange.from) {
          if (orderDate < startOfDay(dateRange.from)) return false;
        } else if (dateRange.to) {
          if (orderDate > endOfDay(dateRange.to)) return false;
        }
      }
      
      return true;
    });
  }, [orders, filterStatus, searchQuery, orderTypeFilter, dateRange]);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    ready: orders.filter((o) => o.status === "ready").length,
  };

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
        title={industryConfig.orderLabelPlural}
        description={`${stats.total} total • ${stats.pending} pending • ${stats.processing} in progress • ${stats.ready} ready`}
        rightContent={
          <div className="flex items-center gap-2">
            <OrderStatusFilter filterStatus={filterStatus} onFilterChange={setFilterStatus} />
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">

        {/* Tabs and View Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto overflow-hidden">
            <TabsList className="w-full justify-start bg-transparent border-b border-border/50 rounded-none h-auto p-0 overflow-x-auto flex-nowrap shrink-0">
              <TabsTrigger 
                value="orders" 
                className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none truncate"
              >
                All {industryConfig.orderLabelPlural}
              </TabsTrigger>
              <TabsTrigger 
                value="lookup" 
                className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none truncate"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">{industryConfig.customerLabel} Lookup</span>
                <span className="sm:hidden">Lookup</span>
              </TabsTrigger>
              {isFood && (
                <TabsTrigger 
                  value="qr-orders" 
                  className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none truncate"
                >
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline">Self-Serve Orders</span>
                  <span className="sm:hidden">QR</span>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          {/* View Toggles matching specific Orders Tab view flow */}
          {activeTab === "orders" && (
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">

          <TabsContent value="orders" className="mt-6 space-y-6">
            {/* Filters */}
            <div className="pb-5 border-b border-border/50">
              <OrderFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                orderType={orderTypeFilter}
                onOrderTypeChange={setOrderTypeFilter}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onClearFilters={handleClearFilters}
              />
            </div>

            {/* Bulk Actions */}
            <OrderBulkActions
              selectedOrders={selectedOrders}
              onSelectionChange={setSelectedOrders}
              allOrderIds={filteredOrders.map((o) => o.id)}
              onRefresh={fetchOrders}
            />

            {/* Orders Grid/List */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-6 mt-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="relative group"
                  >
                    <div className={cn(
                      "absolute -top-3 -left-3 z-20 transition-opacity duration-200",
                      selectedOrders.includes(order.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <div className="bg-card rounded-md shadow-md border border-border p-1 flex items-center justify-center">
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                          className="w-5 h-5 rounded"
                        />
                      </div>
                    </div>
                    <OrderCard 
                      order={order}
                      onOrderDeleted={handleOrderDeleted}
                      onOrderUpdated={handleOrderUpdated}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-border/50 overflow-hidden shadow-sm flex flex-col gap-px">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className={cn(
                      "p-5 flex flex-col gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors bg-card",
                      selectedOrders.includes(order.id) && "bg-slate-50 dark:bg-slate-800/40"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5">
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <h3 className="font-semibold text-sm text-foreground truncate">#{order.orderNumber.replace('#', '')}</h3>
                             <span className="text-xs font-medium text-muted-foreground uppercase">{order.status}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                             <span className="truncate">{order.customer_name || "Walk-in"}</span>
                             <span>•</span>
                             <span>{order.time}</span>
                             {order.order_type && (
                               <>
                                 <span>•</span>
                                 <span className="capitalize">{order.order_type.replace("_", " ")}</span>
                               </>
                             )}
                             {order.tableNumber && (
                               <>
                                 <span>•</span>
                                 <span>Table {order.tableNumber}</span>
                               </>
                             )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {order.items.slice(0, 3).map((item, i) => (
                               <span key={item.id} className="text-xs text-foreground/80">
                                 <span className="text-muted-foreground font-medium">{item.quantity}×</span> {item.name}{i < Math.min(order.items.length, 3) - 1 ? ", " : ""}
                               </span>
                            ))}
                            {order.items.length > 3 && (
                               <span className="text-xs text-muted-foreground border border-border/50 rounded px-1.5 ml-1">+{order.items.length - 3}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pl-8 pt-1">
                      <OrderTimeline status={order.status} createdAt={order.created_at || ""} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredOrders.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-base sm:text-lg">No orders found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="lookup" className="mt-4">
            <Card className="p-4 sm:p-6 bg-card border-border">
              <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Find {industryConfig.customerLabel} {industryConfig.orderLabelPlural}</h2>
              <CustomerPhoneLookup />
            </Card>
          </TabsContent>

          {isFood && (
            <TabsContent value="qr-orders" className="mt-4">
              <SelfServeOrdersManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

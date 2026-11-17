import { useState, useEffect, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Truck, Package, MapPin, Clock, CheckCircle2, 
  AlertCircle, RefreshCw, Bell, X, Maximize2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";
import { DeliveryTracking } from "./DeliveryTracking";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ActiveDelivery {
  id: string;
  order_id: string | null;
  status: string;
  delivery_contact: string;
  delivery_address: string;
  delivery_phone: string;
  delivery_fee: number;
  estimated_delivery_time: string | null;
  created_at: string;
  updated_at: string;
  delivery_partners?: { name: string } | null;
  orders?: { order_number: string } | null;
}

interface DeliveryUpdate {
  id: string;
  deliveryId: string;
  orderNumber: string;
  status: string;
  timestamp: Date;
  message: ReactNode;
}

export const LiveDeliverySession = () => {
  const { formatCurrency } = useCurrency();
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<DeliveryUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    fetchActiveDeliveries();

    // Subscribe to real-time updates for delivery_orders
    const deliveryChannel = supabase
      .channel("live-deliveries")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_orders",
        },
        (payload) => {
          console.log("Delivery update:", payload);
          handleDeliveryUpdate(payload);
          fetchActiveDeliveries();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "delivery_status_history",
        },
        (payload) => {
          console.log("Status history update:", payload);
          handleStatusHistoryUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deliveryChannel);
    };
  }, []);

  const fetchActiveDeliveries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("delivery_orders")
        .select(`
          *,
          delivery_partners (name),
          orders (order_number)
        `)
        .eq("user_id", user.id)
        .in("status", ["pending", "picked_up", "in_transit"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActiveDeliveries(data || []);
    } catch (error) {
      console.error("Error fetching active deliveries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryUpdate = (payload: any) => {
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    if (eventType === "UPDATE" && newRecord && oldRecord) {
      const statusChanged = newRecord.status !== oldRecord.status;
      if (statusChanged) {
        const update: DeliveryUpdate = {
          id: `${newRecord.id}-${Date.now()}`,
          deliveryId: newRecord.id,
          orderNumber: newRecord.id.slice(0, 8),
          status: newRecord.status,
          timestamp: new Date(),
          message: getStatusMessage(newRecord.status),
        };
        
        setRecentUpdates(prev => [update, ...prev].slice(0, 10));
        
        // Show toast notification
        toast.info(update.message, {
          description: `Order ${update.orderNumber}`,
          action: {
            label: "View",
            onClick: () => setSelectedDelivery(newRecord.id),
          },
        });
      }
    }
  };

  const handleStatusHistoryUpdate = (payload: any) => {
    const { new: newRecord } = payload;
    if (newRecord) {
      // Refresh the relevant delivery
      fetchActiveDeliveries();
    }
  };

  const getStatusMessage = (status: string): ReactNode => {
    switch (status) {
      case "picked_up":
        return <span className="flex items-center gap-1"><Package className="w-4 h-4" /> Order has been picked up!</span>;
      case "in_transit":
        return <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> Order is in transit!</span>;
      case "delivered":
        return <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Order delivered successfully!</span>;
      case "cancelled":
        return <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-red-500" /> Delivery cancelled</span>;
      default:
        return `Status updated to: ${status}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-500/10 text-green-500";
      case "in_transit":
        return "bg-blue-500/10 text-blue-500";
      case "picked_up":
        return "bg-amber-500/10 text-amber-500";
      case "pending":
        return "bg-gray-500/10 text-gray-500";
      case "cancelled":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return <CheckCircle2 className="w-4 h-4" />;
      case "in_transit":
      case "picked_up":
        return <Truck className="w-4 h-4" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (activeDeliveries.length === 0 && !loading) {
    return null; // Don't show if no active deliveries
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsMinimized(false)}
          className="rounded-full h-14 w-14 shadow-lg relative"
        >
          <Truck className="w-6 h-6" />
          {activeDeliveries.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeDeliveries.length}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card className="fixed bottom-4 right-4 w-96 max-h-[500px] z-50 shadow-xl border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="relative">
                <Truck className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              Live Deliveries
              <Badge variant="secondary" className="ml-2">
                {activeDeliveries.length}
              </Badge>
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchActiveDeliveries}>
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(true)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <ScrollArea className="h-[350px] pr-2">
              <div className="space-y-3">
                {/* Recent Updates */}
                {recentUpdates.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Bell className="w-3 h-3" />
                      Recent Updates
                    </p>
                    <div className="space-y-1">
                      {recentUpdates.slice(0, 3).map(update => (
                        <div 
                          key={update.id}
                          className="text-xs p-2 bg-primary/5 rounded-lg cursor-pointer hover:bg-primary/10"
                          onClick={() => setSelectedDelivery(update.deliveryId)}
                        >
                          <p className="font-medium">{update.message}</p>
                          <p className="text-muted-foreground">
                            {format(update.timestamp, "h:mm a")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Deliveries */}
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Active Deliveries
                </p>
                {activeDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedDelivery(delivery.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(delivery.status)}
                        <span className="font-mono text-sm font-medium">
                          {delivery.orders?.order_number || delivery.id.slice(0, 8)}
                        </span>
                      </div>
                      <Badge className={`text-xs ${getStatusColor(delivery.status)}`}>
                        {delivery.status.replace("_", " ")}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{delivery.delivery_address}</span>
                      </div>
                      {delivery.estimated_delivery_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            ETA: {format(new Date(delivery.estimated_delivery_time), "h:mm a")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {delivery.delivery_partners?.name || "Partner"}
                      </span>
                      <span className="text-xs font-medium">
                        {formatCurrency(delivery.delivery_fee)}
                      </span>
                    </div>
                  </div>
                ))}

                {activeDeliveries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active deliveries</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Delivery Details Dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Delivery Details
            </DialogTitle>
          </DialogHeader>
          {selectedDelivery && <DeliveryTracking deliveryOrderId={selectedDelivery} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

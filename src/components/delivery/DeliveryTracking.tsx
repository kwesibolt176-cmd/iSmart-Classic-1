import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Truck, Package, MapPin, Phone, Clock, 
  CheckCircle2, Circle, RefreshCw, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";

interface DeliveryOrder {
  id: string;
  order_id: string | null;
  status: string;
  pickup_address: string;
  delivery_address: string;
  delivery_contact: string;
  delivery_phone: string;
  delivery_notes: string | null;
  delivery_fee: number;
  estimated_pickup_time: string | null;
  estimated_delivery_time: string | null;
  actual_pickup_time: string | null;
  actual_delivery_time: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  tracking_url: string | null;
  created_at: string;
  delivery_partners?: { name: string; logo_url: string | null } | null;
}

interface StatusHistoryItem {
  id: string;
  status: string;
  notes: string | null;
  location: string | null;
  created_at: string;
}

interface DeliveryTrackingProps {
  deliveryOrderId: string;
  compact?: boolean;
}

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "picked_up", label: "Picked Up", icon: Truck },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

export const DeliveryTracking = ({ deliveryOrderId, compact = false }: DeliveryTrackingProps) => {
  const { formatCurrency } = useCurrency();
  const [delivery, setDelivery] = useState<DeliveryOrder | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveryDetails();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`delivery-${deliveryOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_orders",
          filter: `id=eq.${deliveryOrderId}`,
        },
        () => {
          fetchDeliveryDetails();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "delivery_status_history",
          filter: `delivery_order_id=eq.${deliveryOrderId}`,
        },
        () => {
          fetchStatusHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliveryOrderId]);

  const fetchDeliveryDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select(`
          *,
          delivery_partners (name, logo_url)
        `)
        .eq("id", deliveryOrderId)
        .single();

      if (error) throw error;
      setDelivery(data);
      fetchStatusHistory();
    } catch (error) {
      console.error("Error fetching delivery:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_status_history")
        .select("*")
        .eq("delivery_order_id", deliveryOrderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error("Error fetching status history:", error);
    }
  };

  const getStatusIndex = (status: string) => {
    return STATUS_STEPS.findIndex(s => s.key === status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-500/10 text-green-500 border-green-500";
      case "in_transit":
        return "bg-blue-500/10 text-blue-500 border-blue-500";
      case "picked_up":
        return "bg-amber-500/10 text-amber-500 border-amber-500";
      case "pending":
        return "bg-gray-500/10 text-gray-500 border-gray-500";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500";
    }
  };

  if (loading) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span className="text-muted-foreground">Loading delivery details...</span>
        </div>
      </Card>
    );
  }

  if (!delivery) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <div className="text-center py-8 text-muted-foreground">
          Delivery not found
        </div>
      </Card>
    );
  }

  const currentStatusIndex = getStatusIndex(delivery.status);

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Delivery Status</span>
          </div>
          <Badge className={getStatusColor(delivery.status)}>
            {delivery.status.replace("_", " ")}
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-1 mb-3">
          {STATUS_STEPS.map((step, index) => (
            <div
              key={step.key}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= currentStatusIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          {delivery.estimated_delivery_time && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Est. delivery: {format(new Date(delivery.estimated_delivery_time), "h:mm a")}
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Tracking
          </CardTitle>
          <Badge className={getStatusColor(delivery.status)}>
            {delivery.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Partner */}
        {delivery.delivery_partners && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            {delivery.delivery_partners.logo_url ? (
              <img
                src={delivery.delivery_partners.logo_url}
                alt={delivery.delivery_partners.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <p className="font-medium">{delivery.delivery_partners.name}</p>
              <p className="text-sm text-muted-foreground">Delivery Partner</p>
            </div>
          </div>
        )}

        {/* Status Progress */}
        <div className="space-y-4">
          <h4 className="font-medium">Delivery Progress</h4>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-muted" />
            <div
              className="absolute left-4 top-4 w-0.5 bg-primary transition-all"
              style={{
                height: `${(currentStatusIndex / (STATUS_STEPS.length - 1)) * 100}%`,
              }}
            />

            {/* Steps */}
            <div className="space-y-6">
              {STATUS_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;

                return (
                  <div key={step.key} className="flex items-start gap-4 relative">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`font-medium ${!isCompleted ? "text-muted-foreground" : ""}`}>
                        {step.label}
                      </p>
                      {statusHistory
                        .filter(h => h.status === step.key)
                        .map(h => (
                          <div key={h.id} className="text-sm text-muted-foreground mt-1">
                            <p>{format(new Date(h.created_at), "MMM d, h:mm a")}</p>
                            {h.notes && <p className="italic">{h.notes}</p>}
                            {h.location && (
                              <p className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {h.location}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Separator />

        {/* Delivery Details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Delivery Address
            </h4>
            <p className="text-sm text-muted-foreground">{delivery.delivery_address}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Recipient
            </h4>
            <p className="text-sm">{delivery.delivery_contact}</p>
            <p className="text-sm text-muted-foreground">{delivery.delivery_phone}</p>
          </div>
        </div>

        {/* Driver Info */}
        {delivery.driver_name && (
          <div className="p-3 rounded-lg border bg-muted/30">
            <h4 className="font-medium mb-2">Driver Information</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{delivery.driver_name}</p>
                <p className="text-sm text-muted-foreground">{delivery.driver_phone}</p>
              </div>
              {delivery.driver_phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${delivery.driver_phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Timing Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          {delivery.estimated_delivery_time && (
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                Estimated Delivery
              </div>
              <p className="font-medium">
                {format(new Date(delivery.estimated_delivery_time), "MMM d, h:mm a")}
              </p>
            </div>
          )}
          {delivery.actual_delivery_time && (
            <div className="p-3 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Delivered At
              </div>
              <p className="font-medium text-green-600">
                {format(new Date(delivery.actual_delivery_time), "MMM d, h:mm a")}
              </p>
            </div>
          )}
        </div>

        {/* Delivery Fee */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <span className="text-muted-foreground">Delivery Fee</span>
          <span className="font-bold text-lg">{formatCurrency(delivery.delivery_fee)}</span>
        </div>

        {/* Tracking Link */}
        {delivery.tracking_url && (
          <Button variant="outline" className="w-full" asChild>
            <a href={delivery.tracking_url} target="_blank" rel="noopener noreferrer">
              View Full Tracking
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

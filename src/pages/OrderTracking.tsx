import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";
import { 
  Loader2, Package, Search, CheckCircle2, Clock, Truck, 
  XCircle, MapPin, Phone, Mail, Store 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DeliveryTracking } from "@/components/delivery/DeliveryTracking";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StoreOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string | null;
  quantity: number;
  total_amount: number;
  payment_method: string | null;
  payment_status: string;
  status: string;
  created_at: string;
  product_id: string;
  user_id: string;
  social_media_products: {
    name: string;
    image_url: string | null;
  };
  business_profiles?: {
    business_name: string;
  };
}

interface POSOrder {
  id: string;
  order_number: string;
  customer_phone: string | null;
  total: number;
  status: string;
  order_type: string;
  created_at: string;
  user_id: string;
  order_items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  business_profiles?: {
    business_name: string;
  };
}

interface DeliveryOrder {
  id: string;
  status: string;
  delivery_contact: string;
  delivery_address: string;
  estimated_delivery_time: string | null;
  order_id: string | null;
}

export const OrderTracking = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([]);
  const [posOrders, setPOSOrders] = useState<POSOrder[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const { format: formatCurrency } = useCurrency();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your phone number or email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Fetch from social_media_orders (storefront orders)
      const { data: storeData, error: storeError } = await supabase
        .from("social_media_orders")
        .select("*")
        .or(`customer_phone.eq.${searchQuery},customer_email.eq.${searchQuery}`)
        .order("created_at", { ascending: false });

      if (storeError) throw storeError;

      // Fetch product details and business info for store orders
      const storeOrdersWithProducts = await Promise.all(
        (storeData || []).map(async (order) => {
          const [productRes, businessRes] = await Promise.all([
            supabase
              .from("inventory_items")
              .select("name, image_url")
              .eq("id", order.product_id)
              .single(),
            supabase
              .from("business_profiles")
              .select("business_name")
              .eq("user_id", order.user_id)
              .single()
          ]);

          return {
            ...order,
            social_media_products: productRes.data || { name: "Unknown Product", image_url: null },
            business_profiles: businessRes.data || undefined,
          };
        })
      );
      setStoreOrders(storeOrdersWithProducts);

      // Fetch from orders (POS orders)
      const { data: posData, error: posError } = await supabase
        .from("orders")
        .select(`
          id, order_number, customer_phone, total, status, order_type, created_at, user_id,
          order_items (name, quantity, price)
        `)
        .eq("customer_phone", searchQuery)
        .order("created_at", { ascending: false });

      if (posError) throw posError;

      // Fetch business info for POS orders
      const posOrdersWithBusiness = await Promise.all(
        (posData || []).map(async (order) => {
          const { data: business } = await supabase
            .from("business_profiles")
            .select("business_name")
            .eq("user_id", order.user_id)
            .single();

          return {
            ...order,
            business_profiles: business || undefined,
          };
        })
      );
      setPOSOrders(posOrdersWithBusiness);

      // Fetch delivery orders for this phone
      const { data: deliveryData } = await supabase
        .from("delivery_orders")
        .select("id, status, delivery_contact, delivery_address, estimated_delivery_time, order_id")
        .eq("delivery_phone", searchQuery)
        .in("status", ["pending", "picked_up", "in_transit"])
        .order("created_at", { ascending: false });

      setDeliveryOrders(deliveryData || []);

      const totalOrders = (storeOrdersWithProducts?.length || 0) + (posData?.length || 0);
      if (totalOrders === 0) {
        toast({
          title: "No Orders Found",
          description: "We couldn't find any orders with that information",
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "processing":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "shipped":
      case "in_transit":
      case "picked_up":
        return <Truck className="w-5 h-5 text-purple-500" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
      case "delivered":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const totalOrders = storeOrders.length + posOrders.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">
            Enter your phone number or email to view your order status
          </p>
        </div>

        {/* Search Bar */}
        <Card className="p-6 mb-8">
          <div className="flex gap-2">
            <Input
              placeholder="Phone number or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </Button>
          </div>
        </Card>

        {/* Active Deliveries Banner */}
        {deliveryOrders.length > 0 && (
          <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3 mb-3">
              <Truck className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Active Deliveries</h3>
              <Badge variant="secondary">{deliveryOrders.length}</Badge>
            </div>
            <div className="space-y-2">
              {deliveryOrders.map((delivery) => (
                <div 
                  key={delivery.id} 
                  className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedDelivery(delivery.id)}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(delivery.status)}
                    <div>
                      <p className="font-medium text-sm">{delivery.delivery_address}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {delivery.status.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Track</Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Orders */}
        {hasSearched && totalOrders > 0 && (
          <Tabs defaultValue={storeOrders.length > 0 ? "store" : "pos"} className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="store" className="flex-1">
                <Store className="w-4 h-4 mr-2" />
                Online Orders ({storeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="pos" className="flex-1">
                <Package className="w-4 h-4 mr-2" />
                In-Store Orders ({posOrders.length})
              </TabsTrigger>
            </TabsList>

            {/* Store Orders */}
            <TabsContent value="store" className="space-y-4">
              {storeOrders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {order.social_media_products.image_url ? (
                      <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={order.social_media_products.image_url}
                          alt={order.social_media_products.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full md:w-32 h-32 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <Package className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {order.social_media_products.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {order.business_profiles?.business_name || "Store"} • {format(new Date(order.created_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <Badge variant={getStatusColor(order.status)}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p className="font-medium">{order.quantity}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment</p>
                          <p className="font-medium capitalize">{order.payment_method || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment Status</p>
                          <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                            {order.payment_status}
                          </Badge>
                        </div>
                      </div>

                      {order.delivery_address && (
                        <div className="pt-2 border-t flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Delivery Address</p>
                            <p className="text-sm font-medium">{order.delivery_address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* POS Orders */}
            <TabsContent value="pos" className="space-y-4">
              {posOrders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{order.order_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.business_profiles?.business_name || "Store"} • {format(new Date(order.created_at), "MMM dd, yyyy h:mm a")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Items</p>
                      <div className="space-y-2">
                        {order.order_items?.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        {order.order_items?.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{order.order_items.length - 5} more items
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline" className="capitalize">
                          {order.order_type?.replace("-", " ") || "Order"}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {hasSearched && !loading && totalOrders === 0 && (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Orders Found</h3>
            <p className="text-muted-foreground">
              We couldn't find any orders with that information
            </p>
          </Card>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <Card className="p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Enter Your Details</h3>
            <p className="text-muted-foreground">
              Search using your phone number or email to see your orders
            </p>
          </Card>
        )}
      </div>

      {/* Delivery Tracking Dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Delivery Tracking
            </DialogTitle>
          </DialogHeader>
          {selectedDelivery && <DeliveryTracking deliveryOrderId={selectedDelivery} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

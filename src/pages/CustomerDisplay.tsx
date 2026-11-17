import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ShoppingBag, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useCurrency } from "@/hooks/use-currency";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
}

export const CustomerDisplay = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { format: formatCurrency } = useCurrency();

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      
      // Set up realtime subscription
      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`
          },
          () => fetchOrder()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      if (orderData) {
        const items = orderData.order_items.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
        }));

        const subtotal = items.reduce((sum: number, item: OrderItem) => 
          sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.1; // 10% tax

        setOrder({
          orderNumber: orderData.order_number,
          items,
          subtotal,
          tax,
          total: Number(orderData.total),
          status: orderData.status,
        });
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Order Found</h1>
          <p className="text-muted-foreground">Please scan the QR code on your receipt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-2 text-foreground">Welcome!</h1>
          <p className="text-xl text-muted-foreground">Your order is being prepared</p>
        </div>

        {/* Order Status */}
        <Card className="mb-8 border-2 border-primary/20 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
          <div>
                <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                <p className="text-3xl font-bold text-foreground">{order.orderNumber}</p>
              </div>
              <Badge className="text-lg py-2 px-4 bg-primary">
                <Clock className="w-5 h-5 mr-2" />
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Order received</span>
              <span>Processing</span>
              <span>Ready</span>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBag className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Your Order</h2>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {item.quantity}x
                    </Badge>
                    <span className="text-lg text-foreground">{item.name}</span>
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Total */}
        <Card className="shadow-lg border-2 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Receipt className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Order Summary</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-lg text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg text-muted-foreground">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="border-t-2 border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-2xl font-bold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thank You Message */}
        <div className="text-center mt-12">
          <p className="text-lg text-muted-foreground">
            Thank you for your order! We'll notify you when it's ready.
          </p>
        </div>
      </div>
    </div>
  );
};

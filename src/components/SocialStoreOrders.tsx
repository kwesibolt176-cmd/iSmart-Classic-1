import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { Loader2, ShoppingBag, Phone, Mail, Package } from "lucide-react";
interface SocialOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total_amount: number;
  quantity: number;
  status: string;
  payment_status: string;
  created_at: string;
  product_id: string;
  delivery_address: string | null;
}

export const SocialStoreOrders = () => {
  const { user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [orders, setOrders] = useState<SocialOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user?.id]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("social_media_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("social_media_orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleUpdatePayment = async (orderId: string, paymentStatus: string) => {
    try {
      const { error } = await supabase
        .from("social_media_orders")
        .update({ payment_status: paymentStatus })
        .eq("id", orderId);

      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === "completed").length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
          <p className="text-3xl font-bold">{totalOrders}</p>
        </div>
        <div className="bg-gradient-to-br from-[hsl(217_91%_60%)]/10 to-[hsl(217_91%_60%)]/5 rounded-lg p-6 border border-[hsl(217_91%_60%)]/20">
          <p className="text-sm text-muted-foreground mb-1">Completed</p>
          <p className="text-3xl font-bold text-[hsl(217_91%_60%)]">{completedOrders}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg p-6 border border-orange-500/20">
          <p className="text-sm text-muted-foreground mb-1">Pending</p>
          <p className="text-3xl font-bold text-orange-600">{pendingOrders}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="p-6 sm:p-8 shadow-[var(--shadow-card)]">
          <div className="text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-3">No Orders Yet</h2>
            <p className="text-muted-foreground">
              Orders will appear here once customers start purchasing from your store
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{order.customer_name}</h3>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            {order.customer_phone}
                          </div>
                          {order.customer_email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              {order.customer_email}
                            </div>
                          )}
                          {order.delivery_address && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Package className="w-4 h-4" />
                              {order.delivery_address}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                          {order.status}
                        </Badge>
                        <Badge variant={order.payment_status === "paid" ? "default" : "outline"}>
                          {order.payment_status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">Qty: {order.quantity}</span>
                      <span className="font-bold text-primary text-lg">
                        {formatCurrency(Number(order.total_amount))}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {order.payment_status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdatePayment(order.id, "paid")}
                        >
                          Mark Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdatePayment(order.id, "failed")}
                        >
                          Mark Failed
                        </Button>
                      </>
                    )}
                    {order.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, "processing")}
                        >
                          Mark Processing
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(order.id, "cancelled")}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {order.status === "processing" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, "completed")}
                      >
                        Mark Completed
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Search, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";

interface CustomerOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  customer_name: string;
}

export const CustomerPhoneLookup = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const { user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!phone.trim() || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, customer_name")
        .eq("user_id", user.id)
        .eq("customer_phone", phone.trim())
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setOrders(data || []);

      if (!data || data.length === 0) {
        toast({
          title: "No orders found",
          description: `No orders found for phone number ${phone}`,
        });
      }
    } catch (error) {
      console.error("Error searching orders:", error);
      toast({
        title: "Error",
        description: "Failed to search orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="Enter phone number"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !phone.trim()}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      {orders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Found {orders.length} order{orders.length > 1 ? "s" : ""}
          </h3>
          {orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{order.order_number}</p>
                  </div>
                  {order.customer_name && (
                    <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(Number(order.total))}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
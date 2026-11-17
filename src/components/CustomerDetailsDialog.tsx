import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Mail, Calendar, ShoppingBag, Receipt, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import type { Customer } from "@/pages/Customers";

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

interface LoyaltyTransaction {
  id: string;
  points_amount: number;
  transaction_type: string;
  created_at: string;
  notes: string | null;
}

export const CustomerDetailsDialog = ({ customer, open, onOpenChange }: CustomerDetailsDialogProps) => {
  const { user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0, avgOrderValue: 0 });

  useEffect(() => {
    if (customer && open && user) {
      fetchCustomerData();
    }
  }, [customer, open, user]);

  const fetchCustomerData = async () => {
    if (!customer || !user) return;
    setLoading(true);

    // Fetch orders for this customer
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, order_number, total, status, created_at")
      .eq("user_id", user.id)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (ordersData) {
      setOrders(ordersData);
      const totalSpent = ordersData.reduce((sum, o) => sum + Number(o.total), 0);
      setStats({
        totalOrders: ordersData.length,
        totalSpent,
        avgOrderValue: ordersData.length > 0 ? totalSpent / ordersData.length : 0
      });
    }

    // Fetch loyalty transactions
    const { data: loyaltyData } = await supabase
      .from("loyalty_transactions")
      .select("id, points_amount, transaction_type, created_at, notes")
      .eq("user_id", user.id)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (loyaltyData) {
      setLoyaltyTransactions(loyaltyData);
    }

    setLoading(false);
  };

  if (!customer) return null;

  const initials = customer.name.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Header */}
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold">{customer.name}</h3>
                {customer.loyaltyPoints > 100 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    VIP
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" /> {customer.email}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {customer.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Since {customer.lastVisit}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Orders</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Spent</span>
                </div>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalSpent)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loyalty Points</span>
                </div>
                <p className="text-2xl font-bold mt-1">{customer.loyaltyPoints}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Order History and Loyalty */}
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Order History</TabsTrigger>
              <TabsTrigger value="loyalty">Loyalty Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-4">
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No orders yet</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(order.total)}</p>
                        <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="loyalty" className="mt-4">
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : loyaltyTransactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No loyalty activity yet</p>
              ) : (
                <div className="space-y-2">
                  {loyaltyTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium capitalize">{tx.transaction_type.replace("_", " ")}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className={`font-semibold ${tx.points_amount > 0 ? "text-green-600" : "text-red-600"}`}>
                        {tx.points_amount > 0 ? "+" : ""}{tx.points_amount} pts
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

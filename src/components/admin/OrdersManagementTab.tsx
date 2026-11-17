import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, UtensilsCrossed, ShoppingBag, Bike, Clock, AlertTriangle, Timer } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/hooks/use-currency";

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  total: number;
  created_at: string;
  customer_name: string | null;
  order_type: string | null;
  business_profiles: {
    business_name: string;
  } | null;
}

// Helper function to calculate elapsed time
const getElapsedTime = (createdAt: string) => {
  const now = new Date();
  const orderDate = new Date(createdAt);
  const diffMs = now.getTime() - orderDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
  if (diffMins > 0) return `${diffMins}m`;
  return "Just now";
};

// Get urgency color based on time elapsed and status
const getTimeUrgency = (createdAt: string, status: string) => {
  if (status === "completed" || status === "cancelled") return "";
  
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins > 30) return "text-destructive font-semibold";
  if (diffMins > 15) return "text-amber-600 font-medium";
  return "text-muted-foreground";
};

export const OrdersManagementTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch business names for each order
      if (data) {
        const ordersWithBusiness = await Promise.all(
          data.map(async (order) => {
            const { data: business } = await supabase
              .from("business_profiles")
              .select("business_name")
              .eq("user_id", order.user_id)
              .single();
            
            return {
              ...order,
              business_profiles: business
            };
          })
        );
        setOrders(ordersWithBusiness as Order[]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.business_profiles?.business_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesType = orderTypeFilter === "all" || order.order_type === orderTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Order type stats
  const orderTypeStats = {
    dineIn: orders.filter(o => o.order_type === "dine-in").length,
    takeout: orders.filter(o => o.order_type === "takeout").length,
    delivery: orders.filter(o => o.order_type === "delivery").length,
  };

  // Time-based stats
  const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "processing");
  const overdueOrders = pendingOrders.filter(o => {
    const diffMs = Date.now() - new Date(o.created_at).getTime();
    return diffMs > 30 * 60 * 1000; // > 30 minutes
  });
  
  const avgProcessingTime = () => {
    const completedOrders = orders.filter(o => o.status === "completed");
    if (completedOrders.length === 0) return "N/A";
    
    // For demo purposes, using created_at as proxy
    // In production, you'd track completed_at timestamp
    const totalMins = completedOrders.reduce((acc, order) => {
      const diffMs = Date.now() - new Date(order.created_at).getTime();
      return acc + Math.floor(diffMs / 60000);
    }, 0);
    const avg = Math.floor(totalMins / completedOrders.length);
    if (avg > 60) return `${Math.floor(avg / 60)}h ${avg % 60}m`;
    return `${avg}m`;
  };

  const getOrderTypeColor = (type: string | null) => {
    const colors: Record<string, string> = {
      "dine-in": "bg-blue-500/10 text-blue-600 border-blue-500/30",
      "takeout": "bg-orange-500/10 text-orange-600 border-orange-500/30",
      "delivery": "bg-green-500/10 text-green-600 border-green-500/30",
    };
    return colors[type || ""] || "bg-muted text-muted-foreground";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-500",
      completed: "bg-success/10 text-success",
      cancelled: "bg-destructive/10 text-destructive",
      processing: "bg-blue-500/10 text-blue-500",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Orders Management</h2>
          <p className="text-muted-foreground">Track and manage all platform orders</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {orders.length} Total Orders
        </Badge>
      </div>

      {/* Order Type Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <UtensilsCrossed className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{orderTypeStats.dineIn}</p>
              <p className="text-sm text-muted-foreground">Dine In</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{orderTypeStats.takeout}</p>
              <p className="text-sm text-muted-foreground">Takeout</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Bike className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{orderTypeStats.delivery}</p>
              <p className="text-sm text-muted-foreground">Delivery</p>
            </div>
          </div>
        </Card>
        
        {/* Time Tracking Stats */}
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingOrders.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-destructive">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueOrders.length}</p>
              <p className="text-sm text-muted-foreground">Overdue (&gt;30m)</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-secondary">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Timer className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgProcessingTime()}</p>
              <p className="text-sm text-muted-foreground">Avg Time</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[200px] p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number, customer, or business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>
        <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Order Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="dine-in">Dine In</SelectItem>
            <SelectItem value="takeout">Takeout</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Elapsed</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No orders found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={order.business_profiles?.business_name || 'N/A'}>{order.business_profiles?.business_name || 'N/A'}</TableCell>
                  <TableCell className="max-w-[120px] truncate" title={order.customer_name || 'Walk-in'}>{order.customer_name || 'Walk-in'}</TableCell>
                  <TableCell>
                    {order.order_type ? (
                      <Badge variant="outline" className={getOrderTypeColor(order.order_type)}>
                        {order.order_type.replace("-", " ")}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 text-sm ${getTimeUrgency(order.created_at, order.status)}`}>
                      <Clock className="w-3 h-3" />
                      {getElapsedTime(order.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(Number(order.total), "GHS")}
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
          </div>
        </div>
      </Card>
    </div>
  );
};

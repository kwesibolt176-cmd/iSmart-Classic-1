import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Truck, Package, Search, RefreshCw, Eye, MapPin, Clock,
  CheckCircle2, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";
import { DeliveryTracking } from "./DeliveryTracking";

interface DeliveryOrder {
  id: string;
  order_id: string | null;
  status: string;
  pickup_address: string;
  delivery_address: string;
  delivery_contact: string;
  delivery_phone: string;
  delivery_fee: number;
  estimated_delivery_time: string | null;
  created_at: string;
  delivery_partners?: { name: string } | null;
  orders?: { order_number: string } | null;
}

export const MerchantDeliveriesView = () => {
  const { formatCurrency } = useCurrency();
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("merchant-deliveries")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_orders",
        },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDeliveries = async () => {
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error: any) {
      console.error("Error fetching deliveries:", error);
      toast({
        title: "Error",
        description: "Failed to load deliveries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.delivery_contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalDeliveries = deliveries.length;
  const pendingDeliveries = deliveries.filter(d => d.status === "pending").length;
  const inTransitDeliveries = deliveries.filter(d => ["picked_up", "in_transit"].includes(d.status)).length;
  const completedDeliveries = deliveries.filter(d => d.status === "delivered").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Truck className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold">{inTransitDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{completedDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              My Deliveries
            </CardTitle>
            <div className="flex gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search deliveries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchDeliveries}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span className="text-muted-foreground">Loading deliveries...</span>
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No deliveries found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {delivery.orders?.order_number || delivery.id.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>{delivery.delivery_partners?.name || "N/A"}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{delivery.delivery_contact}</p>
                        <p className="text-xs text-muted-foreground">{delivery.delivery_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">{delivery.delivery_address}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(delivery.delivery_fee)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(delivery.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(delivery.status)}
                          {delivery.status.replace("_", " ")}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(delivery.created_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDelivery(delivery.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delivery Details Dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
          </DialogHeader>
          {selectedDelivery && <DeliveryTracking deliveryOrderId={selectedDelivery} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Truck, Package, MapPin, Clock, CheckCircle2, 
  AlertCircle, RefreshCw, Search, Phone, User,
  Calendar, Eye, Filter, ArrowUpDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { format, formatDistanceToNow } from "date-fns";
import { DeliveryTracking } from "@/components/delivery/DeliveryTracking";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";

interface DeliveryOrder {
  id: string;
  order_id: string | null;
  status: string;
  delivery_contact: string;
  delivery_address: string;
  delivery_phone: string;
  delivery_fee: number;
  delivery_notes: string | null;
  estimated_delivery_time: string | null;
  actual_delivery_time: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  tracking_url: string | null;
  created_at: string;
  updated_at: string;
  pickup_address: string;
  delivery_partners?: { name: string } | null;
  orders?: { 
    order_number: string; 
    customer_name: string | null;
    total: number;
    items?: Array<{ name: string; quantity: number }>;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-gray-500/10 text-gray-500", icon: Package },
  picked_up: { label: "Picked Up", color: "bg-amber-500/10 text-amber-500", icon: Package },
  in_transit: { label: "In Transit", color: "bg-blue-500/10 text-blue-500", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-500", icon: AlertCircle },
};

export const Deliveries = () => {
  const { user } = useBusiness();
  
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    if (user) {
      fetchDeliveries();
      
      // Set up realtime subscription
      const channel = supabase
        .channel("deliveries-page")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "delivery_orders",
          },
          (payload) => {
            console.log("Delivery update:", payload);
            fetchDeliveries();
            
            if (payload.eventType === "UPDATE" && payload.new) {
              const newRecord = payload.new as any;
              const oldRecord = payload.old as any;
              
              if (newRecord.status !== oldRecord?.status) {
                const statusConfig = STATUS_CONFIG[newRecord.status];
                toast.info(`Delivery ${statusConfig?.label || newRecord.status}`, {
                  description: `Order updated to ${newRecord.status}`,
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchDeliveries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("delivery_orders")
        .select(`
          *,
          delivery_partners (name),
          orders (order_number, customer_name, total)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  };

  const activeDeliveries = deliveries.filter(d => 
    ["pending", "picked_up", "in_transit"].includes(d.status)
  );
  
  const completedDeliveries = deliveries.filter(d => 
    ["delivered", "cancelled"].includes(d.status)
  );

  const filteredDeliveries = (activeTab === "active" ? activeDeliveries : completedDeliveries)
    .filter(d => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          d.delivery_contact.toLowerCase().includes(search) ||
          d.delivery_address.toLowerCase().includes(search) ||
          d.orders?.order_number?.toLowerCase().includes(search) ||
          d.id.toLowerCase().includes(search)
        );
      }
      return true;
    });

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === "pending").length,
    inTransit: deliveries.filter(d => ["picked_up", "in_transit"].includes(d.status)).length,
    delivered: deliveries.filter(d => d.status === "delivered").length,
  };

  const getStatusIcon = (status: string) => {
    const Icon = STATUS_CONFIG[status]?.icon || Package;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Deliveries"
        description="Track and manage all your delivery orders"
        rightContent={
          <Button onClick={fetchDeliveries} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:border-amber-500/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:border-blue-500/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Truck className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Transit</p>
                  <p className="text-2xl font-bold text-foreground">{stats.inTransit}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:border-green-500/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivered</p>
                  <p className="text-2xl font-bold text-foreground">{stats.delivered}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList className="bg-card/50 border border-border/50">
              <TabsTrigger value="active" className="gap-2">
                <Truck className="w-4 h-4" />
                Active ({activeDeliveries.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed ({completedDeliveries.length})
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search deliveries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-card/50">
                  <Filter className="w-4 h-4 mr-2" />
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
            </div>
          </div>

          <TabsContent value="active" className="mt-0">
            <DeliveryList 
              deliveries={filteredDeliveries}
              loading={loading}
              onViewDetails={setSelectedDelivery}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            <DeliveryList 
              deliveries={filteredDeliveries}
              loading={loading}
              onViewDetails={setSelectedDelivery}
            />
          </TabsContent>
        </Tabs>

        {/* Delivery Details Dialog */}
        <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Delivery Tracking
              </DialogTitle>
            </DialogHeader>
            {selectedDelivery && <DeliveryTracking deliveryOrderId={selectedDelivery} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

interface DeliveryListProps {
  deliveries: DeliveryOrder[];
  loading: boolean;
  onViewDetails: (id: string) => void;
}

const DeliveryList = ({ deliveries, loading, onViewDetails }: DeliveryListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Truck className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">No deliveries found</p>
          <p className="text-sm text-muted-foreground/70 text-center mt-1">
            Deliveries will appear here when orders are placed with delivery
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {deliveries.map((delivery, index) => (
        <Card 
          key={delivery.id}
          className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all cursor-pointer animate-in fade-in-0 zoom-in-95"
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
          onClick={() => onViewDetails(delivery.id)}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono font-bold text-base">
                  {delivery.orders?.order_number || delivery.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })}
                </p>
              </div>
              <Badge className={`${STATUS_CONFIG[delivery.status]?.color} gap-1`}>
                {STATUS_CONFIG[delivery.status]?.label || delivery.status}
              </Badge>
            </div>

            {/* Customer Info */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{delivery.delivery_contact}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{delivery.delivery_phone}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="line-clamp-2">{delivery.delivery_address}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                {delivery.delivery_partners?.name && (
                  <Badge variant="outline" className="text-xs">
                    {delivery.delivery_partners.name}
                  </Badge>
                )}
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Eye className="w-4 h-4" />
              </Button>
            </div>

            {/* ETA if available */}
            {delivery.estimated_delivery_time && delivery.status !== "delivered" && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    ETA: {format(new Date(delivery.estimated_delivery_time), "h:mm a")}
                  </span>
                </div>
              </div>
            )}

            {/* Driver info if available */}
            {delivery.driver_name && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="w-3 h-3" />
                <span>Driver: {delivery.driver_name}</span>
                {delivery.driver_phone && (
                  <a 
                    href={`tel:${delivery.driver_phone}`} 
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Call
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Deliveries;
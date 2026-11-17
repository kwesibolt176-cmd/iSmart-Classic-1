import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Truck, Plus, Pencil, Trash2, Eye, RefreshCw, 
  CheckCircle2, XCircle, Clock, Package, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface DeliveryPartner {
  id: string;
  name: string;
  slug: string;
  api_endpoint: string | null;
  is_active: boolean;
  logo_url: string | null;
  description: string | null;
  supported_regions: string[] | null;
  min_order_amount: number;
  created_at: string;
  updated_at: string;
}

interface DeliveryOrder {
  id: string;
  order_id: string | null;
  user_id: string;
  delivery_partner_id: string | null;
  external_delivery_id: string | null;
  status: string;
  delivery_address: string;
  delivery_contact: string;
  delivery_phone: string;
  delivery_fee: number;
  estimated_delivery_time: string | null;
  created_at: string;
  delivery_partners?: { name: string } | null;
}

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  delivery_partners?: { name: string } | null;
}

export const DeliveryPartnersTab = () => {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    api_endpoint: "",
    api_key: "",
    description: "",
    min_order_amount: "0",
    supported_regions: "",
    is_active: true,
    logo_url: "",
  });

  useEffect(() => {
    fetchPartners();
    fetchDeliveryOrders();
    fetchActivityLogs();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to load delivery partners");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select(`
          *,
          delivery_partners (name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setDeliveryOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching delivery orders:", error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_activity_logs")
        .select(`
          *,
          delivery_partners (name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching activity logs:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }

    try {
      const partnerData = {
        name: formData.name,
        slug: formData.slug.toLowerCase().replace(/\s+/g, "-"),
        api_endpoint: formData.api_endpoint || null,
        api_key_encrypted: formData.api_key ? btoa(formData.api_key) : null,
        description: formData.description || null,
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        supported_regions: formData.supported_regions ? formData.supported_regions.split(",").map(r => r.trim()) : null,
        is_active: formData.is_active,
        logo_url: formData.logo_url || null,
      };

      if (editingPartner) {
        const { error } = await supabase
          .from("delivery_partners")
          .update(partnerData)
          .eq("id", editingPartner.id);

        if (error) throw error;
        toast.success("Delivery partner updated");
      } else {
        const { error } = await supabase
          .from("delivery_partners")
          .insert(partnerData);

        if (error) throw error;
        toast.success("Delivery partner added");
      }

      setDialogOpen(false);
      resetForm();
      fetchPartners();
    } catch (error: any) {
      console.error("Error saving partner:", error);
      toast.error(error.message || "Failed to save delivery partner");
    }
  };

  const handleEdit = (partner: DeliveryPartner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      slug: partner.slug,
      api_endpoint: partner.api_endpoint || "",
      api_key: "",
      description: partner.description || "",
      min_order_amount: partner.min_order_amount.toString(),
      supported_regions: partner.supported_regions?.join(", ") || "",
      is_active: partner.is_active,
      logo_url: partner.logo_url || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (partnerId: string) => {
    try {
      const { error } = await supabase
        .from("delivery_partners")
        .delete()
        .eq("id", partnerId);

      if (error) throw error;
      toast.success("Delivery partner removed");
      fetchPartners();
    } catch (error: any) {
      toast.error("Failed to delete partner");
    }
  };

  const togglePartnerStatus = async (partner: DeliveryPartner) => {
    try {
      const { error } = await supabase
        .from("delivery_partners")
        .update({ is_active: !partner.is_active })
        .eq("id", partner.id);

      if (error) throw error;
      toast.success(`Partner ${!partner.is_active ? "enabled" : "disabled"}`);
      fetchPartners();
    } catch (error: any) {
      toast.error("Failed to update partner status");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      api_endpoint: "",
      api_key: "",
      description: "",
      min_order_amount: "0",
      supported_regions: "",
      is_active: true,
      logo_url: "",
    });
    setEditingPartner(null);
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

  // Stats
  const totalDeliveries = deliveryOrders.length;
  const completedDeliveries = deliveryOrders.filter(d => d.status === "delivered").length;
  const pendingDeliveries = deliveryOrders.filter(d => ["pending", "in_transit", "picked_up"].includes(d.status)).length;
  const activePartners = partners.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Partners</p>
                <p className="text-2xl font-bold">{activePartners}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">{totalDeliveries}</p>
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
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedDeliveries}</p>
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
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{pendingDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners">Delivery Partners</TabsTrigger>
          <TabsTrigger value="orders">All Deliveries</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        {/* Partners Tab */}
        <TabsContent value="partners">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Delivery Partners
              </CardTitle>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Partner
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPartner ? "Edit Delivery Partner" : "Add Delivery Partner"}
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh]">
                    <div className="space-y-4 p-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Partner Name *</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., DHL Express"
                          />
                        </div>
                        <div>
                          <Label>Slug *</Label>
                          <Input
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            placeholder="e.g., dhl-express"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Partner description..."
                          rows={2}
                        />
                      </div>

                      <Separator />

                      <div>
                        <Label>API Endpoint</Label>
                        <Input
                          value={formData.api_endpoint}
                          onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                          placeholder="https://api.partner.com/v1"
                        />
                      </div>

                      <div>
                        <Label>API Key {editingPartner && "(leave blank to keep existing)"}</Label>
                        <Input
                          type="password"
                          value={formData.api_key}
                          onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                          placeholder="Enter API key"
                        />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Min Order Amount</Label>
                          <Input
                            type="number"
                            value={formData.min_order_amount}
                            onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Logo URL</Label>
                          <Input
                            value={formData.logo_url}
                            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Supported Regions (comma-separated)</Label>
                        <Input
                          value={formData.supported_regions}
                          onChange={(e) => setFormData({ ...formData, supported_regions: e.target.value })}
                          placeholder="e.g., Accra, Kumasi, Tema"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>

                      <Button onClick={handleSubmit} className="w-full">
                        {editingPartner ? "Update Partner" : "Add Partner"}
                      </Button>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              ) : partners.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No delivery partners configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="p-4 rounded-lg border bg-card flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        {partner.logo_url ? (
                          <img
                            src={partner.logo_url}
                            alt={partner.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Truck className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{partner.name}</h4>
                            <Badge variant={partner.is_active ? "default" : "secondary"}>
                              {partner.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {partner.slug} • Min order: ${partner.min_order_amount}
                          </p>
                          {partner.supported_regions && partner.supported_regions.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {partner.supported_regions.slice(0, 3).map((region) => (
                                <Badge key={region} variant="outline" className="text-xs">
                                  {region}
                                </Badge>
                              ))}
                              {partner.supported_regions.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{partner.supported_regions.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={partner.is_active}
                          onCheckedChange={() => togglePartnerStatus(partner)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(partner)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Partner?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {partner.name} from the platform.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(partner.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Deliveries Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                All Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No deliveries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveryOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>{order.delivery_partners?.name || "N/A"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {order.delivery_address}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{order.delivery_contact}</p>
                            <p className="text-muted-foreground text-xs">{order.delivery_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>${order.delivery_fee.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "MMM d, h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity logs yet
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.action}</Badge>
                          {log.delivery_partners?.name && (
                            <span className="text-sm">{log.delivery_partners.name}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      {log.details && (
                        <pre className="text-xs mt-2 text-muted-foreground overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

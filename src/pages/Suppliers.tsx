import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Building2, Package, Phone, Mail, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NewSupplierDialog from "@/components/NewSupplierDialog";
import NewSupplierOrderDialog from "@/components/NewSupplierOrderDialog";
import { useCurrency } from "@/hooks/use-currency";
import { PageHeader } from "@/components/ui/PageHeader";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: string | null;
  is_active: boolean;
}

interface SupplierOrder {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery: string | null;
  total_amount: number;
  status: string;
  supplier?: { name: string };
}

const Suppliers = () => {
  const { user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSuppliers();
      fetchOrders();
    }
  }, [user?.id]);

  const fetchSuppliers = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (!error && data) {
      setSuppliers(data);
    }
    setDataLoading(false);
  };

  const fetchOrders = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('supplier_orders')
      .select('*, supplier:supplier_id(name)')
      .eq('user_id', user.id)
      .order('order_date', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
  };

  const toggleSupplierStatus = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (!error) {
      toast({ title: `Supplier ${isActive ? 'deactivated' : 'activated'}` });
      fetchSuppliers();
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'ordered': return 'bg-blue-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-blue-600';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Suppliers & Vendors"
        description="Manage your suppliers and purchase orders"
        rightContent={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(true)} className="gap-2">
              <Package className="h-4 w-4" />
              New Order
            </Button>
            <Button onClick={() => setIsSupplierDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Suppliers</p>
                  <p className="text-2xl font-bold text-foreground">{suppliers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-blue-500/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Package className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Orders</p>
                  <p className="text-2xl font-bold text-foreground">
                    {orders.filter(o => o.status === 'pending' || o.status === 'ordered').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-blue-500/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Package className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spent (Month)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(orders.filter(o => o.status === 'delivered').reduce((a, b) => a + Number(b.total_amount), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="suppliers">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-4 mt-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {dataLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading suppliers...</div>
            ) : filteredSuppliers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No suppliers found. Add your first supplier to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredSuppliers.map((supplier) => (
                  <Card key={supplier.id}>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        {supplier.contact_name && (
                          <p className="text-sm text-muted-foreground">{supplier.contact_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={supplier.is_active ? "default" : "secondary"}>
                          {supplier.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleSupplierStatus(supplier.id, supplier.is_active)}>
                              {supplier.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {supplier.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.email}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.payment_terms && (
                        <p className="text-sm text-muted-foreground">
                          Terms: {supplier.payment_terms}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-3 sm:space-y-4 mt-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center text-sm sm:text-base text-muted-foreground">
                  No purchase orders yet. Create your first order.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status}</Badge>
                        <div>
                          <p className="font-medium text-sm sm:text-base">{order.order_number}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{order.supplier?.name}</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex sm:block justify-between items-center">
                        <p className="font-bold text-sm sm:text-base">{formatCurrency(Number(order.total_amount))}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{order.order_date}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NewSupplierDialog
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        onSupplierAdded={fetchSuppliers}
      />
      <NewSupplierOrderDialog
        open={isOrderDialogOpen}
        onOpenChange={setIsOrderDialogOpen}
        suppliers={suppliers}
        onOrderAdded={fetchOrders}
      />
    </div>
  );
};

export default Suppliers;

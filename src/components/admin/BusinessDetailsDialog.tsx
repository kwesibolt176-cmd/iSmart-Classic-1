import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, getCurrencySymbol } from "@/hooks/use-currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  ShoppingCart,
  Package,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Store,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  industry: string;
  plan_tier: string;
  created_at: string;
  business_email: string | null;
  business_phone: string | null;
  address: string | null;
  is_suspended: boolean | null;
  logo_url: string | null;
  currency: string;
}

interface BusinessDetailsDialogProps {
  business: BusinessProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BusinessStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  totalStaff: number;
  totalTransactions: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  role_name: string | null;
  is_active: boolean;
}

export const BusinessDetailsDialog = ({
  business,
  open,
  onOpenChange,
}: BusinessDetailsDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BusinessStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalStaff: 0,
    totalTransactions: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    if (business && open) {
      fetchBusinessData();
    }
  }, [business, open]);

  const fetchBusinessData = async () => {
    if (!business) return;
    
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        ordersRes,
        customersRes,
        productsRes,
        staffRes,
        transactionsRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, total, created_at")
          .eq("user_id", business.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("customers")
          .select("id, name, email, phone, created_at")
          .eq("user_id", business.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("inventory_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", business.user_id),
        supabase
          .from("staff")
          .select("id, name, email, is_active, staff_roles(name)")
          .eq("user_id", business.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("transactions")
          .select("id, amount")
          .eq("user_id", business.user_id),
      ]);

      // Calculate stats
      const totalRevenue = transactionsRes.data?.reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      ) || 0;

      setStats({
        totalOrders: ordersRes.data?.length || 0,
        totalRevenue,
        totalCustomers: customersRes.data?.length || 0,
        totalProducts: productsRes.count || 0,
        totalStaff: staffRes.data?.length || 0,
        totalTransactions: transactionsRes.data?.length || 0,
      });

      setRecentOrders(ordersRes.data || []);
      setCustomers(customersRes.data || []);
      setStaff(
        staffRes.data?.map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          role_name: s.staff_roles?.name || "No Role",
          is_active: s.is_active,
        })) || []
      );
    } catch (error) {
      console.error("Error fetching business data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!business) return null;

  const currencyCode = business.currency || "GHS";
  const currencySymbol = getCurrencySymbol(currencyCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={business.logo_url || undefined} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {business.business_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {business.business_name}
                {business.is_suspended && (
                  <Badge variant="destructive">Suspended</Badge>
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4 mt-1">
                <Badge variant="outline">{business.industry}</Badge>
                <Badge>{business.plan_tier || "free"}</Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-180px)]">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Orders
                        </CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Revenue
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(stats.totalRevenue, currencyCode)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Customers
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Products
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalProducts}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Staff Members
                        </CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStaff}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Transactions
                        </CardTitle>
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Business Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <span className="ml-2 font-medium">
                          {format(new Date(business.created_at), "PPP")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">User ID:</span>
                        <span className="ml-2 font-mono text-xs">
                          {business.user_id.slice(0, 8)}...
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Currency:</span>
                        <span className="ml-2 font-medium">{currencySymbol} ({currencyCode})</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <Badge
                          variant={business.is_suspended ? "destructive" : "default"}
                          className="ml-2"
                        >
                          {business.is_suspended ? "Suspended" : "Active"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="orders" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentOrders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No orders found
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.order_number}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{order.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(order.total || 0, currencyCode)}
                            </TableCell>
                            <TableCell>
                              {format(new Date(order.created_at), "PP")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  {customers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No customers found
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">
                              {customer.name}
                            </TableCell>
                            <TableCell>{customer.email || "N/A"}</TableCell>
                            <TableCell>{customer.phone || "N/A"}</TableCell>
                            <TableCell>
                              {format(new Date(customer.created_at), "PP")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="staff" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Staff Members</CardTitle>
                </CardHeader>
                <CardContent>
                  {staff.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No staff members found
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staff.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              {member.name}
                            </TableCell>
                            <TableCell>{member.email || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{member.role_name}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={member.is_active ? "default" : "secondary"}
                              >
                                {member.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">
                        {business.business_email || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">
                        {business.business_phone || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">
                        {business.address || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="font-medium">
                        {format(new Date(business.created_at), "PPPP")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

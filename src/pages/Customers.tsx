import { useState, useEffect } from "react";
import { Search, UserPlus, Gift, Mail, BarChart3, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerCard } from "@/components/CustomerCard";
import { NewCustomerDialog } from "@/components/NewCustomerDialog";
import { CustomerDetailsDialog } from "@/components/CustomerDetailsDialog";
import { CustomerAnalytics } from "@/components/CustomerAnalytics";
import { CustomerImportExport } from "@/components/CustomerImportExport";

import { ReferralProgramManager } from "@/components/ReferralProgramManager";
import { CustomerDuplicateDetector } from "@/components/CustomerDuplicateDetector";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { PageHeader } from "@/components/ui/PageHeader";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  lastVisit: string;
  avatar?: string;
}

interface CustomersProps {
  onNavigate?: (section: string) => void;
}

export const Customers = ({ onNavigate }: CustomersProps) => {
  const { user } = useBusiness();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user?.id]);

  const fetchCustomers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (customersError) throw customersError;

      // Fetch orders and loyalty points for each customer
      const customersWithStats = await Promise.all(
        (customersData || []).map(async (c) => {
          // Get orders for this customer - match by customer_id OR phone number
          // Orders table has: customer_id, customer_phone (no customer_email column)
          const filters: string[] = [];
          if (c.id) filters.push(`customer_id.eq.${c.id}`);
          if (c.phone) filters.push(`customer_phone.eq.${c.phone}`);
          
          let orders: { total: number; created_at: string }[] = [];
          
          if (filters.length > 0) {
            const { data: ordersData } = await supabase
              .from("orders")
              .select("total, created_at")
              .eq("user_id", user.id)
              .or(filters.join(','))
              .order("created_at", { ascending: false });
            
            orders = ordersData || [];
          }

          // Get loyalty points
          const { data: loyaltyData } = await supabase
            .from("customer_loyalty_points")
            .select("points_balance")
            .eq("customer_id", c.id)
            .single();

          const totalOrders = orders.length;
          const totalSpent = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
          const lastVisit = orders[0]?.created_at 
            ? new Date(orders[0].created_at).toLocaleDateString()
            : new Date(c.created_at).toLocaleDateString();

          return {
            id: c.id,
            name: c.name,
            email: c.email || "",
            phone: c.phone || "",
            totalOrders,
            totalSpent,
            loyaltyPoints: loyaltyData?.points_balance || 0,
            lastVisit,
          };
        })
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerAdded = () => {
    fetchCustomers();
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  const totalCustomers = customers.length;
  const loyaltyMembers = customers.filter(c => c.loyaltyPoints > 100).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Customers"
        description="Manage your customer relationships, loyalty programs, and engagement analytics."
        rightContent={<Users className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10 shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-foreground">Customer Directory</h3>
            <p className="text-sm text-muted-foreground">{totalCustomers} total customers • {loyaltyMembers} loyalty members</p>
          </div>
          <div className="flex gap-2">
            <CustomerImportExport customers={customers} onImportComplete={fetchCustomers} />
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/20">
              <UserPlus className="w-4 h-4" />
              Add New Customer
            </Button>
          </div>
        </div>

        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="duplicates" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Duplicates
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2">
              <Users className="w-4 h-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Button 
                variant="outline" 
                className="gap-2 whitespace-nowrap text-sm"
                onClick={() => onNavigate?.("loyalty")}
              >
                <Gift className="w-4 h-4" />
                <span className="hidden sm:inline">Loyalty Program</span>
                <span className="sm:hidden">Loyalty</span>
              </Button>
              <Button 
                variant="outline" 
                className="gap-2 whitespace-nowrap text-sm"
                onClick={() => onNavigate?.("campaigns")}
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Send Email</span>
                <span className="sm:hidden">Email</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
              {filteredCustomers.map((customer) => (
                <CustomerCard 
                  key={customer.id} 
                  customer={customer} 
                  onClick={() => handleCustomerClick(customer)}
                />
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No customers found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="duplicates">
            <CustomerDuplicateDetector onMergeComplete={fetchCustomers} />
          </TabsContent>

          <TabsContent value="referrals">
            <ReferralProgramManager />
          </TabsContent>

          <TabsContent value="analytics">
            <CustomerAnalytics customers={customers} />
          </TabsContent>
        </Tabs>

        <NewCustomerDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onCustomerAdded={handleCustomerAdded}
        />

        <CustomerDetailsDialog
          customer={selectedCustomer}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </div>
    </div>
  );
};

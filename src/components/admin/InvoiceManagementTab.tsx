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
import { Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency as formatCurrencyUtil } from "@/hooks/use-currency";

// Super admin uses GHS as platform default currency
const formatPlatformCurrency = (amount: number) => formatCurrencyUtil(amount, "GHS");

interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  customer_name: string;
  customer_email: string | null;
  status: string;
  total: number;
  paid_amount: number | null;
  due_date: string;
  created_at: string;
  business_profiles: {
    business_name: string;
  } | null;
}

export const InvoiceManagementTab = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch business names for each invoice
      if (data) {
        const invoicesWithBusiness = await Promise.all(
          data.map(async (invoice) => {
            const { data: business } = await supabase
              .from("business_profiles")
              .select("business_name")
              .eq("user_id", invoice.user_id)
              .single();
            
            return {
              ...invoice,
              business_profiles: business
            };
          })
        );
        setInvoices(invoicesWithBusiness as Invoice[]);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.business_profiles?.business_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-blue-500/10 text-blue-500",
      paid: "bg-success/10 text-success",
      overdue: "bg-destructive/10 text-destructive",
      partially_paid: "bg-amber-500/10 text-amber-500",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const calculateStats = () => {
    const total = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const paid = invoices.filter(inv => inv.status === 'paid').length;
    const overdue = invoices.filter(inv => inv.status === 'overdue').length;
    
    return { total, paid, overdue };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoice Management</h2>
          <p className="text-muted-foreground">Track and manage all platform invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Revenue</div>
          <div className="text-2xl font-bold">{formatPlatformCurrency(stats.total)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Paid Invoices</div>
          <div className="text-2xl font-bold text-success">{stats.paid}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Overdue</div>
          <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
        </Card>
      </div>

      <div className="flex gap-4">
        <Card className="flex-1 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number, customer, or business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No invoices found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.business_profiles?.business_name || 'N/A'}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{invoice.customer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatPlatformCurrency(Number(invoice.total))}
                  </TableCell>
                  <TableCell>
                    {invoice.paid_amount ? (
                      <span className="text-success">
                        {formatPlatformCurrency(Number(invoice.paid_amount))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

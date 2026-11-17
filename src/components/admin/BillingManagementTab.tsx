import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/hooks/use-currency";
import { format } from "date-fns";

interface PaymentTransaction {
  id: string;
  user_id: string;
  business_id: string | null;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  payment_reference: string;
  paid_at: string | null;
  created_at: string;
  metadata: any;
  business_profiles?: {
    business_name: string;
  } | null;
}

interface BillingStats {
  totalRevenue: number;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
}

export const BillingManagementTab = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    successfulPayments: 0,
    failedPayments: 0,
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch business profiles for transactions
      if (data) {
        const businessIds = [...new Set(data.map(t => t.business_id).filter(Boolean))];
        
        let businessMap = new Map();
        if (businessIds.length > 0) {
          const { data: businesses } = await supabase
            .from("business_profiles")
            .select("id, business_name")
            .in("id", businessIds);
          
          if (businesses) {
            businessMap = new Map(businesses.map(b => [b.id, b]));
          }
        }

        const transactionsWithBusiness = data.map(t => ({
          ...t,
          business_profiles: t.business_id ? businessMap.get(t.business_id) : null,
        }));

        setTransactions(transactionsWithBusiness);

        // Calculate stats
        const successful = data.filter(t => t.status === "success");
        setStats({
          totalRevenue: successful.reduce((sum, t) => sum + Number(t.amount), 0),
          totalTransactions: data.length,
          successfulPayments: successful.length,
          failedPayments: data.filter(t => t.status === "failed").length,
        });
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) =>
    t.payment_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.business_profiles?.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.transaction_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-success/10 text-success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive/10 text-destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-500">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      subscription: "Subscription",
      credit_topup: "Credit Top-up",
      gift_card: "Gift Card",
      one_time: "One-time",
    };
    return labels[type] || type;
  };

  const exportTransactions = () => {
    const csv = [
      ["Reference", "Business", "Type", "Amount", "Currency", "Status", "Date"].join(","),
      ...filteredTransactions.map(t => [
        t.payment_reference,
        t.business_profiles?.business_name || "N/A",
        t.transaction_type,
        t.amount,
        t.currency,
        t.status,
        format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transactions exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Billing & Payments</h2>
          <p className="text-muted-foreground">Monitor all platform payment transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTransactions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportTransactions}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <span className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue, "GHS")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{stats.totalTransactions}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Successful Payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-2xl font-bold">{stats.successfulPayments}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed Payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <span className="text-2xl font-bold">{stats.failedPayments}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference, business, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Transactions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No transactions found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">
                    {t.payment_reference.slice(0, 20)}...
                  </TableCell>
                  <TableCell>
                    {t.business_profiles?.business_name || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getTransactionTypeLabel(t.transaction_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(t.amount, t.currency)}
                  </TableCell>
                  <TableCell>{getStatusBadge(t.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(t.created_at), "MMM dd, yyyy HH:mm")}
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

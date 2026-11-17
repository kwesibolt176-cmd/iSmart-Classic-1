import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Zap, Building2, Clock, CheckCircle2, XCircle, Search, Phone, Wifi, Lightbulb, Tv, Droplets } from "lucide-react";

interface UtilityPayment {
  id: string;
  business_id: string;
  provider_id: string | null;
  utility_type: string;
  reference: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  recipient_number: string;
  recipient_name: string | null;
  created_at: string;
  completed_at: string | null;
  failure_reason: string | null;
  business_profiles?: {
    business_name: string;
  };
  utility_providers?: {
    name: string;
  } | null;
}

const utilityTypeIcons: Record<string, React.ElementType> = {
  airtime: Phone,
  data: Wifi,
  electricity: Lightbulb,
  tv: Tv,
  water: Droplets,
  internet: Wifi,
  insurance: Zap,
  other: Zap,
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  processing: { label: "Processing", variant: "outline", icon: Clock },
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
};

export const UtilityPaymentsTab = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-utility-payments", statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("utility_payments")
        .select(`
          *,
          business_profiles!inner(business_name),
          utility_providers(name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pending" | "processing" | "completed" | "failed" | "cancelled" | "reversed");
      }
      if (typeFilter !== "all") {
        query = query.eq("utility_type", typeFilter as "airtime" | "data" | "electricity" | "water" | "tv" | "internet" | "insurance" | "other");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as UtilityPayment[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-utility-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utility_payments")
        .select("status, amount, fee, utility_type");

      if (error) throw error;

      const totals = (data || []).reduce(
        (acc, p) => {
          const amount = Number(p.amount);
          const fee = Number(p.fee);
          const total = amount + fee;
          acc.total += total;
          acc.fees += fee;
          acc.byStatus[p.status] = (acc.byStatus[p.status] || 0) + 1;
          acc.byType[p.utility_type] = (acc.byType[p.utility_type] || 0) + total;
          if (p.status === "completed") {
            acc.completed += total;
          }
          return acc;
        },
        { total: 0, fees: 0, completed: 0, byStatus: {} as Record<string, number>, byType: {} as Record<string, number> }
      );

      return totals;
    },
  });

  const filteredPayments = payments?.filter((p) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.reference.toLowerCase().includes(searchLower) ||
      p.business_profiles?.business_name.toLowerCase().includes(searchLower) ||
      p.utility_providers?.name?.toLowerCase().includes(searchLower) ||
      p.recipient_number.includes(search)
    );
  });

  const formatCurrency = (amount: number, currency = "GHS") => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats?.total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.completed || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats?.fees || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transaction Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Object.values(stats?.byStatus || {}).reduce((a: number, b) => a + (b as number), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                All Utility Payments
              </CardTitle>
              <CardDescription>Platform-wide bill payment transactions</CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[180px]"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="airtime">Airtime</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="tv">TV</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments?.map((payment) => {
                    const statusInfo = statusConfig[payment.status] || statusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    const TypeIcon = utilityTypeIcons[payment.utility_type] || Zap;
                    const totalAmount = Number(payment.amount) + Number(payment.fee);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">{payment.reference}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>{payment.business_profiles?.business_name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="capitalize">{payment.utility_type.replace("_", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell>{payment.utility_providers?.name || "—"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{payment.recipient_number}</p>
                            {payment.recipient_name && (
                              <p className="text-muted-foreground text-xs">{payment.recipient_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(totalAmount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(payment.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPayments?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

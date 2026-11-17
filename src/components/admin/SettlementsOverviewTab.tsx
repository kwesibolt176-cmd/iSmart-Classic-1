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
import { ArrowDownToLine, Building2, Clock, CheckCircle2, XCircle, Search } from "lucide-react";

interface Settlement {
  id: string;
  business_id: string;
  reference: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  status: string;
  settlement_type: string | null;
  destination_bank: string | null;
  destination_account: string | null;
  provider_reference: string | null;
  failure_reason: string | null;
  collections_count: number;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  completed_at: string | null;
  business_profiles?: {
    business_name: string;
  };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  processing: { label: "Processing", variant: "outline", icon: Clock },
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
};

export const SettlementsOverviewTab = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: settlements, isLoading } = useQuery({
    queryKey: ["admin-settlements", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("settlements")
        .select(`
          *,
          business_profiles!inner(business_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pending" | "processing" | "completed" | "failed" | "cancelled" | "reversed");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Settlement[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-settlements-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settlements")
        .select("status, amount, fee, net_amount");

      if (error) throw error;

      const totals = (data || []).reduce(
        (acc, s) => {
          acc.total += Number(s.amount);
          acc.fees += Number(s.fee);
          acc.net += Number(s.net_amount);
          acc.byStatus[s.status] = (acc.byStatus[s.status] || 0) + 1;
          if (s.status === "completed") {
            acc.completed += Number(s.net_amount);
          } else if (s.status === "pending" || s.status === "processing") {
            acc.pending += Number(s.net_amount);
          }
          return acc;
        },
        { total: 0, fees: 0, net: 0, completed: 0, pending: 0, byStatus: {} as Record<string, number> }
      );

      return totals;
    },
  });

  const filteredSettlements = settlements?.filter((s) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      s.reference.toLowerCase().includes(searchLower) ||
      s.business_profiles?.business_name.toLowerCase().includes(searchLower) ||
      s.destination_bank?.toLowerCase().includes(searchLower)
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats?.fees || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Settled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.completed || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats?.pending || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Count</CardTitle>
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
                <ArrowDownToLine className="w-5 h-5" />
                All Settlements
              </CardTitle>
              <CardDescription>Platform-wide settlement transactions</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
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
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettlements?.map((settlement) => {
                    const statusInfo = statusConfig[settlement.status] || statusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <TableRow key={settlement.id}>
                        <TableCell className="font-mono text-sm">{settlement.reference}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>{settlement.business_profiles?.business_name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{settlement.destination_bank || "—"}</p>
                            <p className="text-muted-foreground text-xs">{settlement.destination_account || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(settlement.amount), settlement.currency)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(Number(settlement.fee), settlement.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(Number(settlement.net_amount), settlement.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(settlement.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredSettlements?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No settlements found
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

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";
import { format } from "date-fns";
import { TransactionExport } from "@/components/TransactionExport";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettlementAccountSettings } from "@/components/SettlementAccountSettings";
import {
  ArrowDownToLine,
  Wallet,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { getBankLogo } from "@/utils/bankLogos";
import { MerchantSettlementPanel } from "@/components/merchant/MerchantIntegrationPanels";

interface Settlement {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  status: string;
  settlement_type: string;
  destination_account: string | null;
  destination_bank: string | null;
  collections_count: number;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  completed_at: string | null;
}

interface SettlementStats {
  totalSettled: number;
  pendingAmount: number;
  totalFees: number;
  settlementCount: number;
}

export default function Settlements() {
  const { profile } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState<SettlementStats>({
    totalSettled: 0,
    pendingAmount: 0,
    totalFees: 0,
    settlementCount: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      fetchSettlements();
    }
  }, [profile?.id]);

  const fetchSettlements = async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("settlements")
        .select("*")
        .eq("business_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const settlementsData = (data || []) as Settlement[];
      setSettlements(settlementsData);

      // Calculate stats
      const successfulSettlements = settlementsData.filter(s => s.status === "completed");
      const pendingSettlements = settlementsData.filter(s => s.status === "pending");

      setStats({
        totalSettled: successfulSettlements.reduce((sum, s) => sum + s.net_amount, 0),
        pendingAmount: pendingSettlements.reduce((sum, s) => sum + s.net_amount, 0),
        totalFees: settlementsData.reduce((sum, s) => sum + s.fee, 0),
        settlementCount: successfulSettlements.length,
      });
    } catch (error) {
      console.error("Error fetching settlements:", error);
      toast.error("Failed to load settlements");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-[hsl(217_91%_60%)]/10 text-[hsl(217_91%_60%)] border-[hsl(217_91%_60%)]/20"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "processing":
        return <Badge className="bg-[hsl(217_91%_60%)]/10 text-[hsl(217_91%_60%)] border-[hsl(217_91%_60%)]/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSettlements = settlements.filter((s) => {
    const matchesSearch = s.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.destination_bank?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Settlements"
        description={
          <div className="flex flex-col gap-2.5">
            <span className="text-muted-foreground">Monitor and track all payouts to your registered bank account or mobile money wallet.</span>
            {profile?.business_name && (
              <div className="inline-flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/10 border border-blue-200/50 dark:border-blue-800/50 w-fit shadow-sm max-w-full">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-blue-900 dark:text-blue-100 break-words">{profile.business_name}</span>
                  {profile.business_email && (
                    <>
                      <span className="text-blue-400 dark:text-blue-600 shrink-0">•</span>
                      <span className="text-blue-700 dark:text-blue-300 break-all">{profile.business_email}</span>
                    </>
                  )}
                  {profile.business_phone && (
                    <>
                      <span className="text-blue-400 dark:text-blue-600 shrink-0">•</span>
                      <span className="text-blue-700 dark:text-blue-300 whitespace-nowrap">{profile.business_phone}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        }
        rightContent={
          <TransactionExport
            data={settlements}
            filename="settlements"
            columns={[
              { key: 'reference', label: 'Reference' },
              { key: 'amount', label: 'Gross Amount', format: (v) => formatCurrency(v) },
              { key: 'fee', label: 'Fee', format: (v) => formatCurrency(v) },
              { key: 'net_amount', label: 'Net Amount', format: (v) => formatCurrency(v) },
              { key: 'destination_bank', label: 'Bank' },
              { key: 'destination_account', label: 'Account' },
              { key: 'status', label: 'Status' },
              { key: 'created_at', label: 'Date', format: (v) => format(new Date(v), 'yyyy-MM-dd HH:mm') },
            ]}
          />
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
        <MerchantSettlementPanel />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:border-blue-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-blue-600 font-bold uppercase tracking-wider text-[10px]">
                  Settled
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Settled</p>
              <p className="text-2xl font-bold text-blue-600 tabular-nums">{formatCurrency(stats.totalSettled)}</p>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">{stats.settlementCount} successful payouts</p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-yellow-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <span className="text-yellow-600 font-bold uppercase tracking-wider text-[10px]">
                  Pending
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Net Pending</p>
              <p className="text-2xl font-bold text-yellow-600 tabular-nums">{formatCurrency(stats.pendingAmount)}</p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-blue-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Wallet className="h-6 w-6 text-blue-500" />
                </div>
                <span className="text-blue-500 font-bold uppercase tracking-wider text-[10px]">
                  Transaction Costs
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Fees</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(stats.totalFees)}</p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-primary/20 transition-all shadow-sm bg-card border-l-4 border-l-primary group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <span className="text-primary font-bold uppercase tracking-wider text-[10px]">
                  Primary Account
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Settlement Provider</p>
              <div className="flex items-center gap-2 mb-1">
                {getBankLogo(profile?.settlement_provider) && (
                  <img 
                    src={getBankLogo(profile?.settlement_provider)!} 
                    alt={profile?.settlement_provider || "Bank"} 
                    className="w-5 h-5 rounded-sm object-contain bg-white/10" 
                  />
                )}
                <p className="text-lg font-bold text-foreground truncate">{profile?.settlement_provider || "No Provider Set"}</p>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{profile?.settlement_account || "Update in settings"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference or bank..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="success">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Settlements Table/Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Settlement History</CardTitle>
            <CardDescription>All your settlement transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSettlements.length === 0 ? (
              <div className="text-center py-12">
                <ArrowDownToLine className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-1">No settlements yet</h3>
                <p className="text-muted-foreground text-sm">
                  Settlements will appear here once you receive payments
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="space-y-3 sm:hidden">
                  {filteredSettlements.map((settlement) => (
                    <div key={settlement.id} className="p-3 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs truncate max-w-[150px]">{settlement.reference}</span>
                        {getStatusBadge(settlement.status)}
                      </div>
                      {settlement.period_start && settlement.period_end && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Period</span>
                          <span className="text-sm">
                            {format(new Date(settlement.period_start), "MMM d")} - {format(new Date(settlement.period_end), "MMM d")}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Gross</span>
                        <span className="text-sm font-medium">{formatCurrency(settlement.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Fee</span>
                        <span className="text-sm text-muted-foreground">-{formatCurrency(settlement.fee)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Net Amount</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(settlement.net_amount)}</span>
                      </div>
                      {settlement.destination_bank && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getBankLogo(settlement.destination_bank) ? (
                            <img 
                              src={getBankLogo(settlement.destination_bank)!} 
                              alt={settlement.destination_bank} 
                              className="w-4 h-4 rounded-sm object-contain bg-white/10" 
                            />
                          ) : (
                            <Building2 className="w-3 h-3" />
                          )}
                          <span>{settlement.destination_bank}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground text-right">
                        {format(new Date(settlement.created_at), "MMM d, HH:mm")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Collections</TableHead>
                        <TableHead>Gross Amount</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Net Amount</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSettlements.map((settlement) => (
                        <TableRow key={settlement.id}>
                          <TableCell className="font-mono text-sm">
                            {settlement.reference}
                          </TableCell>
                          <TableCell className="text-sm">
                            {settlement.period_start && settlement.period_end ? (
                              <span className="text-muted-foreground">
                                {format(new Date(settlement.period_start), "MMM d")} -{" "}
                                {format(new Date(settlement.period_end), "MMM d")}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{settlement.collections_count}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(settlement.amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            -{formatCurrency(settlement.fee)}
                          </TableCell>
                          <TableCell className="font-medium text-blue-600">
                            {formatCurrency(settlement.net_amount)}
                          </TableCell>
                          <TableCell>
                            {settlement.destination_bank ? (
                              <div className="flex items-center gap-2">
                                {getBankLogo(settlement.destination_bank) ? (
                                  <img 
                                    src={getBankLogo(settlement.destination_bank)!} 
                                    alt={settlement.destination_bank} 
                                    className="w-5 h-5 rounded-sm object-contain bg-white/10 shrink-0" 
                                  />
                                ) : (
                                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="text-sm truncate">{settlement.destination_bank}</span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(settlement.created_at), "MMM d, HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Settlement Account Configuration */}
        <SettlementAccountSettings />
      </div>
    </div>
  );
}

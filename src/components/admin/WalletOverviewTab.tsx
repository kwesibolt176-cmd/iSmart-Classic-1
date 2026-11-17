import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, Wallet, TrendingUp, TrendingDown, ArrowUpDown, RefreshCw } from "lucide-react";

interface BusinessWallet {
  id: string;
  business_id: string;
  available_balance: number;
  pending_balance: number;
  total_collected: number;
  total_disbursed: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  business_profiles: {
    business_name: string;
    business_email: string | null;
  } | null;
}

interface WalletStats {
  totalWallets: number;
  totalBalance: number;
  totalCollected: number;
  totalDisbursed: number;
}

export const WalletOverviewTab = () => {
  const [wallets, setWallets] = useState<BusinessWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("balance");
  const [stats, setStats] = useState<WalletStats>({
    totalWallets: 0,
    totalBalance: 0,
    totalCollected: 0,
    totalDisbursed: 0,
  });

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_wallets")
        .select(`
          *,
          business_profiles (
            business_name,
            business_email
          )
        `)
        .order("available_balance", { ascending: false });

      if (error) throw error;

      const walletsData = (data || []) as BusinessWallet[];
      setWallets(walletsData);

      // Calculate stats
      const totalBalance = walletsData.reduce((sum, w) => sum + w.available_balance + w.pending_balance, 0);
      const totalCollected = walletsData.reduce((sum, w) => sum + w.total_collected, 0);
      const totalDisbursed = walletsData.reduce((sum, w) => sum + w.total_disbursed, 0);

      setStats({
        totalWallets: walletsData.length,
        totalBalance,
        totalCollected,
        totalDisbursed,
      });
    } catch (error) {
      console.error("Error fetching wallets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const formatCurrency = (amount: number, currency: string = "GHS") => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const filteredWallets = wallets
    .filter((wallet) => {
      const matchesSearch =
        wallet.business_profiles?.business_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        wallet.business_profiles?.business_email
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && wallet.is_active) ||
        (statusFilter === "inactive" && !wallet.is_active);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "balance":
          return b.available_balance - a.available_balance;
        case "collected":
          return b.total_collected - a.total_collected;
        case "disbursed":
          return b.total_disbursed - a.total_disbursed;
        case "name":
          return (a.business_profiles?.business_name || "").localeCompare(
            b.business_profiles?.business_name || ""
          );
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wallet Overview</h2>
          <p className="text-muted-foreground">
            Monitor all business wallets across the platform
          </p>
        </div>
        <Button onClick={fetchWallets} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWallets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalCollected)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.totalDisbursed)}
            </div>
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
                placeholder="Search by business name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance">Balance</SelectItem>
                <SelectItem value="collected">Total Collected</SelectItem>
                <SelectItem value="disbursed">Total Disbursed</SelectItem>
                <SelectItem value="name">Business Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Wallets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Available Balance</TableHead>
                <TableHead>Pending Balance</TableHead>
                <TableHead>Total Collected</TableHead>
                <TableHead>Total Disbursed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading wallets...
                  </TableCell>
                </TableRow>
              ) : filteredWallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No wallets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredWallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {wallet.business_profiles?.business_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {wallet.business_profiles?.business_email || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(wallet.available_balance, wallet.currency)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(wallet.pending_balance, wallet.currency)}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(wallet.total_collected, wallet.currency)}
                    </TableCell>
                    <TableCell className="text-orange-600">
                      {formatCurrency(wallet.total_disbursed, wallet.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={wallet.is_active ? "default" : "secondary"}>
                        {wallet.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(wallet.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

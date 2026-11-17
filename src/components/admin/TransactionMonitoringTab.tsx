import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock
} from "lucide-react";

interface Collection {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  status: string;
  collection_type: string;
  payer_name: string | null;
  payer_email: string | null;
  payer_phone: string | null;
  created_at: string;
  completed_at: string | null;
  business_profiles: {
    business_name: string;
  } | null;
}

interface Disbursement {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  recipient_name: string;
  recipient_account: string;
  recipient_bank_name: string | null;
  narration: string | null;
  created_at: string;
  completed_at: string | null;
  business_profiles: {
    business_name: string;
  } | null;
}

interface TransactionStats {
  totalCollections: number;
  totalDisbursements: number;
  pendingCollections: number;
  pendingDisbursements: number;
  collectionsVolume: number;
  disbursementsVolume: number;
}

export const TransactionMonitoringTab = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState<TransactionStats>({
    totalCollections: 0,
    totalDisbursements: 0,
    pendingCollections: 0,
    pendingDisbursements: 0,
    collectionsVolume: 0,
    disbursementsVolume: 0,
  });

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const [collectionsRes, disbursementsRes] = await Promise.all([
        supabase
          .from("collections")
          .select(`
            *,
            business_profiles (
              business_name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("disbursements")
          .select(`
            *,
            business_profiles (
              business_name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (collectionsRes.error) throw collectionsRes.error;
      if (disbursementsRes.error) throw disbursementsRes.error;

      const collectionsData = (collectionsRes.data || []) as Collection[];
      const disbursementsData = (disbursementsRes.data || []) as Disbursement[];

      setCollections(collectionsData);
      setDisbursements(disbursementsData);

      // Calculate stats
      setStats({
        totalCollections: collectionsData.length,
        totalDisbursements: disbursementsData.length,
        pendingCollections: collectionsData.filter((c) => c.status === "pending").length,
        pendingDisbursements: disbursementsData.filter((d) => d.status === "pending").length,
        collectionsVolume: collectionsData
          .filter((c) => c.status === "completed")
          .reduce((sum, c) => sum + c.amount, 0),
        disbursementsVolume: disbursementsData
          .filter((d) => d.status === "completed")
          .reduce((sum, d) => sum + d.amount, 0),
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Subscribe to real-time updates
    const collectionsChannel = supabase
      .channel("collections-monitoring")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections" },
        () => fetchTransactions()
      )
      .subscribe();

    const disbursementsChannel = supabase
      .channel("disbursements-monitoring")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disbursements" },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(collectionsChannel);
      supabase.removeChannel(disbursementsChannel);
    };
  }, []);

  const formatCurrency = (amount: number, currency: string = "GHS") => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
      processing: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const filteredCollections = collections.filter((c) => {
    const matchesSearch =
      c.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.payer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.business_profiles?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDisbursements = disbursements.filter((d) => {
    const matchesSearch =
      d.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.business_profiles?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transaction Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of all collections and disbursements
          </p>
        </div>
        <Button onClick={fetchTransactions} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCollections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disbursements</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDisbursements}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Collections</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingCollections}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Disbursements</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingDisbursements}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.collectionsVolume)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disbursements Volume</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.disbursementsVolume)}
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
                placeholder="Search by reference, name, or business..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Tabs */}
      <Tabs defaultValue="collections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="collections" className="gap-2">
            <ArrowDownLeft className="w-4 h-4" />
            Collections ({filteredCollections.length})
          </TabsTrigger>
          <TabsTrigger value="disbursements" className="gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Disbursements ({filteredDisbursements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collections">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : filteredCollections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No collections found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCollections.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell className="font-mono text-sm">
                          {collection.reference}
                        </TableCell>
                        <TableCell>
                          {collection.business_profiles?.business_name || "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{collection.payer_name || "-"}</p>
                            <p className="text-sm text-muted-foreground">
                              {collection.payer_phone || collection.payer_email || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{collection.collection_type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(collection.amount, collection.currency)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(collection.fee, collection.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(collection.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(collection.created_at), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disbursements">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : filteredDisbursements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No disbursements found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDisbursements.map((disbursement) => (
                      <TableRow key={disbursement.id}>
                        <TableCell className="font-mono text-sm">
                          {disbursement.reference}
                        </TableCell>
                        <TableCell>
                          {disbursement.business_profiles?.business_name || "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{disbursement.recipient_name || "-"}</p>
                            <p className="text-sm text-muted-foreground">
                              {disbursement.recipient_account || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {disbursement.recipient_bank_name || "Transfer"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(disbursement.amount, disbursement.currency)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(disbursement.fee, disbursement.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(disbursement.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(disbursement.created_at), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

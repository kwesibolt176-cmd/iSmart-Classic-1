import { useEffect, useState } from "react";
import { RotateCcw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatCurrency } from "@/hooks/use-currency";

interface Refund {
  id: string;
  user_id: string;
  refund_amount: number;
  refund_type: string;
  reason: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  notes: string | null;
}

export const RefundManagementTab = () => {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const { data, error } = await supabase
        .from("refunds")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRefunds(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (refundId: string, status: "approved" | "rejected") => {
    try {
      const { error } = await supabase.functions.invoke("send-refund-notification", {
        body: { refundId, status },
      });
      if (error) {
        console.error("Failed to send refund notification:", error);
      }
    } catch (err) {
      console.error("Error invoking notification function:", err);
    }
  };

  const handleApprove = async (refundId: string) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("refunds")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.user?.id,
        })
        .eq("id", refundId);

      if (error) throw error;

      // Send email notification
      await sendNotification(refundId, "approved");

      toast({
        title: "Success",
        description: "Refund approved and notification sent",
      });

      fetchRefunds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (refundId: string) => {
    try {
      const { error } = await supabase
        .from("refunds")
        .update({ status: "rejected" })
        .eq("id", refundId);

      if (error) throw error;

      // Send email notification
      await sendNotification(refundId, "rejected");

      toast({
        title: "Success",
        description: "Refund rejected and notification sent",
      });

      fetchRefunds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredRefunds = refunds.filter((refund) => {
    const matchesSearch = 
      refund.refund_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = statusFilter === "all" || refund.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5" />
          Refund Management
        </CardTitle>
        <CardDescription>
          Review and process refund requests from businesses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search refunds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Refunds Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRefunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No refunds found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRefunds.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell className="font-medium">{refund.refund_type}</TableCell>
                    <TableCell>{formatCurrency(refund.refund_amount)}</TableCell>
                    <TableCell className="max-w-xs truncate">{refund.reason || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(refund.status)}>
                        {refund.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(refund.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      {refund.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-500"
                            onClick={() => handleApprove(refund.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => handleReject(refund.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

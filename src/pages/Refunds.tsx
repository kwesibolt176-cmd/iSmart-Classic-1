import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { NewRefundDialog } from "@/components/NewRefundDialog";
import { useCurrency } from "@/hooks/use-currency";
import { PageHeader } from "@/components/ui/PageHeader";
import { RotateCcw } from "lucide-react";

interface Refund {
  id: string;
  transaction_id: string;
  order_id: string | null;
  refund_amount: number;
  refund_type: string;
  reason: string | null;
  status: string;
  approved_at: string | null;
  created_at: string;
  notes: string | null;
}

export const Refunds = () => {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useBusiness();
  const { toast } = useToast();
  const { format: formatCurrency } = useCurrency();

  useEffect(() => {
    if (user) {
      fetchRefunds();
    }
  }, [user?.id]);

  const fetchRefunds = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("refunds")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRefunds(data || []);
    } catch (error) {
      console.error("Error fetching refunds:", error);
      toast({
        title: "Error",
        description: "Failed to load refunds",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const stats = {
    totalRefunded: refunds.filter(r => r.status === 'completed' || r.status === 'approved').reduce((acc, r) => acc + Number(r.refund_amount), 0),
    pendingCount: refunds.filter(r => r.status === 'pending').length,
    completedCount: refunds.filter(r => r.status === 'completed' || r.status === 'approved').length,
  };

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Refunds"
        description="Manage refund requests and history"
        rightContent={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            New Refund
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <div className="p-6 flex items-center gap-4">
              <div>
                <RotateCcw className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Refunded</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalRefunded)}</p>
              </div>
            </div>
          </Card>
          <Card className="hover:border-amber-500/20 transition-colors shadow-sm">
            <div className="p-6 flex items-center gap-4">
              <div>
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingCount}</p>
              </div>
            </div>
          </Card>
          <Card className="hover:border-green-500/20 transition-colors shadow-sm">
            <div className="p-6 flex items-center gap-4">
              <div>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-foreground">{stats.completedCount}</p>
              </div>
            </div>
          </Card>
        </div>

          <div className="grid gap-4">
            {refunds.map((refund) => (
              <Card key={refund.id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-foreground">
                        Transaction: {refund.transaction_id.slice(0, 8)}...
                      </p>
                      <Badge variant={getStatusVariant(refund.status)} className="flex items-center gap-1">
                        {getStatusIcon(refund.status)}
                        {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                      </Badge>
                      <Badge variant="outline">
                        {refund.refund_type === "full" ? "Full Refund" : "Partial Refund"}
                      </Badge>
                    </div>
                    {refund.reason && (
                      <p className="text-sm text-muted-foreground mb-1">
                        Reason: {refund.reason}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {new Date(refund.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(refund.refund_amount)}
                    </p>
                    {refund.notes && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                        {refund.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {refunds.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-base sm:text-lg">No refunds found</p>
              </div>
            )}
          </div>
        </div>

        <NewRefundDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen}
          onRefundCreated={fetchRefunds}
        />
    </div>
  );
};
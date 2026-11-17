import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";

interface UnpaidInvoicesWidgetProps {
  onViewInvoices?: () => void;
}

export const UnpaidInvoicesWidget = ({ onViewInvoices }: UnpaidInvoicesWidgetProps) => {
  const { user, profile } = useBusiness();
  const [stats, setStats] = useState({
    total_unpaid: 0,
    overdue_count: 0,
    overdue_amount: 0,
    due_soon_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnpaidStats();
  }, [user?.id]);

  const fetchUnpaidStats = async () => {
    if (!user?.id) return;

    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('status, total, paid_amount, due_date')
        .eq('user_id', user.id)
        .in('status', ['sent', 'partially_paid', 'overdue']);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let totalUnpaid = 0;
      let overdueCount = 0;
      let overdueAmount = 0;
      let dueSoonCount = 0;

      invoices?.forEach((invoice) => {
        const remainingAmount = invoice.total - (invoice.paid_amount || 0);
        totalUnpaid += remainingAmount;

        const dueDate = new Date(invoice.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (invoice.status === 'overdue' || daysDiff < 0) {
          overdueCount++;
          overdueAmount += remainingAmount;
        } else if (daysDiff <= 7) {
          dueSoonCount++;
        }
      });

      setStats({
        total_unpaid: totalUnpaid,
        overdue_count: overdueCount,
        overdue_amount: overdueAmount,
        due_soon_count: dueSoonCount,
      });
    } catch (error) {
      console.error('Error fetching unpaid invoice stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currency = profile?.currency || 'GHS';

  return (
    <Card className="rounded-xl sm:rounded-2xl">
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Unpaid Invoices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 pt-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Outstanding</p>
            <p className="text-lg sm:text-2xl font-bold text-primary">
              {currency} {stats.total_unpaid.toFixed(2)}
            </p>
          </div>

          {stats.overdue_count > 0 && (
            <div className="space-y-1">
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-destructive" />
                Overdue
              </p>
              <p className="text-lg sm:text-2xl font-bold text-destructive">
                {currency} {stats.overdue_amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.overdue_count} invoice{stats.overdue_count !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {stats.due_soon_count > 0 && (
          <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg border border-border">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs sm:text-sm text-muted-foreground">
              {stats.due_soon_count} invoice{stats.due_soon_count !== 1 ? 's' : ''} due within 7 days
            </p>
          </div>
        )}

        {onViewInvoices && (
          <Button
            onClick={onViewInvoices}
            className="w-full text-sm"
            variant={stats.overdue_count > 0 ? "default" : "outline"}
          >
            View All Invoices
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

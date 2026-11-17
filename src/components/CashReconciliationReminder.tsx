import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Wallet, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";

interface CashReconciliationReminderProps {
  onReconcile?: () => void;
}

export const CashReconciliationReminder = ({ onReconcile }: CashReconciliationReminderProps) => {
  const { user, profile } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [show, setShow] = useState(false);
  const [unreconciledCash, setUnreconciledCash] = useState(0);
  const [lastReconciliation, setLastReconciliation] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      checkCashStatus();
    }
  }, [user]);

  const checkCashStatus = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's cash transactions
      const { data: cashTransactions, error } = await supabase
        .from("transactions")
        .select("amount, transaction_date")
        .eq("user_id", user.id)
        .eq("payment_method", "cash")
        .eq("status", "completed")
        .gte("transaction_date", today.toISOString());

      if (error) throw error;

      const totalCash = (cashTransactions || []).reduce((sum, t) => sum + Number(t.amount), 0);

      // Check business hours - show reminder if after closing time or if significant cash accumulated
      const closingTime = (profile as any)?.closing_time;
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      
      let isNearClosing = false;
      if (closingTime) {
        const [closeHour, closeMinute] = closingTime.split(':').map(Number);
        const closingMinutes = closeHour * 60 + closeMinute;
        const currentMinutes = currentHour * 60 + currentMinute;
        // Show reminder 1 hour before closing or after closing
        isNearClosing = currentMinutes >= closingMinutes - 60;
      } else {
        // Default: show after 5 PM or 8 PM if no closing time set
        isNearClosing = currentHour >= 17;
      }

      // Show reminder if:
      // 1. There's unreconciled cash AND it's near closing time
      // 2. OR there's more than 500 in cash accumulated (significant amount)
      const shouldShow = totalCash > 0 && (isNearClosing || totalCash >= 500);

      setUnreconciledCash(totalCash);
      setShow(shouldShow);
    } catch (error) {
      console.error("Error checking cash status:", error);
    }
  };

  if (!show || unreconciledCash === 0) return null;

  return (
    <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
      <Wallet className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Cash Reconciliation Reminder
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            You have <span className="font-semibold text-foreground">{formatCurrency(unreconciledCash)}</span> in 
            unreconciled cash sales today. Remember to count and record your cash drawer.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShow(false)}
              className="shrink-0"
            >
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
            {onReconcile && (
              <Button 
                size="sm" 
                onClick={onReconcile}
                className="shrink-0 bg-amber-600 hover:bg-amber-700"
              >
                <Wallet className="h-4 w-4 mr-1" />
                Reconcile Now
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

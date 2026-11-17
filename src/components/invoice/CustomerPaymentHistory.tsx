import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";

interface CustomerStats {
  customer_name: string;
  total_invoices: number;
  paid_invoices: number;
  total_amount: number;
  paid_amount: number;
  avg_days_to_pay: number | null;
  late_payments: number;
}

export const CustomerPaymentHistory = () => {
  const { user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerStats[]>([]);

  useEffect(() => {
    if (user?.id) fetchCustomerStats();
  }, [user?.id]);

  const fetchCustomerStats = async () => {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("customer_name, total, paid_amount, status, due_date, payment_date, days_to_payment, original_due_date")
      .eq("user_id", user!.id);

    if (invoices) {
      // Group by customer
      const customerMap = new Map<string, CustomerStats>();

      invoices.forEach((inv) => {
        const existing = customerMap.get(inv.customer_name) || {
          customer_name: inv.customer_name,
          total_invoices: 0,
          paid_invoices: 0,
          total_amount: 0,
          paid_amount: 0,
          avg_days_to_pay: null,
          late_payments: 0,
        };

        existing.total_invoices++;
        existing.total_amount += inv.total;
        existing.paid_amount += inv.paid_amount || 0;

        if (inv.status === "paid") {
          existing.paid_invoices++;
          
          // Calculate if payment was late
          if (inv.payment_date && inv.due_date) {
            const paidDate = new Date(inv.payment_date);
            const dueDate = new Date(inv.original_due_date || inv.due_date);
            if (paidDate > dueDate) {
              existing.late_payments++;
            }
          }

          // Track days to payment
          if (inv.days_to_payment !== null) {
            if (existing.avg_days_to_pay === null) {
              existing.avg_days_to_pay = inv.days_to_payment;
            } else {
              existing.avg_days_to_pay = (existing.avg_days_to_pay + inv.days_to_payment) / 2;
            }
          }
        }

        customerMap.set(inv.customer_name, existing);
      });

      // Sort by total amount descending
      const sorted = Array.from(customerMap.values()).sort((a, b) => b.total_amount - a.total_amount);
      setCustomers(sorted);
    }

    setLoading(false);
  };

  const getPaymentBehavior = (customer: CustomerStats) => {
    if (customer.paid_invoices === 0) return { label: "No History", color: "secondary" };
    
    const lateRate = customer.late_payments / customer.paid_invoices;
    
    if (lateRate === 0) return { label: "Excellent", color: "default" };
    if (lateRate < 0.2) return { label: "Good", color: "default" };
    if (lateRate < 0.5) return { label: "Fair", color: "secondary" };
    return { label: "Poor", color: "destructive" };
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Customer Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No invoice history yet
          </p>
        ) : (
          <div className="space-y-3">
            {customers.slice(0, 10).map((customer) => {
              const behavior = getPaymentBehavior(customer);
              const paymentRate = customer.total_invoices > 0 
                ? (customer.paid_invoices / customer.total_invoices) * 100 
                : 0;

              return (
                <div
                  key={customer.customer_name}
                  className="p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{customer.customer_name}</h4>
                        <Badge variant={behavior.color as any}>{behavior.label}</Badge>
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{customer.total_invoices} invoices</span>
                        <span>{customer.paid_invoices} paid</span>
                        {customer.late_payments > 0 && (
                          <span className="text-yellow-600">
                            {customer.late_payments} late
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(customer.total_amount)}
                      </p>
                      {customer.avg_days_to_pay !== null && (
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          Avg {Math.round(customer.avg_days_to_pay)} days
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${paymentRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

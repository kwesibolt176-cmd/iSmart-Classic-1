import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";

interface EmployeeSale {
  staff_id: string;
  staff_name: string;
  total_sales: number;
  order_count: number;
}

export const EmployeeSalesCard = () => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const { format: formatCurrency } = useCurrency();
  const [employeeSales, setEmployeeSales] = useState<EmployeeSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEmployeeSales();
    }
  }, [user, currentLocation]);

  const fetchEmployeeSales = async () => {
    try {
      setLoading(true);
      
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch transactions with staff info
      let query = supabase
        .from('transactions')
        .select('staff_id, amount, staff:staff_id(name)')
        .eq('user_id', user!.id)
        .gte('transaction_date', today.toISOString())
        .lt('transaction_date', tomorrow.toISOString())
        .eq('status', 'completed')
        .not('staff_id', 'is', null);

      if (currentLocation) {
        query = query.eq('location_id', currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by staff and calculate totals
      const salesByStaff = data?.reduce((acc: Record<string, EmployeeSale>, txn: any) => {
        if (!txn.staff_id || !txn.staff) return acc;
        
        const staffId = txn.staff_id;
        if (!acc[staffId]) {
          acc[staffId] = {
            staff_id: staffId,
            staff_name: txn.staff.name,
            total_sales: 0,
            order_count: 0,
          };
        }
        acc[staffId].total_sales += Number(txn.amount);
        acc[staffId].order_count += 1;
        return acc;
      }, {});

      // Convert to array and sort by total sales
      const salesArray = Object.values(salesByStaff || {}).sort(
        (a, b) => b.total_sales - a.total_sales
      );

      setEmployeeSales(salesArray);
    } catch (error) {
      console.error('Error fetching employee sales:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Employee Sales Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Employee Sales Performance</span>
          <span className="sm:hidden">Staff Sales</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {employeeSales.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
            No sales data available for today
          </p>
        ) : (
          <div className="space-y-3">
            {employeeSales.map((employee, index) => (
              <div
                key={employee.staff_id}
                className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm sm:text-base truncate">{employee.staff_name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{employee.order_count} transactions</p>
                </div>
                <div className="text-right ml-2">
                  <p className="font-bold text-foreground text-sm sm:text-base">{formatCurrency(employee.total_sales)}</p>
                  {index === 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-green-500 hidden sm:inline">Top Performer</span>
                      <span className="text-green-500 sm:hidden">#1</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

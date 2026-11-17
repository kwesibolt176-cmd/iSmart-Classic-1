import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";

export interface Expense {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string;
}

export const ExpensesList = ({ expenses, loading = false }: { expenses: Expense[]; loading?: boolean }) => {
  const { format: formatCurrency } = useCurrency();

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Recent Expenses</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="w-4 h-4" />
            <span>{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No expenses recorded</p>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{expense.category}</p>
                  <p className="text-sm text-muted-foreground">{expense.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(expense.expense_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-destructive">-{formatCurrency(expense.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

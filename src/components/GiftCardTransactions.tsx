import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { MobileTableWrapper } from "./MobileTableWrapper";
import { format } from "date-fns";

interface Transaction {
  id: string;
  gift_card_id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  order_id: string | null;
  notes: string | null;
  created_at: string;
  gift_cards: {
    code: string;
  };
}

export const GiftCardTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useBusiness();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user?.id]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("gift_card_transactions")
        .select("*, gift_cards(code)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No transactions yet</p>
      </div>
    );
  }

  return (
    <MobileTableWrapper>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Gift Card</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance After</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="text-sm">
                {format(new Date(transaction.created_at), "MMM d, yyyy h:mm a")}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {transaction.gift_cards.code}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {transaction.transaction_type === "credit" ? (
                    <ArrowUpCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownCircle className="w-4 h-4 text-red-500" />
                  )}
                  <Badge variant={transaction.transaction_type === "credit" ? "default" : "secondary"}>
                    {transaction.transaction_type}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                <span className={transaction.transaction_type === "credit" ? "text-green-600" : "text-red-600"}>
                  {transaction.transaction_type === "credit" ? "+" : "-"}
                  GHS {Number(transaction.amount).toFixed(2)}
                </span>
              </TableCell>
              <TableCell className="text-right font-medium">
                GHS {Number(transaction.balance_after).toFixed(2)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {transaction.notes || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </MobileTableWrapper>
  );
};

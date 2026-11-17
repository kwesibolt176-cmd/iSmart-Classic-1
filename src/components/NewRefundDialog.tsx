import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";

interface Transaction {
  id: string;
  transaction_number: string;
  amount: number;
  created_at: string;
}

interface NewRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefundCreated: () => void;
}

export const NewRefundDialog = ({ open, onOpenChange, onRefundCreated }: NewRefundDialogProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"full" | "partial">("full");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useBusiness();
  const { toast } = useToast();
  const { formatCurrency, currencySymbol } = useCurrency();

  // Filter transactions based on search
  const filteredTransactions = transactions.filter(t =>
    t.transaction_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch recent transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user || !open) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, transaction_number, amount, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching transactions:", error);
        return;
      }

      setTransactions(data || []);
    };

    fetchTransactions();
  }, [user, open]);

  // Auto-fill amount for full refunds
  useEffect(() => {
    if (type === "full" && selectedTransaction) {
      const transaction = transactions.find(t => t.id === selectedTransaction);
      if (transaction) {
        setAmount(transaction.amount.toString());
      }
    }
  }, [type, selectedTransaction, transactions]);

  const handleSubmit = async () => {
    if (!user || !selectedTransaction || !amount) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("refunds").insert({
        user_id: user.id,
        transaction_id: selectedTransaction,
        refund_amount: parseFloat(amount),
        refund_type: type,
        reason: reason || null,
        notes: notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Refund created",
        description: "Refund request has been submitted for approval",
      });

      onRefundCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating refund:", error);
      toast({
        title: "Error",
        description: "Failed to create refund request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTransaction("");
    setAmount("");
    setType("full");
    setReason("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Refund Request</DialogTitle>
          <DialogDescription>
            Select a transaction and specify the refund amount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transactionSearch">Search Transaction</Label>
            <Input
              id="transactionSearch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by transaction number..."
              className="mb-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction">Select Transaction *</Label>
            <Select value={selectedTransaction} onValueChange={setSelectedTransaction}>
              <SelectTrigger id="transaction">
                <SelectValue placeholder="Select a transaction" />
              </SelectTrigger>
              <SelectContent>
                {filteredTransactions.map((transaction) => (
                  <SelectItem key={transaction.id} value={transaction.id}>
                    {transaction.transaction_number} - {formatCurrency(Number(transaction.amount))} 
                    ({new Date(transaction.created_at).toLocaleDateString()})
                  </SelectItem>
                ))}
                {filteredTransactions.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">No transactions found</p>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Refund Type *</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as "full" | "partial")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="font-normal">Full Refund</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="font-normal">Partial Refund</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Refund Amount ({currencySymbol}) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={type === "full"}
              readOnly={type === "full"}
            />
            {type === "full" && (
              <p className="text-xs text-muted-foreground">Full refund amount is fixed to the original transaction amount.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Defective product, Wrong item"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !selectedTransaction || !amount}
          >
            {loading ? "Creating..." : "Submit Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
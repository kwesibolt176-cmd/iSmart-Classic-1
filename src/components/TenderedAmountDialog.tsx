import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

interface TenderedAmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onComplete: (tenderedAmount: number, changeDue: number) => void;
}

export const TenderedAmountDialog = ({
  open,
  onOpenChange,
  totalAmount,
  onComplete,
}: TenderedAmountDialogProps) => {
  const { format: formatCurrency } = useCurrency();
  const [tenderedAmount, setTenderedAmount] = useState("");
  
  const tendered = parseFloat(tenderedAmount) || 0;
  const changeDue = tendered - totalAmount;
  const isValid = tendered >= totalAmount;

  const handleComplete = () => {
    if (isValid) {
      onComplete(tendered, changeDue);
      onOpenChange(false);
      setTenderedAmount("");
    }
  };

  const quickAmounts = [
    Math.ceil(totalAmount / 10) * 10,
    Math.ceil(totalAmount / 20) * 20,
    Math.ceil(totalAmount / 50) * 50,
    Math.ceil(totalAmount / 100) * 100,
  ].filter((val, idx, arr) => arr.indexOf(val) === idx);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Cash Payment
          </DialogTitle>
          <DialogDescription>
            Enter the amount received from the customer to calculate change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Total Amount</Label>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tendered">Amount Tendered</Label>
            <Input
              id="tendered"
              type="number"
              step="0.01"
              value={tenderedAmount}
              onChange={(e) => setTenderedAmount(e.target.value)}
              placeholder="Enter amount received"
              className="text-lg"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setTenderedAmount(totalAmount.toString())}
              className="h-12 border-primary/50 hover:border-primary"
            >
              Exact: {formatCurrency(totalAmount)}
            </Button>
            {quickAmounts.slice(0, 3).map((amount) => (
              <Button
                key={amount}
                variant="outline"
                onClick={() => setTenderedAmount(amount.toString())}
                className="h-12"
              >
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>

          {tenderedAmount && (
            <div className={`p-4 rounded-lg ${isValid ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <Label className="text-sm text-muted-foreground">Change Due</Label>
              <p className={`text-2xl font-bold ${isValid ? 'text-success' : 'text-destructive'}`}>
                {isValid ? formatCurrency(changeDue) : 'Insufficient amount'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={!isValid}>
            Complete Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

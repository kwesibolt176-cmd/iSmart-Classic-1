import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCurrency } from "@/hooks/use-currency";

interface SplitPaymentProps {
  order: {
    total: number;
  };
}

export const SplitPayment = ({ order }: SplitPaymentProps) => {
  const { format: formatCurrency } = useCurrency();
  const [splits, setSplits] = useState(2);
  const amountPerPerson = order.total / splits;

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Split Payment</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="splits">Number of People</Label>
          <Input
            id="splits"
            type="number"
            value={splits}
            onChange={(e) => setSplits(Math.max(2, Number(e.target.value)))}
            min="2"
            max="10"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          {Array.from({ length: splits }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <span className="font-medium text-foreground">Person {index + 1}</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(amountPerPerson)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";

interface PaymentSummaryProps {
  order: {
    items: Array<{ id: string; name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
  };
  discount?: { type: string; value: number; reason: string } | null;
  tipsEnabled?: boolean;
  tipPercent?: number;
  onTipPercentChange?: (percentage: number) => void;
}

export const PaymentSummary = ({
  order,
  discount,
  tipsEnabled = true,
  tipPercent = 15,
  onTipPercentChange,
}: PaymentSummaryProps) => {
  const { format: formatCurrency, currencySymbol } = useCurrency();
  const tipAmount = tipsEnabled ? (order.subtotal * tipPercent) / 100 : 0;
  
  let discountAmount = 0;
  if (discount) {
    discountAmount = discount.type === "percentage" 
      ? order.subtotal * (discount.value / 100)
      : discount.value;
  }
  
  const finalTotal = order.total + tipAmount - discountAmount;

  return (
    <div className="bg-card rounded-lg border border-border p-6 sticky top-8">
      <h2 className="text-lg font-bold text-foreground mb-6 uppercase tracking-wider">Order Summary</h2>

      <div className="space-y-4 mb-6">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm items-center">
            <span className="text-foreground font-medium">
              {item.quantity} × {item.name}
            </span>
            <span className="text-muted-foreground font-bold">
              {formatCurrency(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-6" />

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">Subtotal</span>
          <span className="text-foreground font-bold">{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">Tax</span>
          <span className="text-foreground font-bold">{formatCurrency(order.tax)}</span>
        </div>
        
        {discount && (
          <div className="flex justify-between text-sm text-primary">
            <span className="font-medium">
              Discount ({discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)})
              {discount.reason && <span className="text-muted-foreground ml-2 text-[10px] uppercase">- {discount.reason}</span>}
            </span>
            <span className="font-bold">-{formatCurrency(discountAmount)}</span>
          </div>
        )}
      </div>

      <Separator className="my-6" />

      {tipsEnabled && <div className="space-y-4 mb-6">
        <Label htmlFor="tip" className="text-xs font-bold uppercase text-muted-foreground">Select Tip ({tipPercent}%)</Label>
        <div className="flex gap-2">
          {[10, 15, 18, 20].map((percent) => (
            <button
              key={percent}
              onClick={() => onTipPercentChange?.(percent)}
              className={cn(
                "flex-1 py-2 px-3 rounded-md border text-xs font-bold transition-all",
                tipPercent === percent 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "border-border hover:bg-muted/50 text-muted-foreground"
              )}
            >
              {percent}%
            </button>
          ))}
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-muted-foreground font-medium">Tip Amount</span>
          <span className="text-foreground font-bold">{formatCurrency(tipAmount)}</span>
        </div>
      </div>}

      <Separator className="my-6" />

      <div className="flex justify-between items-center bg-muted/20 p-4 -mx-6 -mb-6 border-t border-border">
        <span className="text-sm font-bold text-foreground uppercase tracking-widest">Total</span>
        <span className="text-xl font-black text-primary">{formatCurrency(finalTotal)}</span>
      </div>
    </div>
  );
};

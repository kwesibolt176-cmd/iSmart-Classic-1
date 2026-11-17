import { Separator } from "@/components/ui/separator";
import { useCurrency } from "@/hooks/use-currency";
import { TaxComputationResult } from "@/lib/ghana-tax-engine";

interface TaxBreakdownReceiptProps {
  taxResult: TaxComputationResult | null;
  subtotal: number;
}

/**
 * Displays itemized tax breakdown on receipts for VAT-registered businesses
 * Shows NHIL, GETFund, and VAT as required by GRA
 */
export const TaxBreakdownReceipt = ({ taxResult, subtotal }: TaxBreakdownReceiptProps) => {
  const { format: formatCurrency } = useCurrency();

  // Don't show breakdown if not VAT registered or no tax result
  if (!taxResult?.vat_registered) {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Tax</span>
        <span className="text-foreground">{formatCurrency(0)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground font-medium mb-1">
        Tax Breakdown (GRA Compliant)
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">NHIL (2.5%)</span>
        <span className="text-foreground">{formatCurrency(taxResult.nhil_amount)}</span>
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">GETFund (2.5%)</span>
        <span className="text-foreground">{formatCurrency(taxResult.getfund_amount)}</span>
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">VAT (15%)</span>
        <span className="text-foreground">{formatCurrency(taxResult.vat_amount)}</span>
      </div>
      
      <Separator className="my-2" />
      
      <div className="flex justify-between text-sm font-medium">
        <span className="text-muted-foreground">Total Tax (20%)</span>
        <span className="text-foreground">{formatCurrency(taxResult.total_tax)}</span>
      </div>
    </div>
  );
};

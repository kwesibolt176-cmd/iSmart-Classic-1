import { TaxComputationResult, getTaxBreakdownDisplay } from "@/lib/ghana-tax-engine";
import { useCurrency } from "@/hooks/use-currency";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Receipt, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaxBreakdownDisplayProps {
  taxResult: TaxComputationResult;
  showDetails?: boolean;
  compact?: boolean;
}

export const TaxBreakdownDisplay = ({
  taxResult,
  showDetails = true,
  compact = false,
}: TaxBreakdownDisplayProps) => {
  const { currencySymbol } = useCurrency();

  if (!taxResult.vat_registered) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Info className="w-4 h-4" />
        <span>No taxes applied (Not VAT registered)</span>
      </div>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-sm cursor-help">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span>Tax: {currencySymbol}{taxResult.total_tax.toFixed(2)}</span>
              <Badge variant="outline" className="text-xs">20%</Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="p-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span>NHIL (2.5%):</span>
                <span>{currencySymbol}{taxResult.nhil_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>GETFund (2.5%):</span>
                <span>{currencySymbol}{taxResult.getfund_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>VAT (15%):</span>
                <span>{currencySymbol}{taxResult.vat_amount.toFixed(2)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between gap-4 font-semibold">
                <span>Total Tax:</span>
                <span>{currencySymbol}{taxResult.total_tax.toFixed(2)}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Receipt className="w-4 h-4" />
        <span>Tax Breakdown (GRA Compliant)</span>
        <Badge variant="secondary" className="text-xs">v{taxResult.tax_rule_version}</Badge>
      </div>

      {showDetails && (
        <>
          <Separator />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Amount:</span>
              <span>{currencySymbol}{taxResult.net_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">NHIL (2.5%):</span>
              <span>{currencySymbol}{taxResult.nhil_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GETFund (2.5%):</span>
              <span>{currencySymbol}{taxResult.getfund_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT (15%):</span>
              <span>{currencySymbol}{taxResult.vat_amount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total Tax (20%):</span>
              <span className="text-primary">{currencySymbol}{taxResult.total_tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base">
              <span>Gross Amount:</span>
              <span>{currencySymbol}{taxResult.gross_amount.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import { CreditCard, Smartphone, Wallet, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethodProps {
  selectedMethod: string | null;
  onSelectMethod: (method: string) => void;
  showISmartMoMo?: boolean;
}

const methods = [
  { id: "cash", label: "Cash", icon: Coins, description: "Pay with physical cash" },
  { id: "card", label: "Card", icon: CreditCard, description: "Pay via iSmart" },
  { id: "mobile", label: "Mobile Money", icon: Smartphone, description: "Pay via iSmart" },
  { id: "ismart-momo", label: "iSmart MoMo", icon: Wallet, description: "MTN / Telecel direct", hidden: true },
  { id: "other", label: "Other", icon: Coins, description: "Bank transfer, etc." },
];

export const PaymentMethod = ({ selectedMethod, onSelectMethod, showISmartMoMo = true }: PaymentMethodProps) => {
  const visibleMethods = methods.filter(m => !m.hidden || (m.id === "ismart-momo" && showISmartMoMo));
  
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-bold text-foreground mb-6 uppercase tracking-wider">Payment Method</h2>
      <div className="grid grid-cols-2 gap-4">
        {visibleMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          return (
            <button
              key={method.id}
              onClick={() => onSelectMethod(method.id)}
              className={cn(
                "p-4 sm:p-6 rounded-lg border-2 transition-all duration-200 text-left",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 shrink-0",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <div>
                  <p
                    className={cn(
                      "font-bold text-sm sm:text-base",
                      isSelected ? "text-primary" : "text-foreground"
                    )}
                  >
                    {method.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground hidden sm:block uppercase font-medium">
                    {method.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

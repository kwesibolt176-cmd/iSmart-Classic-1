import { Customer } from "@/pages/Customers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, ShoppingBag, Gift } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
}

export const CustomerCard = ({ customer, onClick }: CustomerCardProps) => {
  const { format: formatCurrency } = useCurrency();
  
  return (
    <Card 
      className="p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-base sm:text-lg font-semibold text-primary">
              {customer.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{customer.name}</h3>
            <p className="text-xs text-muted-foreground">{customer.lastVisit}</p>
          </div>
        </div>
        {customer.loyaltyPoints > 100 && (
          <Badge variant="secondary" className="gap-1 text-xs shrink-0">
            <Gift className="w-3 h-3" />
            VIP
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
          <span className="text-foreground truncate">{customer.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
          <span className="text-foreground">{customer.phone}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-border">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <ShoppingBag className="w-3 h-3" />
            <span className="hidden sm:inline">Orders</span>
          </div>
          <p className="font-semibold text-foreground text-sm sm:text-base">{customer.totalOrders}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1 truncate">Spent</p>
          <p className="font-semibold text-foreground text-sm sm:text-base">{formatCurrency(customer.totalSpent)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Gift className="w-3 h-3" />
            <span className="hidden sm:inline">Points</span>
          </div>
          <p className="font-semibold text-primary text-sm sm:text-base">{customer.loyaltyPoints}</p>
        </div>
      </div>
    </Card>
  );
};

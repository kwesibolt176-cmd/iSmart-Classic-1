import { Users, Clock, Edit, Trash2, ShoppingBag, Plus, CreditCard } from "lucide-react";
import { Table, TableStatus } from "@/pages/Tables";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";

interface TableCardProps {
  table: Table;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelectForOrder?: () => void;
  onSettleBill?: () => void;
}

const statusConfig: Record<TableStatus, { bg: string; text: string; label: string }> = {
  available: {
    bg: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40",
    text: "text-emerald-500",
    label: "Available",
  },
  occupied: {
    bg: "bg-red-500/10 border-red-500/20 hover:border-red-500/40",
    text: "text-red-500",
    label: "Occupied",
  },
  reserved: {
    bg: "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40",
    text: "text-amber-500",
    label: "Reserved",
  },
};

export const TableCard = ({ table, onEdit, onDelete, onSelectForOrder, onSettleBill }: TableCardProps) => {
  const { formatCurrency } = useCurrency();
  const config = statusConfig[table.status];
  const isClickable = table.status === "available" || table.status === "occupied";

  const handleCardClick = () => {
    if (table.status === "available" && onSelectForOrder) {
      onSelectForOrder();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all hover:shadow-xl",
        config.bg,
        "group",
        isClickable && table.status === "available" && "cursor-pointer"
      )}
    >
      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex gap-1">
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="h-6 w-6 sm:h-7 sm:w-7 p-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit className="w-3 h-3" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 sm:h-7 sm:w-7 p-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
        <span
          className={cn(
            "px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-xs font-semibold",
            config.text,
            "bg-background/50"
          )}
        >
          {config.label}
        </span>
      </div>

      <div className="text-center mt-2">
        <div className={cn("text-3xl sm:text-4xl font-bold mb-2 sm:mb-3", config.text)}>
          {table.number}
        </div>

        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2 sm:mb-3">
          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">{table.capacity}</span>
        </div>

        {(table as any).section && (
          <div className="text-xs text-muted-foreground mb-2">
            {(table as any).section}
          </div>
        )}

        {table.status === "available" && onSelectForOrder && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onSelectForOrder();
            }}
          >
            <Plus className="w-3 h-3" />
            Add Order
          </Button>
        )}

        {table.status === "occupied" && table.orderDetails && (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">
                  #{table.orderDetails.order_number}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(table.orderDetails.created_at), { addSuffix: true })}
              </p>
            </div>
            
            <div className="space-y-1 max-h-16 sm:max-h-20 overflow-y-auto">
              {table.orderDetails.items.slice(0, 2).map((item) => (
                <div key={item.id} className="flex justify-between gap-2 text-xs">
                  <span className="text-muted-foreground truncate">
                    {item.quantity}x {item.name}
                  </span>
                </div>
              ))}
              {table.orderDetails.items.length > 2 && (
                <p className="text-xs text-muted-foreground italic">
                  +{table.orderDetails.items.length - 2} more
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border/30">
              <span className="text-xs font-semibold text-foreground">
                Total: {formatCurrency(table.orderDetails.total)}
              </span>
              {onSettleBill && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-7 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSettleBill();
                  }}
                >
                  <CreditCard className="w-3 h-3" />
                  Settle
                </Button>
              )}
            </div>
          </div>
        )}

        {table.status === "reserved" && table.reservedFor && (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{table.reservedFor}</p>
          </div>
        )}
      </div>
    </div>
  );
};

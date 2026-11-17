import { Clock, User, MapPin, TrendingUp, Link2 } from "lucide-react";
import { Order, OrderStatus } from "@/pages/Orders";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { OrderDetails } from "@/components/OrderDetails";
import { useCurrency } from "@/hooks/use-currency";
import { Badge } from "@/components/ui/badge";

interface OrderCardProps {
  order: Order;
  onOrderDeleted?: () => void;
  onOrderUpdated?: () => void;
}

const statusConfig: Record<OrderStatus, { bg: string; text: string; label: string; gradient: string }> = {
  pending: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    label: "Pending",
    gradient: "from-amber-500/20 to-amber-600/10",
  },
  processing: {
    bg: "bg-[hsl(217_91%_60%)]/10",
    text: "text-[hsl(217_91%_60%)]",
    label: "Processing",
    gradient: "from-[hsl(217_91%_60%)]/20 to-[hsl(217_91%_60%)]/10",
  },
  ready: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    label: "Ready",
    gradient: "from-emerald-500/20 to-emerald-600/10",
  },
  served: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    label: "Served",
    gradient: "from-purple-500/20 to-purple-600/10",
  },
  completed: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    label: "Completed",
    gradient: "from-muted/20 to-muted/10",
  },
};

export const OrderCard = ({ order, onOrderDeleted, onOrderUpdated }: OrderCardProps) => {
  const config = statusConfig[order.status];
  const { format: formatCurrency } = useCurrency();

  // Check payment link status
  const hasActivePaymentLink = order.payment_link && order.payment_link_expires_at &&
    new Date(order.payment_link_expires_at) > new Date();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="bg-card rounded-lg border border-border hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-200 text-left w-full flex flex-col shadow-sm p-0 overflow-hidden focus:outline-none">
          <div className="p-4 border-b border-border/50 flex flex-col gap-3 w-full bg-slate-50/30 dark:bg-slate-900/10">
            <div className="flex items-start justify-between w-full gap-2">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    #{order.orderNumber.replace('#', '')}
                  </h3>
                  <span className={cn("font-bold text-[10px] uppercase tracking-wider", config.text)}>
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{order.time}</span>
                  </div>
                  {order.tableNumber && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Table {order.tableNumber}</span>
                    </div>
                  )}
                  {order.server && (
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[80px]">{order.server}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-card flex-1 w-full flex flex-col justify-center">
            <div className="space-y-1.5">
              {order.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between text-xs gap-3">
                  <span className="text-foreground/80 truncate">
                    <span className="text-muted-foreground font-medium w-4 inline-block">{item.quantity}×</span>
                    {item.name}
                  </span>
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="text-[11px] font-medium text-muted-foreground pt-1">
                  +{order.items.length - 3} more items
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-2.5 flex items-center justify-between border-t border-border/50 w-full bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex flex-wrap gap-2">
              {order.order_type && (
                <Badge variant="outline" className="text-[10px] uppercase font-semibold py-0 h-5 bg-card text-muted-foreground">
                  {order.order_type.replace("-", " ")}
                </Badge>
              )}
              {hasActivePaymentLink && (
                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-5 gap-1 bg-[hsl(217_91%_60%)]/10 text-[hsl(217_91%_60%)] border-[hsl(217_91%_60%)]/30 dark:bg-[hsl(217_91%_60%)]/20 dark:border-[hsl(217_91%_60%)]/40 dark:text-[hsl(217_91%_60%)]">
                  <Link2 className="w-3 h-3" />
                  Link Active
                </Badge>
              )}
            </div>
          </div>
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{order.orderNumber}</SheetTitle>
          <SheetDescription>Order details and actions</SheetDescription>
        </SheetHeader>
        <OrderDetails
          order={order}
          onOrderDeleted={onOrderDeleted}
          onOrderUpdated={onOrderUpdated}
        />
      </SheetContent>
    </Sheet>
  );
};

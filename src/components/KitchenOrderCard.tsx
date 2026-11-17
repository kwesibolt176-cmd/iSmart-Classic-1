import { Order } from "@/pages/Orders";
import { Button } from "@/components/ui/button";
import { MapPin, User, ChefHat, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { KitchenOrderTimer } from "./KitchenOrderTimer";
import { useState } from "react";

interface KitchenOrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: string) => Promise<void>;
}

export const KitchenOrderCard = ({ order, onStatusUpdate }: KitchenOrderCardProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const getNextStatus = () => {
    if (order.status === "pending") return "processing";
    if (order.status === "processing") return "ready";
    return "served";
  };

  const getButtonText = () => {
    if (order.status === "pending") return "Start Processing";
    if (order.status === "processing") return "Mark Ready";
    return "Mark Served";
  };

  const getButtonIcon = () => {
    if (order.status === "pending") return <ChefHat className="w-4 h-4" />;
    if (order.status === "processing") return <CheckCircle2 className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };


  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(order.id, getNextStatus());
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border/50 p-3 space-y-3 transition-all hover:shadow-md"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-lg font-bold text-foreground">{order.orderNumber}</h3>
            <KitchenOrderTimer createdAt={order.created_at || new Date().toISOString()} status={order.status} />
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
            {order.tableNumber && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>Table {order.tableNumber}</span>
              </div>
            )}
            {order.order_type && (
              <span className="px-2 py-0.5 bg-muted rounded-md text-xs font-medium capitalize">
                {order.order_type}
              </span>
            )}
          </div>
        </div>
        {order.server && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
            <User className="w-4 h-4" />
            <span>{order.server}</span>
          </div>
        )}
      </div>

      <div className="space-y-0.5 py-2 border-y border-border/50 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between items-start gap-2 py-1 border-b border-border/30 last:border-0 text-[13px]">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground flex items-start gap-2">
                <span className="inline-flex items-center justify-center min-w-6 h-6 rounded bg-muted border border-border/50 text-foreground font-bold text-xs shrink-0">
                  {item.quantity}
                </span>
                <span className="mt-[3px] leading-tight text-sm">{item.name}</span>
              </p>
              {item.notes && (
                <p className="text-[11px] text-amber-600 dark:text-amber-500 ml-[32px] mt-0.5 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button 
        className="w-full gap-1.5 h-8 text-xs" 
        size="sm"
        variant={order.status === "ready" ? "default" : "secondary"}
        onClick={handleStatusUpdate}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          getButtonIcon()
        )}
        {getButtonText()}
      </Button>
    </div>
  );
};

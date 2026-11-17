import { Package, AlertTriangle, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface InventoryCardProps {
  item: {
    id: number;
    name: string;
    category: string;
    stock: number;
    unit: string;
    reorderPoint: number;
    supplier: string;
    status: "in-stock" | "low" | "critical";
    lastOrdered: string;
  };
}

export const InventoryCard = ({ item }: InventoryCardProps) => {
  const stockPercentage = (item.stock / (item.reorderPoint * 2)) * 100;
  
  const statusConfig = {
    "in-stock": { color: "bg-primary", badge: "default" as const },
    "low": { color: "bg-yellow-500", badge: "secondary" as const },
    "critical": { color: "bg-destructive", badge: "destructive" as const },
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{item.category}</p>
            </div>
          </div>
          <Badge variant={statusConfig[item.status].badge} className="capitalize">
            {item.status}
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Current Stock</span>
            <span className="font-semibold text-foreground">
              {item.stock} {item.unit}
            </span>
          </div>
          
          <Progress value={stockPercentage} className="h-2" />
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Reorder at: {item.reorderPoint} {item.unit}</span>
            {item.status !== "in-stock" && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="w-3 h-3" />
                Low stock
              </span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground shrink-0">Supplier</span>
            <span className="text-foreground truncate ml-2">{item.supplier}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Order</span>
            <span className="text-foreground">{item.lastOrdered}</span>
          </div>
        </div>

        <Button variant="outline" className="w-full mt-4" size="sm">
          Reorder Stock
        </Button>
      </CardContent>
    </Card>
  );
};
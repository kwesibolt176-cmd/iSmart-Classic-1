import { useEffect, useState } from "react";
import { History, TrendingUp, TrendingDown, Edit, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { formatDistanceToNow } from "date-fns";

interface HistoryEntry {
  id: string;
  action: string;
  quantity_before: number | null;
  quantity_after: number | null;
  price_before: number | null;
  price_after: number | null;
  reason: string | null;
  created_at: string;
  inventory_items: {
    name: string;
  };
}

export const InventoryHistoryTab = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_history")
        .select(`
          *,
          inventory_items (name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Plus className="w-4 h-4" />;
      case "updated":
      case "stock_adjustment":
        return <Edit className="w-4 h-4" />;
      case "sold":
        return <TrendingDown className="w-4 h-4" />;
      case "returned":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-green-500/10 text-green-500";
      case "updated":
      case "stock_adjustment":
        return "bg-blue-500/10 text-blue-500";
      case "sold":
        return "bg-orange-500/10 text-orange-500";
      case "returned":
        return "bg-purple-500/10 text-purple-500";
      case "deactivated":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Inventory History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inventory changes recorded yet
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className={`p-2 rounded-lg ${getActionColor(entry.action)}`}>
                  {getActionIcon(entry.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {entry.inventory_items?.name}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {entry.action.replace("_", " ")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm space-y-1">
                    {entry.quantity_before !== null && entry.quantity_after !== null && (
                      <p className="text-muted-foreground">
                        Quantity: {entry.quantity_before} → {entry.quantity_after}
                        <span className={entry.quantity_after > entry.quantity_before ? "text-green-500 ml-2" : "text-red-500 ml-2"}>
                          {entry.quantity_after > entry.quantity_before ? "+" : ""}
                          {entry.quantity_after - entry.quantity_before}
                        </span>
                      </p>
                    )}
                    {entry.price_before !== null && entry.price_after !== null && (
                      <p className="text-muted-foreground">
                        Price: {formatCurrency(entry.price_before)} → {formatCurrency(entry.price_after)}
                      </p>
                    )}
                    {entry.reason && (
                      <p className="text-muted-foreground italic">
                        Reason: {entry.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

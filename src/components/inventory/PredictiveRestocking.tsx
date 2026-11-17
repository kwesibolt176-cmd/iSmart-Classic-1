import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  ShoppingCart,
  Package,
  ArrowUpRight,
  RefreshCw
} from "lucide-react";

interface InventoryPrediction {
  id: string;
  name: string;
  current_quantity: number;
  low_stock_threshold: number;
  avg_daily_sales: number;
  days_until_stockout: number;
  suggested_reorder_qty: number;
  velocity_trend: 'increasing' | 'stable' | 'decreasing';
  last_30_days_sold: number;
}

export const PredictiveRestocking = () => {
  const { user } = useBusiness();
  const [predictions, setPredictions] = useState<InventoryPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPredictions();
    }
  }, [user?.id]);

  const fetchPredictions = async () => {
    try {
      // Get inventory items
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id, name, quantity, low_stock_threshold, track_inventory')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .eq('track_inventory', true);

      if (itemsError) throw itemsError;

      // Get sales data for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orderItems, error: ordersError } = await supabase
        .from('order_items')
        .select('inventory_item_id, quantity, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (ordersError) throw ordersError;

      // Get sales from 30-60 days ago for trend comparison
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: previousOrderItems } = await supabase
        .from('order_items')
        .select('inventory_item_id, quantity')
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Calculate predictions for each item
      const calculatedPredictions: InventoryPrediction[] = (items || []).map(item => {
        const recentSales = (orderItems || [])
          .filter(oi => oi.inventory_item_id === item.id)
          .reduce((sum, oi) => sum + oi.quantity, 0);

        const previousSales = (previousOrderItems || [])
          .filter(oi => oi.inventory_item_id === item.id)
          .reduce((sum, oi) => sum + oi.quantity, 0);

        const avgDailySales = recentSales / 30;
        const previousAvgDaily = previousSales / 30;
        
        let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
        if (avgDailySales > previousAvgDaily * 1.2) trend = 'increasing';
        else if (avgDailySales < previousAvgDaily * 0.8) trend = 'decreasing';

        const daysUntilStockout = avgDailySales > 0 
          ? Math.floor(item.quantity / avgDailySales)
          : 999;

        // Suggest reorder quantity based on 30-day supply + safety stock
        const suggestedReorder = Math.max(
          Math.ceil(avgDailySales * 45), // 45 days supply
          (item.low_stock_threshold || 10) * 3
        );

        return {
          id: item.id,
          name: item.name,
          current_quantity: item.quantity,
          low_stock_threshold: item.low_stock_threshold || 10,
          avg_daily_sales: Math.round(avgDailySales * 10) / 10,
          days_until_stockout: daysUntilStockout,
          suggested_reorder_qty: suggestedReorder,
          velocity_trend: trend,
          last_30_days_sold: recentSales,
        };
      });

      // Sort by days until stockout (most urgent first)
      calculatedPredictions.sort((a, b) => a.days_until_stockout - b.days_until_stockout);

      setPredictions(calculatedPredictions.filter(p => p.avg_daily_sales > 0));
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPredictions();
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'destructive';
    if (days <= 14) return 'secondary';
    return 'outline';
  };

  const getUrgencyLabel = (days: number) => {
    if (days <= 3) return 'Critical';
    if (days <= 7) return 'Urgent';
    if (days <= 14) return 'Soon';
    return 'OK';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      default:
        return <span className="h-4 w-4 text-muted-foreground">—</span>;
    }
  };

  const urgentItems = predictions.filter(p => p.days_until_stockout <= 7);
  const soonItems = predictions.filter(p => p.days_until_stockout > 7 && p.days_until_stockout <= 14);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Predictive Restocking
          </h2>
          <p className="text-sm text-muted-foreground">
            AI-powered inventory predictions based on sales velocity
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{urgentItems.length}</p>
                <p className="text-sm text-muted-foreground">Critical (≤7 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{soonItems.length}</p>
                <p className="text-sm text-muted-foreground">Reorder Soon (8-14 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{predictions.length}</p>
                <p className="text-sm text-muted-foreground">Items Tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictions List */}
      {predictions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Predictions Available</h3>
            <p className="text-muted-foreground">
              Start tracking inventory and making sales to see predictions
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Restock Recommendations</CardTitle>
            <CardDescription>
              Based on last 30 days of sales data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictions.slice(0, 10).map((item) => (
                <div 
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant={getUrgencyColor(item.days_until_stockout)}>
                        {getUrgencyLabel(item.days_until_stockout)}
                      </Badge>
                      {getTrendIcon(item.velocity_trend)}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span>Stock: {item.current_quantity}</span>
                      <span>Avg/day: {item.avg_daily_sales}</span>
                      <span>30-day sales: {item.last_30_days_sold}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Days until stockout</span>
                        <span className="font-medium">
                          {item.days_until_stockout > 90 ? '90+' : item.days_until_stockout} days
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, (item.days_until_stockout / 30) * 100)} 
                        className="h-2"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Suggested Order</p>
                    <p className="text-xl font-bold text-primary">
                      {item.suggested_reorder_qty} units
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

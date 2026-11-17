import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

interface LowStockAlert {
  id: string;
  current_quantity: number;
  threshold: number;
  inventory_items: {
    name: string;
  };
}

interface LowStockAlertsBannerProps {
  onViewInventory?: () => void;
}

const LowStockAlertsBanner = ({ onViewInventory }: LowStockAlertsBannerProps) => {
  const { user } = useBusiness();
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('low_stock_alerts')
      .select('id, current_quantity, threshold, inventory_items(name)')
      .eq('user_id', user?.id)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setAlerts(data as any);
    }
  };

  const resolveAlert = async (alertId: string) => {
    await supabase
      .from('low_stock_alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    
    fetchAlerts();
  };

  if (dismissed || alerts.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Low Stock Warning</span>
        <Button variant="ghost" size="icon" onClick={() => setDismissed(true)}>
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          {alerts.length} item{alerts.length > 1 ? 's' : ''} below stock threshold:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1">
          {alerts.slice(0, 3).map((alert) => (
            <li key={alert.id}>
              {alert.inventory_items?.name} ({alert.current_quantity} remaining)
            </li>
          ))}
          {alerts.length > 3 && <li>...and {alerts.length - 3} more</li>}
        </ul>
        {onViewInventory && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={onViewInventory}
          >
            View Inventory
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default LowStockAlertsBanner;

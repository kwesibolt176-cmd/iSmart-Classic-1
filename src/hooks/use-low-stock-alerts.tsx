import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "@/hooks/use-toast";

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  low_stock_threshold: number;
}

interface SupplierSuggestion {
  supplierId: string;
  supplierName: string;
  items: { name: string; currentQty: number; suggestedQty: number }[];
}

export const useLowStockAlerts = () => {
  const { user } = useBusiness();
  const [supplierSuggestions, setSupplierSuggestions] = useState<SupplierSuggestion[]>([]);

  const sendEmailAlert = useCallback(async (items: LowStockItem[]) => {
    if (!user || items.length === 0) return;

    try {
      const response = await supabase.functions.invoke("send-low-stock-alert", {
        body: {
          userId: user.id,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            threshold: item.low_stock_threshold || 10,
          })),
        },
      });

      if (response.error) {
        console.error("Failed to send low stock email:", response.error);
      }
    } catch (error) {
      console.error("Error sending low stock alert:", error);
    }
  }, [user]);

  const generateSupplierSuggestions = useCallback(async (lowStockItems: LowStockItem[]) => {
    if (!user) return;

    // Get suppliers
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (!suppliers || suppliers.length === 0) return;

    // Create suggestions - group all low stock items with first available supplier
    const suggestions: SupplierSuggestion[] = [];
    
    if (lowStockItems.length > 0 && suppliers.length > 0) {
      suggestions.push({
        supplierId: suppliers[0].id,
        supplierName: suppliers[0].name,
        items: lowStockItems.map(item => ({
          name: item.name,
          currentQty: item.quantity,
          suggestedQty: Math.max((item.low_stock_threshold || 10) * 3, 50),
        })),
      });
    }

    setSupplierSuggestions(suggestions);
  }, [user]);

  const checkLowStock = useCallback(async () => {
    if (!user) return;

    // Get all inventory items below threshold
    const { data: lowStockItems, error } = await supabase
      .from("inventory_items")
      .select("id, name, quantity, low_stock_threshold")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .not("low_stock_threshold", "is", null);

    if (error) {
      console.error("Error checking low stock:", error);
      return;
    }

    const alertItems = lowStockItems?.filter(
      item => item.quantity <= (item.low_stock_threshold || 10)
    ) || [];

    // Auto-resolve alerts for items that are no longer below threshold
    // (restocked, threshold cleared, or item deactivated) — otherwise the
    // low stock banner keeps showing stale alerts forever.
    const stillLowIds = new Set(alertItems.map(item => item.id));
    const { data: unresolvedAlerts } = await supabase
      .from("low_stock_alerts")
      .select("id, inventory_item_id")
      .eq("user_id", user.id)
      .eq("is_resolved", false);

    const alertsToResolve = (unresolvedAlerts || [])
      .filter(alert => !stillLowIds.has(alert.inventory_item_id))
      .map(alert => alert.id);

    if (alertsToResolve.length > 0) {
      await supabase
        .from("low_stock_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .in("id", alertsToResolve);
    }

    const criticalItems: LowStockItem[] = [];
    const newAlertItems: LowStockItem[] = [];

    for (const item of alertItems) {
      // Check if alert already exists and is unresolved
      const { data: existingAlert } = await supabase
        .from("low_stock_alerts")
        .select("id, email_sent")
        .eq("inventory_item_id", item.id)
        .eq("is_resolved", false)
        .maybeSingle();

      if (!existingAlert) {
        // Create new alert
        await supabase.from("low_stock_alerts").insert({
          user_id: user.id,
          inventory_item_id: item.id,
          current_quantity: item.quantity,
          threshold: item.low_stock_threshold || 10,
          alert_type: item.quantity === 0 ? "out_of_stock" : "low_stock",
        });

        // Create in-app notification
        await supabase.from("notifications").insert({
          user_id: user.id,
          recipient_id: user.id,
          title: item.quantity === 0 ? "Out of Stock!" : "Low Stock Alert",
          message: item.quantity === 0 
            ? `${item.name} is OUT OF STOCK!` 
            : `${item.name} is running low (${item.quantity} remaining)`,
          type: item.quantity === 0 ? "error" : "warning",
          link: "/products",
        });

        newAlertItems.push(item);

        toast({
          title: item.quantity === 0 ? "Out of Stock!" : "Low Stock Alert",
          description: `${item.name} ${item.quantity === 0 ? "is out of stock" : `has only ${item.quantity} remaining`}`,
          variant: "destructive",
        });
      }

      // Track critical items for email
      if (item.quantity <= (item.low_stock_threshold || 10) / 2) {
        criticalItems.push(item);
      }
    }

    // Send email alert for critical items (only once per day)
    if (criticalItems.length > 0) {
      const lastEmailKey = `last_low_stock_email_${user.id}`;
      const lastEmail = localStorage.getItem(lastEmailKey);
      const today = new Date().toDateString();

      if (lastEmail !== today) {
        await sendEmailAlert(criticalItems);
        localStorage.setItem(lastEmailKey, today);
      }
    }

    // Generate supplier order suggestions
    if (alertItems.length > 0) {
      await generateSupplierSuggestions(alertItems);
    }
  }, [user, sendEmailAlert, generateSupplierSuggestions]);

  // Check on mount and periodically
  useEffect(() => {
    if (user?.id) {
      checkLowStock();
      const interval = setInterval(checkLowStock, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  return { checkLowStock, supplierSuggestions };
};

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TableCard } from "@/components/TableCard";
import { TableFilters } from "@/components/TableFilters";
import { NewTableDialog } from "@/components/NewTableDialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Loader2, Plus, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast as sonnerToast } from "sonner";

export type TableStatus = "available" | "occupied" | "reserved";

export interface OrderItem {
  id: string;
  inventory_item_id?: string | null;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderDetails {
  id: string;
  order_number: string;
  created_at: string;
  items: OrderItem[];
  total: number;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  currentOrder?: string;
  reservedFor?: string;
  orderDetails?: OrderDetails;
}

interface TablesProps {
  onSectionChange?: (section: string) => void;
}

export const Tables = ({ onSectionChange }: TablesProps) => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<TableStatus | "all">("all");
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const { setTable, setItems } = useCart();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user) {
      fetchTables();
    }
  }, [user?.id, currentLocation]);

  // Setup realtime subscription for table updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("table-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchTables = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from("restaurant_tables")
        .select("*")
        .eq("user_id", user.id);

      if (currentLocation) {
        // Include tables with this location OR no location set (backward compatibility)
        query = query.or(`location_id.eq.${currentLocation.id},location_id.is.null`);
      }

      const { data, error } = await query.order("table_number");

      if (error) throw error;

      // Fetch order details for occupied tables
      const tablesWithOrders = await Promise.all(
        (data || []).map(async (table) => {
          let orderDetails: OrderDetails | undefined;

          if (table.status === "occupied" && table.current_order_id) {
            const { data: orderData } = await supabase
              .from("orders")
              .select("id, order_number, created_at, total")
              .eq("id", table.current_order_id)
              .single();

            if (orderData) {
              const { data: itemsData } = await supabase
                .from("order_items")
                .select("id, inventory_item_id, name, quantity, price")
                .eq("order_id", orderData.id);

              orderDetails = {
                ...orderData,
                items: itemsData || [],
              };
            }
          }

          return {
            id: table.id,
            number: table.table_number,
            capacity: table.capacity,
            status: table.status as TableStatus,
            currentOrder: table.current_order_id || undefined,
            section: table.section,
            tableData: table,
            orderDetails,
          };
        })
      );

      setTables(tablesWithOrders);
    } catch (error) {
      console.error("Error fetching tables:", error);
      toast({
        title: "Error",
        description: "Failed to load tables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (table: any) => {
    setEditingTable(table.tableData);
    setDialogOpen(true);
  };

  const handleDelete = async (tableId: string) => {
    if (!confirm("Are you sure you want to delete this table?")) return;

    try {
      const { error } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", tableId);

      if (error) throw error;
      sonnerToast.success("Table deleted successfully");
      fetchTables();
    } catch (error) {
      console.error("Error deleting table:", error);
      sonnerToast.error("Failed to delete table");
    }
  };

  const handleSelectTableForOrder = (table: Table) => {
    // Set the table in cart context
    setTable({
      id: table.id,
      number: table.number,
      capacity: table.capacity,
    });
    
    // Navigate to products to add items
    if (onSectionChange) {
      onSectionChange("products");
    } else {
      navigate("/?section=products");
    }
    
    sonnerToast.success(`Table ${table.number} selected`, {
      description: "Add items to this table's order"
    });
  };

  const handleSettleBill = (table: Table) => {
    if (table.orderDetails) {
      // Load the order items into the cart first
      const cartItems = table.orderDetails.items.map((item) => ({
        id: item.inventory_item_id || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));
      setItems(cartItems);

      // Set the table in cart context with existing order
      setTable({
        id: table.id,
        number: table.number,
        capacity: table.capacity,
      });

      // Small delay to ensure state updates before navigation
      setTimeout(() => {
        navigate(`/?section=payment&settleTableId=${table.id}`);

        sonnerToast.success(`Settling Table ${table.number}`, {
          description: `Total: ${formatCurrency(table.orderDetails!.total)}`,
        });
      }, 50);
    }
  };

  const filteredTables = tables.filter((table) => {
    if (filterStatus === "all") return true;
    return table.status === filterStatus;
  });

  const stats = {
    total: tables.length,
    available: tables.filter((t) => t.status === "available").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    reserved: tables.filter((t) => t.status === "reserved").length,
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Restaurant Tables"
        description={`${stats.available} available • ${stats.occupied} occupied • ${stats.reserved} reserved`}
        rightContent={<LayoutGrid className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            <TableFilters filterStatus={filterStatus} onFilterChange={setFilterStatus} />
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/20">
            <Plus className="w-4 h-4" />
            Add Table
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onEdit={() => handleEdit(table)}
              onDelete={() => handleDelete(table.id)}
              onSelectForOrder={() => handleSelectTableForOrder(table)}
              onSettleBill={() => handleSettleBill(table)}
            />
          ))}
        </div>

        {filteredTables.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              {tables.length === 0 ? "No tables created yet. Add your first table!" : "No tables match the filter"}
            </p>
          </div>
        )}
      </div>

      <NewTableDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTable(null);
        }}
        onSuccess={() => {
          fetchTables();
          setDialogOpen(false);
          setEditingTable(null);
        }}
        editingTable={editingTable}
      />
    </div>
  );
};

import { useState } from "react";
import { CheckSquare, Square, Printer, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatus } from "@/pages/Orders";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrderBulkActionsProps {
  selectedOrders: string[];
  onSelectionChange: (ids: string[]) => void;
  allOrderIds: string[];
  onRefresh: () => void;
}

export const OrderBulkActions = ({
  selectedOrders,
  onSelectionChange,
  allOrderIds,
  onRefresh,
}: OrderBulkActionsProps) => {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const { toast } = useToast();

  const isAllSelected = selectedOrders.length === allOrderIds.length && allOrderIds.length > 0;
  const isSomeSelected = selectedOrders.length > 0;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allOrderIds);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!newStatus || selectedOrders.length === 0) return;

    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .in("id", selectedOrders);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedOrders.length} orders to ${newStatus}`,
      });
      
      onSelectionChange([]);
      setNewStatus("");
      onRefresh();
    } catch (error) {
      console.error("Error updating orders:", error);
      toast({
        title: "Error",
        description: "Failed to update orders",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return;

    try {
      setUpdating(true);
      
      // First delete order items
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .in("order_id", selectedOrders);

      if (itemsError) throw itemsError;

      // Then delete orders
      const { error } = await supabase
        .from("orders")
        .delete()
        .in("id", selectedOrders);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedOrders.length} orders`,
      });
      
      onSelectionChange([]);
      onRefresh();
    } catch (error) {
      console.error("Error deleting orders:", error);
      toast({
        title: "Error",
        description: "Failed to delete orders",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    toast({
      title: "Print",
      description: `Printing ${selectedOrders.length} orders...`,
    });
    // Print functionality would go here
  };

  if (!isSomeSelected) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          Select All
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in-0">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSelectAll}
        className="gap-2"
      >
        {isAllSelected ? (
          <CheckSquare className="h-4 w-4 text-primary" />
        ) : (
          <Square className="h-4 w-4" />
        )}
        {selectedOrders.length} selected
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      <Select value={newStatus} onValueChange={setNewStatus}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Change status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="processing">Processing</SelectItem>
          <SelectItem value="ready">Ready</SelectItem>
          <SelectItem value="served">Served</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      {newStatus && (
        <Button
          size="sm"
          onClick={handleBulkStatusUpdate}
          disabled={updating}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          Apply
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="gap-2"
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedOrders.length} order(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={updating}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSelectionChange([])}
      >
        Clear
      </Button>
    </div>
  );
};

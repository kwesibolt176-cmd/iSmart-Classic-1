import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { toast } from "sonner";

interface NewTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingTable?: any;
}

export const NewTableDialog = ({ open, onOpenChange, onSuccess, editingTable }: NewTableDialogProps) => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    table_number: "",
    capacity: "",
    section: "",
    status: "available",
  });

  useEffect(() => {
    if (editingTable) {
      setFormData({
        table_number: editingTable.table_number?.toString() || "",
        capacity: editingTable.capacity?.toString() || "",
        section: editingTable.section || "",
        status: editingTable.status || "available",
      });
    } else {
      setFormData({
        table_number: "",
        capacity: "",
        section: "",
        status: "available",
      });
    }
  }, [editingTable, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tableData = {
        user_id: user!.id,
        table_number: parseInt(formData.table_number),
        capacity: parseInt(formData.capacity),
        section: formData.section || null,
        status: formData.status,
        location_id: currentLocation?.id || null,
      };

      if (editingTable) {
        const { error } = await supabase
          .from("restaurant_tables")
          .update(tableData)
          .eq("id", editingTable.id);

        if (error) throw error;
        toast.success("Table updated successfully");
      } else {
        // Check if table number already exists
        const { data: existing } = await supabase
          .from("restaurant_tables")
          .select("id")
          .eq("user_id", user!.id)
          .eq("table_number", parseInt(formData.table_number))
          .maybeSingle();

        if (existing) {
          toast.error(`Table #${formData.table_number} already exists`);
          setLoading(false);
          return;
        }

        const { error } = await supabase.from("restaurant_tables").insert(tableData);

        if (error) throw error;
        toast.success("Table created successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving table:", error);
      toast.error("Failed to save table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTable ? "Edit Table" : "Create New Table"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table_number">Table Number *</Label>
            <Input
              id="table_number"
              type="number"
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
              placeholder="e.g., 1, 2, 3..."
              min="1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (People) *</Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="e.g., 2, 4, 6..."
              min="1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">Section (Optional)</Label>
            <Input
              id="section"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder="e.g., Outdoor, VIP, Main Hall"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : editingTable ? "Update Table" : "Create Table"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

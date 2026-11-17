import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { Package, MapPin, Plus, Search, RefreshCw, Check, X } from "lucide-react";
import { MobileTableWrapper } from "./MobileTableWrapper";
import { useCurrency } from "@/hooks/use-currency";

interface Location {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string | null;
}

interface BranchAssignment {
  id: string;
  inventory_item_id: string;
  location_id: string;
  assigned_quantity: number;
  is_active: boolean;
  inventory_items?: InventoryItem;
}

export const BranchInventoryManager = () => {
  const { user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [assignments, setAssignments] = useState<BranchAssignment[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [assignQuantities, setAssignQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedLocation) {
      fetchAssignments();
    }
  }, [selectedLocation]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [locationsRes, itemsRes] = await Promise.all([
        supabase
          .from("locations")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("inventory_items")
          .select("id, name, price, quantity, sku")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("name"),
      ]);

      if (locationsRes.error) throw locationsRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setLocations(locationsRes.data || []);
      setInventoryItems(itemsRes.data || []);

      if (locationsRes.data && locationsRes.data.length > 0 && !selectedLocation) {
        setSelectedLocation(locationsRes.data[0].id);
      }
    } catch (error: any) {
      toast.error("Failed to load data", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedLocation) return;

    try {
      const { data, error } = await supabase
        .from("branch_inventory_assignments")
        .select("*, inventory_items(id, name, price, quantity, sku)")
        .eq("location_id", selectedLocation);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      toast.error("Failed to load assignments", { description: error.message });
    }
  };

  const handleAssignItems = async () => {
    if (!user || !selectedLocation || selectedItems.length === 0) return;

    try {
      const assignmentsToInsert = selectedItems.map((itemId) => ({
        inventory_item_id: itemId,
        location_id: selectedLocation,
        assigned_quantity: assignQuantities[itemId] || 0,
        assigned_by: user.id,
        is_active: true,
      }));

      const { error } = await supabase
        .from("branch_inventory_assignments")
        .upsert(assignmentsToInsert, {
          onConflict: "inventory_item_id,location_id",
        });

      if (error) throw error;

      toast.success("Items assigned to branch successfully");
      setAssignDialogOpen(false);
      setSelectedItems([]);
      setAssignQuantities({});
      fetchAssignments();
    } catch (error: any) {
      toast.error("Failed to assign items", { description: error.message });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("branch_inventory_assignments")
        .update({ is_active: false })
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Item removed from branch");
      fetchAssignments();
    } catch (error: any) {
      toast.error("Failed to remove assignment", { description: error.message });
    }
  };

  const handleUpdateQuantity = async (assignmentId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from("branch_inventory_assignments")
        .update({ assigned_quantity: quantity })
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Quantity updated");
      fetchAssignments();
    } catch (error: any) {
      toast.error("Failed to update quantity", { description: error.message });
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const assignedItemIds = assignments.filter(a => a.is_active).map((a) => a.inventory_item_id);
  const unassignedItems = inventoryItems.filter(
    (item) => !assignedItemIds.includes(item.id)
  );

  const filteredUnassignedItems = unassignedItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAssignments = assignments.filter((a) => a.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Branch Inventory</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Assign products to specific branches/locations
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Assign Products</span>
                <span className="sm:hidden">Assign</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Products to Branch</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {filteredUnassignedItems.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No unassigned products found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Assign Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUnassignedItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.includes(item.id)}
                                onCheckedChange={() => toggleItemSelection(item.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.sku || "-"}</TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={item.quantity}
                                className="w-20"
                                value={assignQuantities[item.id] || ""}
                                onChange={(e) =>
                                  setAssignQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: parseInt(e.target.value) || 0,
                                  }))
                                }
                                disabled={!selectedItems.includes(item.id)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedItems.length} products selected
                  </p>
                  <Button
                    onClick={handleAssignItems}
                    disabled={selectedItems.length === 0}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Assign Selected
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Products Assigned to{" "}
            {locations.find((l) => l.id === selectedLocation)?.name || "Branch"}
            <Badge variant="secondary" className="ml-2">
              {activeAssignments.length} products
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAssignments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No products assigned to this branch yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setAssignDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Assign Products
              </Button>
            </div>
          ) : (
            <MobileTableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="hidden sm:table-cell">Stock</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium text-sm">
                        {assignment.inventory_items?.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{assignment.inventory_items?.sku || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(assignment.inventory_items?.price || 0)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{assignment.inventory_items?.quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="w-16 sm:w-24"
                          defaultValue={assignment.assigned_quantity}
                          onBlur={(e) =>
                            handleUpdateQuantity(
                              assignment.id,
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </MobileTableWrapper>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
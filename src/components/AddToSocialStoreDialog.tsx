import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Search, Plus } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string | null;
  description: string | null;
  image_url: string | null;
}

interface AddToSocialStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: () => void;
}

export const AddToSocialStoreDialog = ({
  open,
  onOpenChange,
  onProductAdded,
}: AddToSocialStoreDialogProps) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(true);
  const [customPrice, setCustomPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useBusiness();
  const { toast } = useToast();

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleBulkAddToStore = async () => {
    if (!user || selectedItems.size === 0) return;

    setSubmitting(true);
    try {
      const itemIds = Array.from(selectedItems);
      const { error } = await supabase
        .from("inventory_items")
        .update({ show_on_storefront: true })
        .in("id", itemIds);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${selectedItems.size} products added to your store`,
      });

      onProductAdded();
      setSelectedItems(new Set());
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding products:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add products to store",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchInventoryItems();
    }
  }, [open, user]);

  const fetchInventoryItems = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch items NOT already on storefront
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, price, quantity, sku, description, image_url")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("show_on_storefront", false)
        .order("name");

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleAddToStore = async () => {
    if (!user || !selectedItem) return;

    setSubmitting(true);
    try {
      const updateData: Record<string, any> = {
        show_on_storefront: isActive,
      };

      // Only update description if provided
      if (description) {
        updateData.description = description;
      }

      // Only update image_url if provided
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }

      // Update price if different
      if (customPrice && parseFloat(customPrice) !== selectedItem.price) {
        updateData.price = parseFloat(customPrice);
      }

      const { error } = await supabase
        .from("inventory_items")
        .update(updateData)
        .eq("id", selectedItem.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Product added to your store",
      });

      onProductAdded();
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add product to store",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedItem(null);
    setIsActive(true);
    setCustomPrice("");
    setDescription("");
    setImageUrl("");
    setSearch("");
  };

  const filteredItems = inventoryItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product to Store</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {!selectedItem ? (
            <>
              {/* Search and Select Product */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-muted-foreground">
                    Select from your inventory
                  </Label>
                  {filteredItems.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-7 text-xs"
                    >
                      {selectedItems.size === filteredItems.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                </div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search inventory..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                    {filteredItems.map((item) => {
                      const isSelected = selectedItems.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItemSelection(item.id)}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left group ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted group-hover:bg-primary/10'
                            }`}>
                              {isSelected ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <Package className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.price.toFixed(2)}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Stock: {item.quantity}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {search ? "No products found" : "No inventory items available"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add products in the Products page first
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Configure Selected Product */}
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Selected Product</p>
                  <p className="font-semibold text-lg">{selectedItem.name}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedItem(null)}
                    className="mt-2"
                  >
                    Change Product
                  </Button>
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    type="text"
                    placeholder="Add a description for your customers..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="price">Store Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Original price: GH₵{selectedItem.price.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="active" className="font-medium">
                      Active in Store
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Make this product visible to customers
                    </p>
                  </div>
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              setSelectedItems(new Set());
              onOpenChange(false);
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          {selectedItem ? (
            <Button
              onClick={handleAddToStore}
              disabled={submitting || !customPrice}
              className="flex-1 gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add to Store
            </Button>
          ) : selectedItems.size > 0 && (
            <Button
              onClick={handleBulkAddToStore}
              disabled={submitting}
              className="flex-1 gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add {selectedItems.size} Products
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

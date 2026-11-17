import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { toast } from "sonner";

interface Variant {
  id: string;
  variant_name: string;
  sku: string | null;
  attributes: Record<string, string>;
  price_adjustment: number;
  quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
}

interface VariantFormData {
  variant_name: string;
  sku: string;
  size: string;
  color: string;
  price_adjustment: string;
  quantity: string;
  low_stock_threshold: string;
}

interface ProductVariantsManagerProps {
  inventoryItemId: string;
  basePrice: number;
  onVariantsChange?: () => void;
}

export const ProductVariantsManager = ({ 
  inventoryItemId, 
  basePrice,
  onVariantsChange 
}: ProductVariantsManagerProps) => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VariantFormData>({
    variant_name: "",
    sku: "",
    size: "",
    color: "",
    price_adjustment: "0",
    quantity: "0",
    low_stock_threshold: "10",
  });

  useEffect(() => {
    fetchVariants();
  }, [inventoryItemId]);

  const fetchVariants = async () => {
    try {
      let query = supabase
        .from("product_variants")
        .select("*")
        .eq("inventory_item_id", inventoryItemId)
        .eq("is_active", true)
        .order("variant_name");

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVariants((data || []).map(v => ({
        ...v,
        attributes: (v.attributes as Record<string, string>) || {}
      })));
    } catch (error) {
      console.error("Error fetching variants:", error);
      toast.error("Failed to load variants");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      variant_name: "",
      sku: "",
      size: "",
      color: "",
      price_adjustment: "0",
      quantity: "0",
      low_stock_threshold: "10",
    });
    setEditingId(null);
  };

  const handleEdit = (variant: Variant) => {
    setFormData({
      variant_name: variant.variant_name,
      sku: variant.sku || "",
      size: variant.attributes.size || "",
      color: variant.attributes.color || "",
      price_adjustment: variant.price_adjustment.toString(),
      quantity: variant.quantity.toString(),
      low_stock_threshold: variant.low_stock_threshold.toString(),
    });
    setEditingId(variant.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const attributes: Record<string, string> = {};
      if (formData.size) attributes.size = formData.size;
      if (formData.color) attributes.color = formData.color;

      const variantData = {
        user_id: user.id,
        inventory_item_id: inventoryItemId,
        location_id: currentLocation?.id || null,
        variant_name: formData.variant_name,
        sku: formData.sku || null,
        attributes,
        price_adjustment: parseFloat(formData.price_adjustment) || 0,
        quantity: parseInt(formData.quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
      };

      if (editingId) {
        const { error } = await supabase
          .from("product_variants")
          .update(variantData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Variant updated");
      } else {
        const { error } = await supabase
          .from("product_variants")
          .insert(variantData);

        if (error) throw error;
        toast.success("Variant created");

        // Enable has_variants flag on parent item
        await supabase
          .from("inventory_items")
          .update({ has_variants: true })
          .eq("id", inventoryItemId);
      }

      await fetchVariants();
      setDialogOpen(false);
      resetForm();
      onVariantsChange?.();
    } catch (error) {
      console.error("Error saving variant:", error);
      toast.error("Failed to save variant");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this variant?")) return;

    try {
      const { error } = await supabase
        .from("product_variants")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Variant deleted");
      await fetchVariants();
      
      // Check if there are any active variants left
      const activeVariants = variants.filter(v => v.id !== id && v.is_active);
      if (activeVariants.length === 0) {
        await supabase
          .from("inventory_items")
          .update({ has_variants: false })
          .eq("id", inventoryItemId);
      }
      
      onVariantsChange?.();
    } catch (error) {
      console.error("Error deleting variant:", error);
      toast.error("Failed to delete variant");
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading variants...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Variants
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Variant" : "Add New Variant"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="variant_name">Variant Name *</Label>
                  <Input
                    id="variant_name"
                    value={formData.variant_name}
                    onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                    placeholder="e.g., Small - Red"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Input
                      id="size"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      placeholder="S, M, L, XL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="Red, Blue"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="VAR-001"
                  />
                </div>
                <div>
                  <Label htmlFor="price_adjustment">
                    Price Adjustment (GH₵)
                    <span className="text-xs text-muted-foreground ml-2">
                      Base: GH₵{basePrice.toFixed(2)}
                    </span>
                  </Label>
                  <Input
                    id="price_adjustment"
                    type="number"
                    step="0.01"
                    value={formData.price_adjustment}
                    onChange={(e) => setFormData({ ...formData, price_adjustment: e.target.value })}
                    placeholder="0.00"
                  />
                  {formData.price_adjustment && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Final Price: GH₵{(basePrice + parseFloat(formData.price_adjustment || "0")).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="low_stock_threshold">Alert Threshold</Label>
                    <Input
                      id="low_stock_threshold"
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingId ? "Update" : "Create"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No variants created yet. Click "Add Variant" to create one.
          </p>
        ) : (
          <div className="space-y-2">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{variant.variant_name}</span>
                    {variant.attributes.size && (
                      <Badge variant="outline" className="text-xs">
                        {variant.attributes.size}
                      </Badge>
                    )}
                    {variant.attributes.color && (
                      <Badge variant="outline" className="text-xs">
                        {variant.attributes.color}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Qty: {variant.quantity}</span>
                    <span>
                      GH₵{(basePrice + variant.price_adjustment).toFixed(2)}
                      {variant.price_adjustment !== 0 && (
                        <span className="text-xs ml-1">
                          ({variant.price_adjustment > 0 ? "+" : ""}
                          {variant.price_adjustment.toFixed(2)})
                        </span>
                      )}
                    </span>
                    {variant.sku && <span>SKU: {variant.sku}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(variant)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(variant.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

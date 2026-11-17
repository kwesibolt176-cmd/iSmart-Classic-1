import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { ProductImageUpload } from "./ProductImageUpload";
import { Loader2, Package, TrendingUp, AlertTriangle, Plus, Minus, BarChart } from "lucide-react";
import { Trash2 } from "lucide-react";
import { getIndustryConfig, isFoodIndustry } from "@/lib/industry-config";

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    sku?: string | null;
    category_id?: string | null;
    subcategory_id?: string | null;
    quantity: number;
    price: number;
    cost?: number | null;
    low_stock_threshold: number;
    bnpl_enabled: boolean;
    image_url?: string | null;
    is_active: boolean;
    show_on_storefront?: boolean;
    track_inventory?: boolean;
  } | null;
  onProductUpdated?: () => void;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

export const EditProductDialog = ({ open, onOpenChange, product, onProductUpdated }: EditProductDialogProps) => {
  const { user, profile } = useBusiness();
  const { toast } = useToast();
  
  const industryConfig = useMemo(() => getIndustryConfig(profile?.industry), [profile?.industry]);
  const isFood = useMemo(() => isFoodIndustry(profile?.industry), [profile?.industry]);
  const showStockToggle = isFood || !industryConfig.trackStock;

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: "",
    subcategory_id: "",
    quantity: 0,
    stockAdjustment: 0,
    adjustmentType: "set" as "set" | "add" | "subtract",
    price: "",
    cost: "",
    lowStockThreshold: "",
    bnplEnabled: false,
    imageUrl: "",
    isActive: true,
    showOnStorefront: false,
    trackInventory: true,
  });

  // Initialize form when product changes
  useEffect(() => {
    if (product && open) {
      setFormData({
        name: product.name,
        sku: product.sku || "",
        category_id: product.category_id || "",
        subcategory_id: product.subcategory_id || "",
        quantity: product.quantity,
        stockAdjustment: 0,
        adjustmentType: "set",
        price: product.price.toString(),
        cost: product.cost?.toString() || "",
        lowStockThreshold: product.low_stock_threshold.toString(),
        bnplEnabled: product.bnpl_enabled,
        imageUrl: product.image_url || "",
        isActive: product.is_active,
        showOnStorefront: product.show_on_storefront || false,
        trackInventory: product.track_inventory !== false,
      });
      fetchCategories();
      fetchSubcategories();
    }
  }, [product, open]);

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("display_order");
    setCategories(data || []);
  };

  const fetchSubcategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("subcategories")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("display_order");
    setSubcategories(data || []);
  };

  const filteredSubcategories = subcategories.filter(
    (sub) => sub.category_id === formData.category_id
  );

  const calculateNewQuantity = (): number => {
    if (!formData.trackInventory) return 999999;
    
    switch (formData.adjustmentType) {
      case "set":
        return formData.stockAdjustment;
      case "add":
        return formData.quantity + formData.stockAdjustment;
      case "subtract":
        return Math.max(0, formData.quantity - formData.stockAdjustment);
      default:
        return formData.quantity;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;

    setLoading(true);
    try {
      const newQuantity = calculateNewQuantity();
      const quantityChanged = newQuantity !== product.quantity;

      const { error } = await supabase
        .from("inventory_items")
        .update({
          name: formData.name,
          sku: formData.sku || null,
          category_id: formData.category_id || null,
          subcategory_id: formData.subcategory_id || null,
          quantity: newQuantity,
          price: parseFloat(formData.price) || 0,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          low_stock_threshold: parseInt(formData.lowStockThreshold) || 10,
          bnpl_enabled: formData.bnplEnabled,
          image_url: formData.imageUrl || null,
          is_active: formData.isActive,
          show_on_storefront: formData.showOnStorefront,
          track_inventory: formData.trackInventory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) throw error;

      // Log stock adjustment to inventory history
      if (quantityChanged) {
        await supabase.from("inventory_history").insert({
          user_id: user.id,
          inventory_item_id: product.id,
          action: "stock_adjustment",
          quantity_before: product.quantity,
          quantity_after: newQuantity,
          reason: `Stock ${formData.adjustmentType === "add" ? "restocked" : formData.adjustmentType === "subtract" ? "reduced" : "set"} via edit dialog`,
          changed_by: user.id,
        });
      }

      toast({
        title: "Success",
        description: quantityChanged 
          ? `${industryConfig.productLabel} updated and stock adjusted to ${newQuantity}`
          : `${industryConfig.productLabel} updated successfully`,
      });

      onProductUpdated?.();
      onOpenChange(false);
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

  const handleDelete = async () => {
    if (!user || !product || !window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", product.id)
      .eq("user_id", user.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Could not delete product", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${industryConfig.productLabel} deleted` });
    onProductUpdated?.();
    onOpenChange(false);
  };

  if (!product) return null;

  const isOutOfStock = product.quantity <= 0;
  const isLowStock = product.quantity > 0 && product.quantity <= product.low_stock_threshold;
  const newQuantity = calculateNewQuantity();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit {industryConfig.productLabel}
            {isOutOfStock && (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
            {isLowStock && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                Low Stock
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Update details, pricing, or restock inventory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stock Adjustment Section - Prominent for restocking */}
          {formData.trackInventory && (
            <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Stock Management</Label>
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current:</span>
                  <Badge variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"}>
                    {product.quantity} units
                  </Badge>
                </div>
                
                {formData.stockAdjustment !== 0 || formData.adjustmentType === "set" ? (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm">New:</span>
                    <Badge className="bg-primary text-primary-foreground">
                      {newQuantity} units
                    </Badge>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <Select
                    value={formData.adjustmentType}
                    onValueChange={(value: "set" | "add" | "subtract") => 
                      setFormData({ ...formData, adjustmentType: value, stockAdjustment: 0 })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add"><Plus className="w-4 h-4 inline-block mr-2 -mt-0.5" /> Add Stock (Restock)</SelectItem>
                      <SelectItem value="subtract"><Minus className="w-4 h-4 inline-block mr-2 -mt-0.5" /> Remove Stock</SelectItem>
                      <SelectItem value="set"><BarChart className="w-4 h-4 inline-block mr-2 -mt-0.5" /> Set Exact Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>
                    {formData.adjustmentType === "set" ? "New Quantity" : "Amount"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.stockAdjustment}
                    onChange={(e) => setFormData({ ...formData, stockAdjustment: parseInt(e.target.value) || 0 })}
                    placeholder={formData.adjustmentType === "set" ? "Enter new stock level" : "Enter amount"}
                  />
                </div>
              </div>

              {isOutOfStock && formData.adjustmentType === "add" && formData.stockAdjustment > 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 p-2 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                  This item will be back in stock after saving!
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{industryConfig.productLabel} Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value, subcategory_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.category_id && filteredSubcategories.length > 0 && (
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select
                  value={formData.subcategory_id}
                  onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost Price</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Low Stock Threshold */}
          {formData.trackInventory && (
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
              />
            </div>
          )}

          {/* Image */}
          <div className="space-y-2">
            <Label>Product Image</Label>
            <ProductImageUpload
              currentImageUrl={formData.imageUrl}
              onImageUploaded={(url) => setFormData({ ...formData, imageUrl: url })}
              disabled={loading}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {showStockToggle && (
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Track Inventory</Label>
                  <p className="text-xs text-muted-foreground">Monitor stock levels</p>
                </div>
                <Switch
                  checked={formData.trackInventory}
                  onCheckedChange={(checked) => setFormData({ ...formData, trackInventory: checked })}
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Show in POS menu</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Show on Storefront</Label>
                <p className="text-xs text-muted-foreground">Available in online store</p>
              </div>
              <Switch
                checked={formData.showOnStorefront}
                onCheckedChange={(checked) => setFormData({ ...formData, showOnStorefront: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Buy Now, Pay Later</Label>
                <p className="text-xs text-muted-foreground">Allow credit purchases</p>
              </div>
              <Switch
                checked={formData.bnplEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, bnplEnabled: checked })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading || deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || deleting}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

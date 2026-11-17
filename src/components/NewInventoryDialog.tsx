import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/function-errors";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { ImageGenerationButton } from "./ImageGenerationButton";
import { ProductImageUpload } from "./ProductImageUpload";
import { Loader2, Plus, Bot } from "lucide-react";
import { DynamicIcon } from "./DynamicIcon";
import { toast as sonnerToast } from "sonner";
import { getIndustryConfig, isFoodIndustry } from "@/lib/industry-config";

interface NewInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInventoryAdded?: () => void;
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

export const NewInventoryDialog = ({ open, onOpenChange, onInventoryAdded }: NewInventoryDialogProps) => {
  const { user, profile } = useBusiness();
  const { currentLocation } = useLocation();
  const { toast } = useToast();
  
  // Industry-specific config
  const industryConfig = useMemo(() => getIndustryConfig(profile?.industry), [profile?.industry]);
  const isFood = useMemo(() => isFoodIndustry(profile?.industry), [profile?.industry]);
  const showStockToggle = isFood || !industryConfig.trackStock;
  const [loading, setLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: "",
    subcategory_id: "",
    quantity: "",
    price: "",
    cost: "",
    lowStockThreshold: "",
    bnplEnabled: false,
    imageUrl: "",
    trackInventory: true,
  });

  useEffect(() => {
    if (open && user) {
      fetchCategories();
      fetchSubcategories();
    }
  }, [open, user]);

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

  const handleCreateCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    
    setCreatingCategory(true);
    try {
      const { data, error } = await supabase.from("categories").insert({
        user_id: user.id,
        name: newCategoryName.trim(),
        is_active: true,
        display_order: categories.length,
      }).select().single();

      if (error) throw error;

      setCategories([...categories, data]);
      setFormData({ ...formData, category_id: data.id });
      setNewCategoryName("");
      setShowNewCategory(false);
      toast({
        title: "Category created",
        description: `"${data.name}" has been added`,
      });
    } catch (error: any) {
      toast({
        title: "Error creating category",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingCategory(false);
    }
  };

  const analyzeAndFillForm = async (imageUrl: string) => {
    if (!imageUrl.trim()) return;

    setAnalyzingImage(true);
    try {
      const categoryNames = categories.map(c => c.name);
      const { data, error } = await supabase.functions.invoke('analyze-product-image', {
        body: { 
          imageUrl, 
          mode: "categorize",
          categories: categoryNames 
        }
      });

      if (error) throw error;

      if (data?.analysis) {
        const analysis = typeof data.analysis === 'string' 
          ? JSON.parse(data.analysis) 
          : data.analysis;

        // Auto-fill product name — only if the user hasn't already typed one
        if (analysis.productName) {
          setFormData(prev =>
            prev.name.trim() ? prev : { ...prev, name: analysis.productName }
          );
        }

        // Auto-select matching category — only if the user hasn't already picked one
        if (analysis.category) {
          const matchedCategory = categories.find(
            c => c.name.toLowerCase() === analysis.category.toLowerCase()
          );
          if (matchedCategory) {
            setFormData(prev =>
              prev.category_id ? prev : { ...prev, category_id: matchedCategory.id }
            );
          }
        }

        // Auto-fill description if available
        if (analysis.description) {
          // Store description for display (you might want to add a description field)
          sonnerToast.success("Product analyzed", {
            description: analysis.description
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      const failure = error as { invokeError?: unknown; data?: unknown };
      sonnerToast.error(await functionErrorMessage(failure.invokeError ?? error, failure.data, "Failed to analyze image"));
    } finally {
      setAnalyzingImage(false);
    }
  };

  useEffect(() => {
    if (formData.imageUrl && categories.length > 0) {
      const timeoutId = setTimeout(() => {
        analyzeAndFillForm(formData.imageUrl);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.imageUrl, categories.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("inventory_items").insert({
        user_id: user.id,
        location_id: currentLocation?.id || null,
        name: formData.name,
        sku: formData.sku || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        // Validate inventory item IDs and set quantity based on tracking
        quantity: showStockToggle && !formData.trackInventory ? 999999 : (parseInt(formData.quantity) || 0),
        price: parseFloat(formData.price) || 0,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        low_stock_threshold: parseInt(formData.lowStockThreshold) || 10,
        bnpl_enabled: formData.bnplEnabled,
        image_url: formData.imageUrl || null,
        track_inventory: showStockToggle ? formData.trackInventory : true,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${industryConfig.productLabel} added successfully`,
      });

      onInventoryAdded?.();
      onOpenChange(false);
      setFormData({
        name: "",
        sku: "",
        category_id: "",
        subcategory_id: "",
        quantity: "",
        price: "",
        cost: "",
        lowStockThreshold: "",
        bnplEnabled: false,
        imageUrl: "",
        trackInventory: true,
      });
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

  const handleImageUrlChange = (url: string) => {
    setFormData({ ...formData, imageUrl: url });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {industryConfig.productLabel}</DialogTitle>
          <DialogDescription>
            Add a new {industryConfig.productLabel.toLowerCase()} with details and pricing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{industryConfig.productLabel} Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isFood ? "e.g., Jollof Rice" : "e.g., Product name"}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Optional)</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., SKU-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              {showNewCategory ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="New category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    disabled={creatingCategory}
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleCreateCategory}
                    disabled={creatingCategory || !newCategoryName.trim()}
                  >
                    {creatingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setShowNewCategory(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value, subcategory_id: "" })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <span className="flex items-center gap-2">
                            {category.icon && <DynamicIcon name={category.icon} className="w-4 h-4 shrink-0" />}
                            {category.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline"
                    onClick={() => setShowNewCategory(true)}
                    title="Add new category"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {formData.category_id && filteredSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subcategory_id">Subcategory (Optional)</Label>
              <Select
                value={formData.subcategory_id}
                onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stock tracking toggle for applicable industries */}
          {showStockToggle && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <Label htmlFor="trackInventory" className="text-base">Track Stock Quantity</Label>
                <p className="text-sm text-muted-foreground">
                  {isFood 
                    ? "Enable for items with fixed quantities. Disable for dishes that use ingredients."
                    : "Enable to track inventory levels for this item."}
                </p>
              </div>
              <Switch
                id="trackInventory"
                checked={formData.trackInventory}
                onCheckedChange={(checked) => setFormData({ ...formData, trackInventory: checked })}
              />
            </div>
          )}

          {/* Only show stock fields if tracking inventory */}
          {(!showStockToggle || formData.trackInventory) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Current Stock</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  required={!showStockToggle || formData.trackInventory}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Alert</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost Price (Optional)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product Image</Label>
            <ProductImageUpload
              currentImageUrl={formData.imageUrl}
              onImageUploaded={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
              disabled={loading || analyzingImage}
            />
            {analyzingImage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <Bot className="w-4 h-4" /> AI analyzing image...
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Or paste image URL</Label>
            <Input
              id="imageUrl"
              placeholder="https://example.com/image.jpg"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              disabled={analyzingImage}
            />
          </div>

          <ImageGenerationButton
            productName={formData.name}
            onImageGenerated={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
            disabled={loading || analyzingImage}
          />

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="space-y-0.5">
              <Label htmlFor="bnpl" className="text-base">Enable Buy Now, Pay Later (BNPL)</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to purchase this item on credit
              </p>
            </div>
            <Switch
              id="bnpl"
              checked={formData.bnplEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, bnplEnabled: checked })}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

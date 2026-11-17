import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { ImageGenerationButton } from "./ImageGenerationButton";
import { ProductImageUpload } from "./ProductImageUpload";
import { ImagePolishButton } from "./ImagePolishButton";

interface NewProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: () => void;
}

export const NewProductDialog = ({ open, onOpenChange, onProductCreated }: NewProductDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const { user } = useBusiness();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!user || !name || !price) return;

    setLoading(true);
    try {
      // Create product in inventory_items with show_on_storefront enabled
      const { error } = await supabase.from("inventory_items").insert({
        user_id: user.id,
        name,
        description: description || null,
        price: parseFloat(price),
        quantity: stockQuantity ? parseInt(stockQuantity) : 0,
        image_url: imageUrl || null,
        is_active: isActive,
        show_on_storefront: true,
        track_inventory: !!stockQuantity,
      });

      if (error) throw error;

      toast({
        title: "Product created",
        description: "Your product is now available in your store",
      });

      onProductCreated();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast({
        title: "Error",
        description: error.message?.includes("unique constraint")
          ? "A product with this name already exists"
          : "Failed to create product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setStockQuantity("");
    setImageUrl("");
    setIsActive(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Create a new product to share on social media and accept orders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Premium Coffee Beans"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (GH₵) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product Image</Label>
            <ProductImageUpload
              currentImageUrl={imageUrl}
              onImageUploaded={setImageUrl}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Or paste image URL</Label>
            <Input
              id="image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ImageGenerationButton
              productName={name}
              description={description}
              onImageGenerated={setImageUrl}
              disabled={loading}
            />
            <ImagePolishButton
              imageUrl={imageUrl}
              onImagePolished={setImageUrl}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !name || !price}
          >
            {loading ? "Creating..." : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
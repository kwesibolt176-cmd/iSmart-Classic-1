import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { useCurrency } from "@/hooks/use-currency";
import { ProductReviewsDisplay } from "@/components/storefront/ProductReviewsDisplay";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  quantity: number;
}

interface ProductDetailsDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (quantity: number) => void;
  userId?: string;
}

export const ProductDetailsDialog = ({
  product,
  open,
  onOpenChange,
  onAddToCart,
  userId,
}: ProductDetailsDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const { format: formatCurrency } = useCurrency();

  if (!product) return null;

  const isOutOfStock = product.quantity === 0;
  const maxQuantity = product.quantity || 1;

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(quantity);
    setQuantity(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Image */}
          {product.image_url ? (
            <div className="aspect-square rounded-xl overflow-hidden bg-muted">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <ShoppingCart className="w-24 h-24 text-muted-foreground" />
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          )}

          {/* Price & Stock */}
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(product.price)}
            </p>
            
            {isOutOfStock && (
              <Badge variant="destructive" className="text-base px-4 py-1">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Quantity Selector & Add to Cart */}
          {!isOutOfStock && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-semibold">Quantity:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-xl font-semibold w-12 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleIncrement}
                    disabled={quantity >= maxQuantity}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleAddToCart}
                className="w-full h-12 text-lg gap-2"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5" />
                Add {quantity > 1 ? `${quantity} ` : ""}to Cart - {formatCurrency(product.price * quantity)}
              </Button>
            </div>
          )}

          {/* Product Reviews */}
          {userId && (
            <ProductReviewsDisplay 
              productId={product.id} 
              userId={userId}
              productName={product.name}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

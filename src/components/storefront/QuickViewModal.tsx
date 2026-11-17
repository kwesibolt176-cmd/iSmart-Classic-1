import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Heart, Share2, X } from "lucide-react";
import { WishlistButton } from "./WishlistButton";
import { SocialShareButtons } from "./SocialShareButtons";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  quantity: number;
  slug: string | null;
  category_name?: string;
}

interface QuickViewModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (quantity: number) => void;
  onViewDetails: () => void;
  isInWishlist: boolean;
  onToggleWishlist: () => void;
  currency?: string;
}

export const QuickViewModal = ({
  product,
  open,
  onOpenChange,
  onAddToCart,
  onViewDetails,
  isInWishlist,
  onToggleWishlist,
  currency = "GH₵"
}: QuickViewModalProps) => {
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const isOutOfStock = product.quantity === 0;

  const handleAddToCart = () => {
    onAddToCart(quantity);
    setQuantity(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative aspect-square bg-muted">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <ShoppingCart className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            
            {/* Quick actions overlay */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <WishlistButton
                isInWishlist={isInWishlist}
                onToggle={onToggleWishlist}
                className="bg-background/80 backdrop-blur-sm hover:bg-background"
              />
            </div>

            {isOutOfStock && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  Out of Stock
                </Badge>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-6 flex flex-col">
            <DialogHeader className="text-left">
              {product.category_name && (
                <Badge variant="secondary" className="w-fit mb-2">
                  {product.category_name}
                </Badge>
              )}
              <DialogTitle className="text-2xl">{product.name}</DialogTitle>
            </DialogHeader>

            <p className="text-3xl font-bold text-primary mt-4">
              {currency}{product.price.toFixed(2)}
            </p>

            {product.description && (
              <p className="text-muted-foreground mt-4 line-clamp-4">
                {product.description}
              </p>
            )}

            {product.quantity > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {product.quantity < 10 ? (
                  <span className="text-orange-500">Only {product.quantity} left in stock!</span>
                ) : (
                  <span className="text-green-500">In Stock</span>
                )}
              </p>
            )}

            <div className="mt-auto pt-6 space-y-4">
              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Quantity:</span>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={quantity >= product.quantity}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={onViewDetails}
                className="w-full"
              >
                View Full Details
              </Button>

              {/* Share */}
              <div className="pt-4 border-t">
                <SocialShareButtons
                  title={`Check out ${product.name}`}
                  description={product.description || ""}
                  compact={false}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

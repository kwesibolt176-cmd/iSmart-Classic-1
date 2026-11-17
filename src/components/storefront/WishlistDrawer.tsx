import { Heart, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  addedAt: Date;
}

interface WishlistDrawerProps {
  items: WishlistItem[];
  onRemove: (id: string) => void;
  onAddToCart: (item: WishlistItem) => void;
  onClear: () => void;
  currency?: string;
}

export const WishlistDrawer = ({
  items,
  onRemove,
  onAddToCart,
  onClear,
  currency = "GH₵"
}: WishlistDrawerProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Heart className="w-5 h-5" />
          {items.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {items.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            Wishlist ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <Heart className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground text-sm">
              Save items you love by clicking the heart icon
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[calc(100vh-200px)] mt-4">
              <div className="space-y-3 pr-4">
                {items.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                          <Heart className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                        <p className="text-primary font-bold mt-1">
                          {currency}{item.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => onAddToCart(item)}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRemove(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="absolute bottom-4 left-4 right-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={onClear}
              >
                <X className="w-4 h-4 mr-2" />
                Clear Wishlist
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

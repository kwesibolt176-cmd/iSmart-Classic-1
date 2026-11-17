import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Clock, ShoppingCart, X } from "lucide-react";

interface RecentlyViewedItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  viewedAt: Date;
}

interface RecentlyViewedSectionProps {
  items: RecentlyViewedItem[];
  onProductClick: (item: RecentlyViewedItem) => void;
  onAddToCart: (item: RecentlyViewedItem) => void;
  onClear: () => void;
  currency?: string;
}

export const RecentlyViewedSection = ({
  items,
  onProductClick,
  onAddToCart,
  onClear,
  currency = "GH₵"
}: RecentlyViewedSectionProps) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Recently Viewed</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs">
          <X className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="w-40 flex-shrink-0 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => onProductClick(item)}
            >
              {item.image_url ? (
                <div className="aspect-square bg-muted overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="p-2">
                <h3 className="font-medium text-xs line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {item.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">
                    {currency}{item.price.toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(item);
                    }}
                  >
                    <ShoppingCart className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

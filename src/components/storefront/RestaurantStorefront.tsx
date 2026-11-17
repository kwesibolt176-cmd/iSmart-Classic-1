import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getIndustryPlaceholder } from "@/lib/industry-placeholders";

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

interface RestaurantStorefrontProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, e?: React.MouseEvent) => void;
  currency?: string;
  industry?: string;
}

export const RestaurantStorefront = ({ 
  products, 
  onProductClick, 
  onAddToCart,
  currency = "GH₵",
  industry
}: RestaurantStorefrontProps) => {
  const placeholder = getIndustryPlaceholder(industry);
  if (products.length === 0) {
    const PlaceholderIcon = placeholder.icon;
    return (
      <Card className="p-12 text-center">
        <PlaceholderIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">No Results Found</h2>
        <p className="text-muted-foreground">Try adjusting your search or filters</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <Card
          key={product.id}
          className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
          onClick={() => onProductClick(product)}
        >
          <div className="flex gap-4 p-4">
            {/* Image */}
            {product.image_url ? (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-gradient-to-br ${placeholder.gradientFrom} ${placeholder.gradientTo} flex items-center justify-center flex-shrink-0`}>
                <placeholder.icon className={`w-8 h-8 ${placeholder.iconColor}`} />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate min-w-0 flex-1">
                  {product.name}
                </h3>
                <span className="text-xl font-bold text-primary whitespace-nowrap">
                  {currency}{product.price.toFixed(2)}
                </span>
              </div>
              
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {product.description}
                </p>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  {product.category_name && (
                    <Badge variant="secondary" className="text-xs">
                      {product.category_name}
                    </Badge>
                  )}
                </div>
                
                {product.quantity === 0 ? (
                  <Badge variant="destructive">Sold Out</Badge>
                ) : (
                  <Button
                    onClick={(e) => onAddToCart(product, 1, e)}
                    size="sm"
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

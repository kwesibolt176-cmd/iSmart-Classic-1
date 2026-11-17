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

interface RetailStorefrontProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, e?: React.MouseEvent) => void;
  currency?: string;
  industry?: string;
}

export const RetailStorefront = ({ 
  products, 
  onProductClick, 
  onAddToCart,
  currency = "GH₵",
  industry
}: RetailStorefrontProps) => {
  const placeholder = getIndustryPlaceholder(industry);
  // Group products by category
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category_name || "All Products";
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  if (products.length === 0) {
    const PlaceholderIcon = placeholder.icon;
    return (
      <Card className="p-12 text-center">
        <PlaceholderIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">No Products Available</h2>
        <p className="text-muted-foreground">Check back later for new products!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
        <div key={category}>
          <h2 className="text-2xl font-bold mb-4 text-foreground">{category}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categoryProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer border-border/50"
                onClick={() => onProductClick(product)}
              >
                {product.image_url ? (
                  <div className="aspect-square bg-muted overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className={`aspect-square bg-gradient-to-br ${placeholder.gradientFrom} ${placeholder.gradientTo} flex items-center justify-center`}>
                    <placeholder.icon className={`w-12 h-12 ${placeholder.iconColor}`} />
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-bold text-primary">
                      {currency}{product.price.toFixed(2)}
                    </span>
                    {product.quantity === 0 ? (
                      <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                    ) : (
                      <Button
                        onClick={(e) => onAddToCart(product, 1, e)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

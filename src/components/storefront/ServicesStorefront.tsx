import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Star, Calendar, Phone } from "lucide-react";
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

interface ServicesStorefrontProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, e?: React.MouseEvent) => void;
  currency?: string;
  businessPhone?: string | null;
  industry?: string;
}

export const ServicesStorefront = ({ 
  products, 
  onProductClick, 
  onAddToCart,
  currency = "GH₵",
  businessPhone,
  industry
}: ServicesStorefrontProps) => {
  const placeholder = getIndustryPlaceholder(industry);
  // Group services by category
  const groupedServices = products.reduce((acc, product) => {
    const category = product.category_name || "Our Services";
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  if (products.length === 0) {
    const PlaceholderIcon = placeholder.icon;
    return (
      <Card className="p-12 text-center">
        <PlaceholderIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Services Coming Soon</h2>
        <p className="text-muted-foreground">Check back later for our service offerings!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Call to Book Banner */}
      {businessPhone && (
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Ready to book?</p>
                <p className="text-sm text-muted-foreground">Call us to schedule your appointment</p>
              </div>
            </div>
            <Button asChild className="gap-2">
              <a href={`tel:${businessPhone}`}>
                <Phone className="w-4 h-4" />
                {businessPhone}
              </a>
            </Button>
          </div>
        </Card>
      )}

      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <div key={category}>
          <h2 className="text-2xl font-bold mb-4 text-foreground">{category}</h2>
          <div className="grid gap-4">
            {categoryServices.map((service) => (
              <Card
                key={service.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => onProductClick(service)}
              >
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  {service.image_url ? (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br ${placeholder.gradientFrom} ${placeholder.gradientTo} flex items-center justify-center flex-shrink-0`}>
                      <placeholder.icon className={`w-8 h-8 ${placeholder.iconColor}`} />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {service.name}
                        </h3>
                        {service.category_name && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {service.category_name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-primary">
                          {currency}{service.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {service.description}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 mt-3">
                      {service.quantity === 0 ? (
                        <Badge variant="destructive">Unavailable</Badge>
                      ) : (
                        <Button
                          onClick={(e) => onAddToCart(service, 1, e)}
                          size="sm"
                          className="gap-1"
                        >
                          <Calendar className="w-4 h-4" />
                          Book Now
                        </Button>
                      )}
                    </div>
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

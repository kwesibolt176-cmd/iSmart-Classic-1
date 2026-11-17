import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, FileText, CheckCircle } from "lucide-react";
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

interface HomeServicesStorefrontProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, e?: React.MouseEvent) => void;
  currency?: string;
  businessPhone?: string | null;
  industry?: string;
}

export const HomeServicesStorefront = ({ 
  products, 
  onProductClick, 
  onAddToCart,
  currency = "GH₵",
  businessPhone,
  industry
}: HomeServicesStorefrontProps) => {
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
      {/* Contact for Quote Banner */}
      {businessPhone && (
        <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/20">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">Need a Quote?</p>
                <p className="text-sm text-muted-foreground">Contact us for a free estimate on your project</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="gap-2">
                <a href={`tel:${businessPhone}`}>
                  <Phone className="w-4 h-4" />
                  Call Us
                </a>
              </Button>
              <Button asChild className="gap-2">
                <a href={`sms:${businessPhone}`}>
                  <MessageSquare className="w-4 h-4" />
                  Text Us
                </a>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <div key={category}>
          <h2 className="text-2xl font-bold mb-4 text-foreground">{category}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryServices.map((service) => (
              <Card
                key={service.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => onProductClick(service)}
              >
                {/* Image */}
                {service.image_url ? (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className={`aspect-video bg-gradient-to-br ${placeholder.gradientFrom} ${placeholder.gradientTo} flex items-center justify-center`}>
                    <placeholder.icon className={`w-12 h-12 ${placeholder.iconColor}`} />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                  </div>
                  
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {service.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-3 border-t">
                    <div>
                      <span className="text-sm text-muted-foreground">Starting at</span>
                      <p className="text-xl font-bold text-primary">
                        {currency}{service.price.toFixed(2)}
                      </p>
                    </div>
                    
                    {service.quantity === 0 ? (
                      <Badge variant="destructive">Unavailable</Badge>
                    ) : (
                      <Button
                        onClick={(e) => onAddToCart(service, 1, e)}
                        size="sm"
                        className="gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Request
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

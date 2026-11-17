import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { VariantSelector } from "./VariantSelector";
import { useState, useMemo } from "react";
import { useCurrency } from "@/hooks/use-currency";
import { useBusiness } from "@/contexts/BusinessContext";
import { getIndustryPlaceholder } from "@/lib/industry-placeholders";
import { toast } from "@/hooks/use-toast";
interface MenuItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    category_id?: string | null;
    image?: string;
    description?: string;
    has_variants?: boolean;
    quantity?: number;
  };
}

export const MenuItem = ({ item }: MenuItemProps) => {
  const { addItem } = useCart();
  const { format: formatCurrency } = useCurrency();
  const { profile } = useBusiness();
  const [variantSelectorOpen, setVariantSelectorOpen] = useState(false);
  
  const placeholder = useMemo(() => 
    getIndustryPlaceholder(profile?.industry), 
    [profile?.industry]
  );
  const isOutOfStock = item.quantity !== undefined && item.quantity <= 0;

  const handleClick = () => {
    if (isOutOfStock) {
      toast({
        title: "Out of Stock",
        description: `${item.name} is currently unavailable`,
        variant: "destructive",
      });
      return;
    }

    if (item.has_variants) {
      setVariantSelectorOpen(true);
    } else {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        description: item.description,
      });
    }
  };

  const handleSelectVariant = (variantId: string, variantName: string, finalPrice: number) => {
    addItem({
      id: variantId,
      name: `${item.name} - ${variantName}`,
      price: finalPrice,
      image: item.image,
      description: item.description,
    });
  };

  return (
    <>
      <div 
        onClick={handleClick}
        className={`relative bg-card rounded-lg border border-border overflow-hidden transition-colors duration-200 group ${
          isOutOfStock 
            ? "opacity-60 cursor-not-allowed" 
            : "hover:border-primary/40 cursor-pointer active:bg-muted/50"
        }`}
      >
        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs font-bold px-3 py-1">
              Out of Stock
            </Badge>
          </div>
        )}

        <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center relative overflow-hidden">
          {item.has_variants && !isOutOfStock && (
            <Badge 
              className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-[10px] font-bold uppercase"
            >
              <Layers className="w-3 h-3 mr-1" />
              Variants
            </Badge>
          )}
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-4xl filter drop-shadow-sm">{placeholder.emoji}</div>
          )}
        </div>
        
        <div className="p-3">
          <h3 className="text-sm font-bold text-foreground mb-1 line-clamp-1">{item.name}</h3>
          {item.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-1 mb-2">{item.description}</p>
          )}
          
          <div className="flex items-center justify-between mt-auto">
            <span className={`text-base font-bold ${isOutOfStock ? "text-muted-foreground" : "text-primary"}`}>
              {formatCurrency(item.price)}
            </span>
            <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
              {isOutOfStock ? "Unavailable" : item.has_variants ? "Select" : "Add"}
            </span>
          </div>
        </div>
      </div>

      {item.has_variants && (
        <VariantSelector
          inventoryItemId={item.id}
          inventoryItemName={item.name}
          basePrice={item.price}
          open={variantSelectorOpen}
          onOpenChange={setVariantSelectorOpen}
          onSelectVariant={handleSelectVariant}
        />
      )}
    </>
  );
};

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
interface Variant {
  id: string;
  variant_name: string;
  attributes: Record<string, string>;
  price_adjustment: number;
  quantity: number;
}

interface VariantSelectorProps {
  inventoryItemId: string;
  inventoryItemName: string;
  basePrice: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVariant: (variantId: string, variantName: string, finalPrice: number) => void;
}

export const VariantSelector = ({
  inventoryItemId,
  inventoryItemName,
  basePrice,
  open,
  onOpenChange,
  onSelectVariant,
}: VariantSelectorProps) => {
  const { currentLocation } = useLocation();
  const { format: formatCurrency } = useCurrency();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchVariants();
    }
  }, [open, inventoryItemId]);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("product_variants")
        .select("*")
        .eq("inventory_item_id", inventoryItemId)
        .eq("is_active", true)
        .gt("quantity", 0)
        .order("variant_name");

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVariants((data || []).map(v => ({
        ...v,
        attributes: (v.attributes as Record<string, string>) || {}
      })));
    } catch (error) {
      console.error("Error fetching variants:", error);
      toast.error("Failed to load variants");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const selectedVariant = variants.find((v) => v.id === selectedVariantId);
    if (!selectedVariant) {
      toast.error("Please select a variant");
      return;
    }

    const finalPrice = basePrice + selectedVariant.price_adjustment;
    onSelectVariant(selectedVariant.id, selectedVariant.variant_name, finalPrice);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select {inventoryItemName} Variant</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No variants available in stock
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={selectedVariantId} onValueChange={setSelectedVariantId}>
              {variants.map((variant) => {
                const finalPrice = basePrice + variant.price_adjustment;
                return (
                  <div
                    key={variant.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedVariantId(variant.id)}
                  >
                    <RadioGroupItem value={variant.id} id={variant.id} />
                    <Label
                      htmlFor={variant.id}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium mb-1">{variant.variant_name}</div>
                        <div className="flex items-center gap-2 text-sm">
                          {variant.attributes.size && (
                            <Badge variant="outline" className="text-xs">
                              {variant.attributes.size}
                            </Badge>
                          )}
                          {variant.attributes.color && (
                            <Badge variant="outline" className="text-xs">
                              {variant.attributes.color}
                            </Badge>
                          )}
                          <span className="text-muted-foreground">
                            Stock: {variant.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(finalPrice)}</div>
                        {variant.price_adjustment !== 0 && (
                          <div className="text-xs text-muted-foreground">
                            ({variant.price_adjustment > 0 ? "+" : ""}
                            {variant.price_adjustment.toFixed(2)})
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            <div className="flex gap-2">
              <Button onClick={handleAddToCart} className="flex-1" disabled={!selectedVariantId}>
                Add to Cart
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

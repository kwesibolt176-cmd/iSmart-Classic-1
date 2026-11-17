import { useMemo, useState } from "react";
import { ShoppingCart, Minus, Plus, Trash2, Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCurrency } from "@/hooks/use-currency";
import { useBusiness } from "@/contexts/BusinessContext";
import { getIndustryConfig } from "@/lib/industry-config";

interface CartDrawerProps {
  onCheckout?: (expressMode: boolean) => void;
}

export const CartDrawer = ({ onCheckout }: CartDrawerProps) => {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { items, updateQuantity, removeItem, getTotalItems, getSubtotal, getTax, getTotal, selectedTable, clearTable } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { format: formatCurrency } = useCurrency();
  const { profile } = useBusiness();
  
  // Industry-specific labels
  const industryConfig = useMemo(() => getIndustryConfig(profile?.industry), [profile?.industry]);

  const handleCheckout = (express = false) => {
    if (items.length === 0) return;
    setSheetOpen(false);
    // Use section-based navigation
    if (onCheckout) {
      onCheckout(express);
    } else {
      // Navigate via query params for section change
      navigate(`/?section=payment&express=${express}`);
    }
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50">
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {getTotalItems() > 0 && (
              <Badge className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground">
                {getTotalItems()}
              </Badge>
            )}
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col bg-background">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="w-5 h-5" />
            {industryConfig.cartLabel} ({getTotalItems()} items)
          </SheetTitle>
          {selectedTable && (
            <div className="flex items-center justify-between mt-2 p-2 bg-muted rounded-md border border-border">
              <span className="text-xs font-bold text-foreground capitalize">
                Table {selectedTable.number}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearTable}
                className="h-6 px-2 text-[10px] font-bold uppercase hover:bg-background"
              >
                Clear Table
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-auto py-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-base font-bold text-foreground mb-1">Empty {industryConfig.cartLabel.toLowerCase()}</p>
              <p className="text-xs text-muted-foreground">Add {industryConfig.productLabelPlural.toLowerCase()} to continue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 bg-card rounded-lg border border-border">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xs truncate">{item.name}</h3>
                        {item.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-2 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-background"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-background"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border pt-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span className="font-medium">{formatCurrency(getTax())}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(getTotal())}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => handleCheckout(true)}
                variant="outline"
                className="h-14 text-base font-semibold border-2 hover:bg-primary/10"
                disabled={items.length === 0}
              >
                <Zap className="w-4 h-4 mr-2 inline" /> Express
              </Button>
              <Button 
                onClick={() => handleCheckout(false)}
                className="h-14 text-base font-semibold"
                disabled={items.length === 0}
              >
                {industryConfig.checkoutLabel}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

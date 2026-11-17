import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, Check, Loader2, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category_id?: string;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
}

export default function SelfServeOrder() {
  const { token } = useParams<{ token: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  // Fetch station info
  const { data: station, isLoading: stationLoading, error: stationError } = useQuery({
    queryKey: ["ordering-station", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordering_stations")
        .select(`
          *,
          ordering_station_groups (
            user_id,
            name,
            is_active,
            auto_assign_station
          )
        `)
        .eq("qr_code_token", token)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const businessUserId = station?.ordering_station_groups?.user_id;

  // Fetch menu items
  const { data: menuItems } = useQuery({
    queryKey: ["self-serve-menu", businessUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", businessUserId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!businessUserId,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["self-serve-categories", businessUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", businessUserId)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!businessUserId,
  });

  // Fetch business profile
  const { data: businessProfile } = useQuery({
    queryKey: ["business-profile", businessUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", businessUserId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!businessUserId,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const orderNum = `SS-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("self_serve_orders")
        .insert({
          business_user_id: businessUserId,
          station_id: station?.id,
          order_number: orderNum,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          subtotal: subtotal,
          tax: tax,
          total: total,
          notes: notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return { order: data, orderNumber: orderNum };
    },
    onSuccess: (result) => {
      setOrderNumber(result.orderNumber);
      setOrderPlaced(true);
      setCart([]);
      toast.success("Order placed successfully!");
    },
    onError: (error) => {
      toast.error("Failed to place order");
      console.error(error);
    },
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image: item.image_url,
      }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.0; // No tax for now
  const total = subtotal + tax;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredItems = selectedCategory 
    ? menuItems?.filter(item => item.category_id === selectedCategory)
    : menuItems;

  const currency = businessProfile?.currency || "GH₵";

  if (stationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (stationError || !station || !station.ordering_station_groups?.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <h2 className="text-xl font-bold mb-2">Invalid or Inactive Station</h2>
            <p className="text-muted-foreground">
              This QR code is no longer active. Please contact staff for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold">Order Submitted!</h2>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="text-2xl font-mono font-bold">{orderNumber}</p>
            </div>
            <p className="text-muted-foreground">
              Your order is awaiting confirmation from the staff. You'll be notified once it's accepted.
            </p>
            <p className="text-sm text-muted-foreground">
              Please wait at {station.station_name}
            </p>
            <Button 
              className="w-full" 
              onClick={() => {
                setOrderPlaced(false);
                setCustomerName("");
                setCustomerPhone("");
                setNotes("");
              }}
            >
              Place Another Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">{businessProfile?.business_name || "Restaurant"}</h1>
              <p className="text-sm text-muted-foreground">{station.station_name}</p>
            </div>
            {businessProfile?.logo_url && (
              <img 
                src={businessProfile.logo_url} 
                alt="Logo" 
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="sticky top-[57px] z-30 bg-background border-b">
          <div className="container max-w-lg mx-auto px-4 py-2 overflow-x-auto">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="shrink-0"
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="shrink-0"
                >
                  {category.icon && <span className="mr-1">{category.icon}</span>}
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="container max-w-lg mx-auto px-4 py-4">
        <div className="grid gap-3">
          {filteredItems?.map((item) => {
            const cartItem = cart.find(i => i.id === item.id);
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex">
                  {item.image_url && (
                    <div className="w-24 h-24 shrink-0">
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary">
                        {currency}{item.price.toFixed(2)}
                      </span>
                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-6 text-center font-semibold">{cartItem.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => addToCart(item)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cart Button */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
          <div className="container max-w-lg mx-auto">
            <Button 
              className="w-full h-14 text-lg"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              View Cart ({cartItemCount}) • {currency}{total.toFixed(2)}
            </Button>
          </div>
        </div>
      )}

      {/* Cart Panel */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="sticky top-0 bg-background border-b p-4">
            <div className="container max-w-lg mx-auto flex items-center justify-between">
              <h2 className="text-xl font-bold">Your Order</h2>
              <Button variant="ghost" onClick={() => setIsCartOpen(false)}>
                Close
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="container max-w-lg mx-auto space-y-4">
              {/* Cart Items */}
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currency}{item.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Customer Info */}
              <div className="space-y-3 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Your Name (Optional)</Label>
                  <Input
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number (Optional)</Label>
                  <PhoneInput
                    placeholder="For order updates"
                    value={customerPhone}
                    onChange={setCustomerPhone}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Special Instructions (Optional)</Label>
                  <Textarea
                    placeholder="Any special requests?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{currency}{subtotal.toFixed(2)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{currency}{tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{currency}{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-background border-t p-4">
            <div className="container max-w-lg mx-auto">
              <Button 
                className="w-full h-14 text-lg"
                onClick={() => placeOrderMutation.mutate()}
                disabled={cart.length === 0 || placeOrderMutation.isPending}
              >
                {placeOrderMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>Place Order • {currency}{total.toFixed(2)}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

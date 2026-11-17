import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, Package, ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatCurrency, getCurrencySymbol } from "@/hooks/use-currency";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  quantity: number;
  user_id: string;
}

export const ShopProduct = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, description, price, image_url, is_active, quantity, user_id, slug")
        .eq("slug", slug)
        .eq("is_active", true)
        .eq("show_on_storefront", true)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async () => {
    if (!product || !customerName || !customerPhone) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and phone number",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const totalAmount = product.price * quantity;

      const { error } = await supabase.from("social_media_orders").insert({
        user_id: product.user_id,
        product_id: product.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        delivery_address: deliveryAddress || null,
        notes: notes || null,
        quantity,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Order placed!",
        description: "The merchant will contact you to confirm your order",
      });

      // Reset form
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setDeliveryAddress("");
      setNotes("");
      setQuantity(1);
    } catch (error) {
      console.error("Error placing order:", error);
      toast({
        title: "Error",
        description: "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <p className="text-muted-foreground">This product is no longer available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <Card className="p-6 h-fit">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-80 object-cover rounded-lg mb-4"
              />
            ) : (
              <div className="w-full h-80 bg-muted rounded-lg flex items-center justify-center mb-4">
                <Package className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-2xl font-bold text-primary mb-4">
              {formatCurrency(product.price, "GHS")}
            </p>
            {product.description && (
              <p className="text-muted-foreground mb-4">{product.description}</p>
            )}
            <Badge variant={product.quantity > 0 ? "default" : "destructive"}>
              {product.quantity > 0 
                ? `${product.quantity} in stock` 
                : "Out of stock"
              }
            </Badge>
          </Card>

          {/* Order Form */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Place Order</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.quantity || undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <PhoneInput
                  id="phone"
                  value={customerPhone}
                  onChange={setCustomerPhone}
                  placeholder="Your phone number"
                />
              </div>

              <div>
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <Label htmlFor="address">Delivery Address (optional)</Label>
                <Textarea
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Your delivery address"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions"
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between mb-4">
                  <span className="text-lg">Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(product.price * quantity, "GHS")}
                  </span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleOrder}
                  disabled={submitting || product.quantity < quantity}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 mr-2" />
                  )}
                  Place Order
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShoppingBag, CreditCard, Loader2, CheckCircle2, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { useCurrency } from "@/hooks/use-currency";
import { DeliveryOptionsSelector } from "@/components/delivery/DeliveryOptionsSelector";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  phone: z.string().trim().min(10, "Phone must be at least 10 digits").max(15),
});

interface PublicCheckoutProps {
  userId: string;
  onBack: () => void;
}

export const PublicCheckout = ({ userId, onBack }: PublicCheckoutProps) => {
  const { items, getSubtotal, getTax, getTotal, clearCart } = useCart();
  const { format: formatCurrency } = useCurrency();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<{
    partnerId: string;
    partnerName: string;
    deliveryFee: number;
    estimatedTime: string;
    deliveryAddress: string;
    deliveryContact: string;
    deliveryPhone: string;
    deliveryNotes: string;
  } | null>(null);

  const handleSubmitOrder = async () => {
    try {
      // Validate customer info
      const validation = customerSchema.safeParse({
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      });

      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);

      // Create order first (status: pending payment)
      const generatedOrderNumber = `SO-${Date.now().toString().slice(-8)}`;

      // Use the same tax calculation as displayed (single source of truth)
      const orderSubtotal = getSubtotal();
      const orderTax = getTax();
      const totalWithDelivery = orderSubtotal + orderTax + (selectedDelivery?.deliveryFee || 0);

      // Create a central order in the orders table for unified tracking
      const { data: centralOrder, error: centralOrderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          order_number: generatedOrderNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          order_type: selectedDelivery ? "delivery" : "takeout",
          status: "pending",
          subtotal: orderSubtotal,
          tax: orderTax,
          total: totalWithDelivery,
          source: "storefront",
        })
        .select("id")
        .single();

      if (centralOrderError || !centralOrder) {
        console.error("Error creating central order:", centralOrderError);
        throw new Error("Failed to create order. Please try again.");
      }

      // Create order items in central order_items table
      const orderItems = items.map(item => ({
        order_id: centralOrder.id,
        inventory_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      }));
      await supabase.from("order_items").insert(orderItems);

      // Create rows in social_media_orders for backward compatibility.
      // IMPORTANT: do NOT deduct inventory here — only after payment is verified.
      const orderPromises = items.map((item) =>
        supabase.from("social_media_orders").insert({
          user_id: userId,
          product_id: item.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          delivery_address: deliveryAddress || null,
          quantity: item.quantity,
          total_amount:
            item.price * item.quantity +
            (selectedDelivery?.deliveryFee || 0) / items.length,
          payment_method: paymentMethod,
          payment_status: "pending",
          status: "pending",
          central_order_id: centralOrder.id,
        }).select()
      );

      const results = await Promise.all(orderPromises);
      const firstOrder = results[0].data?.[0];

      if (!firstOrder) {
        throw new Error("Failed to create order");
      }

      // Use email if provided, otherwise generate from phone
      const email = customerEmail || `${customerPhone.replace(/[^0-9]/g, '')}@storefront.local`;

      // Initialize iSmart MoMo collection
      const { data, error } = await supabase.functions.invoke("ismart-checkout", {
        body: {
          orderId: centralOrder.id,
          orderNumber: generatedOrderNumber,
          amount: totalWithDelivery,
          customerName,
          customerPhone,
          customerEmail: email,
          provider: "MTN",
          merchantUserId: userId,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        },
      });

      if (error) throw error;
      if (data?.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      if (data?.success === false) throw new Error(data.error || "Failed to initialize payment");

      sessionStorage.setItem('pendingOrderNumber', generatedOrderNumber);
      sessionStorage.setItem('pendingOrderId', firstOrder.id);
      toast({
        title: "Check your phone",
        description: "Approve the mobile money prompt to complete your order.",
      });
      window.location.href = `/merchant-payment/callback?reference=${data?.reference || firstOrder.id}`;

    } catch (error: any) {
      console.error("Order error:", error);
      toast({
        title: "Order Failed",
        description: error.message || "Could not place order",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <div className="bg-card rounded-3xl border border-border p-8 text-center shadow-xl">
            <div className="mb-6">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-foreground mb-2">Order Confirmed!</h1>
              <p className="text-muted-foreground">Order #{orderNumber}</p>
            </div>
            
            <div className="bg-muted/30 rounded-xl p-6 mb-6">
              <h2 className="font-semibold text-foreground mb-3">Order Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items:</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-lg">{formatCurrency(getTotal() + (selectedDelivery?.deliveryFee || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="font-medium capitalize">{paymentMethod}</span>
                </div>
                {selectedDelivery && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery:</span>
                    <span className="font-medium">{selectedDelivery.partnerName}</span>
                  </div>
                )}
              </div>
            </div>

            {customerEmail && (
              <p className="text-sm text-muted-foreground mb-4">
                A confirmation has been sent to {customerEmail}
              </p>
            )}

            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={() => window.open(`/order-tracking?phone=${encodeURIComponent(customerPhone)}`, '_blank')} 
                className="w-full"
              >
                Track Your Order
              </Button>
              <Button onClick={() => window.location.reload()} size="lg" className="w-full">
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Button variant="ghost" onClick={onBack} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Button>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Customer Details */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingBag className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Customer Details</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <PhoneInput
                  id="phone"
                  value={customerPhone}
                  onChange={(value) => setCustomerPhone(value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address">Delivery Address</Label>
                <Input
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="123 Main St, City"
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* Delivery Options */}
            <DeliveryOptionsSelector
              isDeliveryEnabled={deliveryEnabled}
              onToggleDelivery={setDeliveryEnabled}
              orderTotal={getTotal()}
              pickupAddress=""
              onDeliverySelected={setSelectedDelivery}
            />

            <Separator />

            <div>
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Payment Method</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "momo", label: "Momo", icon: <Smartphone className="w-6 h-6 mx-auto" /> },
                  { id: "card", label: "Card", icon: <CreditCard className="w-6 h-6 mx-auto" /> },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as "momo" | "card")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === method.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex justify-center mb-2 text-primary">{method.icon}</div>
                    <div className="text-sm font-medium">{method.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">Order Summary</h2>

            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(getTax())}</span>
              </div>
              {selectedDelivery && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery ({selectedDelivery.partnerName})</span>
                  <span>{formatCurrency(selectedDelivery.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(getTotal() + (selectedDelivery?.deliveryFee || 0))}</span>
              </div>
            </div>

            <Button
              onClick={handleSubmitOrder}
              disabled={isProcessing || !customerName || !customerPhone}
              className="w-full h-14 text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Place Order"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              By placing an order, you agree to our terms and conditions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

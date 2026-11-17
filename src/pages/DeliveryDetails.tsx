import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, Phone, User, Loader2, CheckCircle2, 
  Package, Clock, Send, Store, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  user_id: string;
  order_items: OrderItem[];
}

interface BusinessProfile {
  business_name: string;
  logo_url?: string;
  currency: string;
  business_phone?: string;
}

export default function DeliveryDetails() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const phone = searchParams.get("phone");

  const [order, setOrder] = useState<Order | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    deliveryAddress: "",
    deliveryContact: "",
    deliveryPhone: "",
    deliveryNotes: "",
  });

  useEffect(() => {
    if (orderId && phone) {
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [orderId, phone]);

  const fetchOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          id, order_number, customer_name, customer_phone, total, status, user_id,
          order_items (id, name, quantity, price)
        `)
        .eq("id", orderId)
        .eq("customer_phone", phone)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData as unknown as Order);

      // Fetch business profile
      const { data: businessData } = await supabase
        .from("business_profiles")
        .select("business_name, logo_url, currency, business_phone")
        .eq("user_id", orderData.user_id)
        .single();

      if (businessData) {
        setBusiness(businessData);
        setFormData(prev => ({
          ...prev,
          deliveryContact: orderData.customer_name,
          deliveryPhone: orderData.customer_phone,
        }));
      }

      // Check if delivery details already submitted
      const { data: existingDelivery } = await supabase
        .from("delivery_orders")
        .select("id")
        .eq("order_id", orderId)
        .single();

      if (existingDelivery) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = business?.currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!formData.deliveryAddress) {
      toast.error("Please enter your delivery address");
      return;
    }

    if (!order) return;

    setSubmitting(true);
    try {
      // Get business address for pickup
      const { data: businessData } = await supabase
        .from("business_profiles")
        .select("address, business_name")
        .eq("user_id", order.user_id)
        .single();

      // Create delivery order
      const { error: deliveryError } = await supabase
        .from("delivery_orders")
        .insert({
          order_id: order.id,
          user_id: order.user_id,
          pickup_address: businessData?.address || businessData?.business_name || "Store Location",
          delivery_address: formData.deliveryAddress,
          delivery_contact: formData.deliveryContact || order.customer_name,
          delivery_phone: formData.deliveryPhone || order.customer_phone,
          delivery_notes: formData.deliveryNotes || null,
          status: "pending",
          delivery_fee: 0, // Will be updated by delivery partner
        });

      if (deliveryError) throw deliveryError;

      // Update order status
      await supabase
        .from("orders")
        .update({ 
          status: "processing",
          delivery_address: formData.deliveryAddress,
        })
        .eq("id", order.id);

      // Notify business
      await supabase.functions.invoke("send-sms", {
        body: {
          to: business?.business_phone,
          message: `[Delivery] Delivery details received for Order #${order.order_number}!\n\nCustomer: ${formData.deliveryContact}\nAddress: ${formData.deliveryAddress}\n\nPlease prepare the order for delivery.`,
        },
      });

      setSubmitted(true);
      toast.success("Delivery details submitted successfully!");
    } catch (error) {
      console.error("Error submitting delivery details:", error);
      toast.error("Failed to submit delivery details");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground">
              This order link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Delivery Details Submitted!</h2>
            <p className="text-muted-foreground mb-4">
              Your delivery information has been received. {business?.business_name} will prepare your order for delivery.
            </p>
            <div className="p-4 rounded-lg bg-muted text-sm">
              <p className="font-medium">Order #{order.order_number}</p>
              <p className="text-muted-foreground">{formatCurrency(order.total)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Business Header */}
        <div className="text-center">
          {business?.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.business_name}
              className="h-16 w-16 rounded-full mx-auto mb-3 object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Store className="h-8 w-8 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold">{business?.business_name || "Store"}</h1>
          <p className="text-sm text-muted-foreground">Enter your delivery details</p>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order #{order.order_number}
              </CardTitle>
              <Badge variant="secondary">{order.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact Name
              </Label>
              <Input
                value={formData.deliveryContact}
                onChange={(e) => setFormData({ ...formData, deliveryContact: e.target.value })}
                placeholder="Who should receive the delivery?"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <PhoneInput
                value={formData.deliveryPhone}
                onChange={(value) => setFormData({ ...formData, deliveryPhone: value })}
                placeholder="Contact phone for delivery"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Address *
              </Label>
              <Textarea
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                placeholder="Enter your full delivery address including landmark..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Delivery Notes (optional)</Label>
              <Textarea
                value={formData.deliveryNotes}
                onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                placeholder="Any special instructions for delivery..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleSubmit}
          disabled={submitting || !formData.deliveryAddress}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Delivery Details
            </>
          )}
        </Button>

        {/* Info Note */}
        <p className="text-xs text-center text-muted-foreground">
          <Clock className="h-3 w-3 inline mr-1" />
          You will receive updates about your delivery via SMS
        </p>
      </div>
    </div>
  );
}

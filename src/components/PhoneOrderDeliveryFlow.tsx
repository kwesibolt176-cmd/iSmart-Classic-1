import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { 
  Phone, Send, Copy, Check, Loader2, 
  ShoppingCart, User, MapPin, MessageSquare, Link
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PhoneOrderDeliveryFlowProps {
  orderItems: OrderItem[];
  total: number;
  onOrderCreated?: (orderId: string) => void;
}

export const PhoneOrderDeliveryFlow = ({ orderItems, total, onOrderCreated }: PhoneOrderDeliveryFlowProps) => {
  const { user, profile } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [deliveryLink, setDeliveryLink] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    notes: "",
  });

  const handleCreateOrder = async () => {
    if (!formData.customerName || !formData.customerPhone) {
      toast.error("Please enter customer name and phone number");
      return;
    }

    if (!user) {
      toast.error("Please log in to create orders");
      return;
    }

    setCreating(true);
    try {
      // Generate order number
      const orderNumber = `PH-${Date.now().toString(36).toUpperCase()}`;

      // Create the order with pending status
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          total,
          status: "pending",
          order_type: "phone_delivery",
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItemsData = orderItems.map(item => ({
        order_id: order.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // Generate delivery details link
      const baseUrl = window.location.origin;
      const deliveryFormLink = `${baseUrl}/delivery-details?orderId=${order.id}&phone=${encodeURIComponent(formData.customerPhone)}`;
      
      setDeliveryLink(deliveryFormLink);

      // Send SMS to customer with the link
      await supabase.functions.invoke("send-sms", {
        body: {
          to: formData.customerPhone,
          message: `Hi ${formData.customerName}! Your order #${orderNumber} from ${profile?.business_name || 'our store'} is being prepared.\n\nTotal: ${formatCurrency(total)}\n\nPlease enter your delivery details here:\n${deliveryFormLink}\n\nThank you for your order!`,
        },
      });

      toast.success("Order created and delivery link sent to customer!");
      onOrderCreated?.(order.id);
    } catch (error) {
      console.error("Error creating phone order:", error);
      toast.error("Failed to create order");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    if (deliveryLink) {
      navigator.clipboard.writeText(deliveryLink);
      setLinkCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setFormData({ customerName: "", customerPhone: "", notes: "" });
    setDeliveryLink(null);
    setLinkCopied(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Phone className="w-4 h-4" />
          Phone Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Phone Order with Delivery
          </DialogTitle>
          <DialogDescription>
            Create an order for a phone call customer and send them a link to enter delivery details
          </DialogDescription>
        </DialogHeader>

        {!deliveryLink ? (
          <div className="space-y-4 py-4">
            {/* Order Summary */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Order Summary</span>
              </div>
              <div className="space-y-2 text-sm">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Name
                </Label>
                <Input
                  placeholder="Enter customer name"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  placeholder="e.g., 0201234567"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Order Notes (optional)
                </Label>
                <Textarea
                  placeholder="Any special instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <Button 
              onClick={handleCreateOrder} 
              disabled={creating || orderItems.length === 0}
              className="w-full gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Order...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Create & Send Delivery Link
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-6 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Order Created!</h3>
              <p className="text-sm text-muted-foreground">
                An SMS with the delivery form link has been sent to {formData.customerPhone}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Delivery Details Link
              </Label>
              <div className="flex gap-2">
                <Input value={deliveryLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {linkCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with the customer if they didn't receive the SMS
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

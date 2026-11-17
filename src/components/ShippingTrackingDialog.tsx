import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, Package, Calendar } from "lucide-react";

interface ShippingTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onUpdate?: () => void;
}

export const ShippingTrackingDialog = ({ open, onOpenChange, orderId, onUpdate }: ShippingTrackingDialogProps) => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          tracking_number: trackingNumber || null,
          carrier: carrier || null,
          shipping_address: shippingAddress || null,
          delivery_notes: deliveryNotes || null,
          estimated_delivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shipping information updated",
      });

      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating shipping:", error);
      toast({
        title: "Error",
        description: "Failed to update shipping information",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Shipping & Tracking
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="trackingNumber" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Tracking Number
            </Label>
            <Input
              id="trackingNumber"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
            />
          </div>

          <div>
            <Label htmlFor="carrier">Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger>
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dhl">DHL</SelectItem>
                <SelectItem value="fedex">FedEx</SelectItem>
                <SelectItem value="ups">UPS</SelectItem>
                <SelectItem value="usps">USPS</SelectItem>
                <SelectItem value="local">Local Delivery</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="shippingAddress">Shipping Address</Label>
            <Textarea
              id="shippingAddress"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Enter full shipping address"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="estimatedDelivery" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Estimated Delivery
            </Label>
            <Input
              id="estimatedDelivery"
              type="datetime-local"
              value={estimatedDelivery}
              onChange={(e) => setEstimatedDelivery(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="deliveryNotes">Delivery Notes</Label>
            <Textarea
              id="deliveryNotes"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Special delivery instructions..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Saving..." : "Save Shipping Info"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
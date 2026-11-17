import { Order, OrderStatus } from "@/pages/Orders";
import { Button } from "@/components/ui/button";
import { Clock, User, MapPin, Edit, Trash2, CreditCard, Link2, Truck, Scan } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { createOrderStatusUpdateAction } from "@/lib/pending-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { ShippingTrackingDialog } from "@/components/ShippingTrackingDialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useCurrency } from "@/hooks/use-currency";
import { PaymentLinkManager } from "@/components/PaymentLinkManager";
interface OrderDetailsProps {
  order: Order;
  onOrderDeleted?: () => void;
  onOrderUpdated?: () => void;
}

const statusFlow: OrderStatus[] = ["pending", "processing", "ready", "served", "completed"];

export const OrderDetails = ({ order, onOrderDeleted, onOrderUpdated }: OrderDetailsProps) => {
  const { toast } = useToast();
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPaymentLinkDialog, setShowPaymentLinkDialog] = useState(false);
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [updating, setUpdating] = useState(false);

  const currentIndex = statusFlow.indexOf(order.status);
  const nextStatus = statusFlow[currentIndex + 1];
  const canEditOrDelete = order.status === "pending" || order.status === "processing";
  const canPay = order.status === "ready";

  const handleStatusUpdate = async () => {
    if (!nextStatus) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("id", order.id);

      if (error) throw error;

      // Create pending action for status update notification if customer phone is available
      if (order.customer_phone) {
        try {
          await createOrderStatusUpdateAction(
            order.customer_phone,
            `Your order ${order.orderNumber} status has been updated to: ${nextStatus}`,
            'high'
          );
          toast({
            title: "Notification Queued",
            description: "Status update notification will be sent by admin",
          });
        } catch (error) {
          console.error('Error creating status update notification:', error);
        }
      }

      toast({
        title: "Success",
        description: `Order marked as ${nextStatus}`,
      });
      onOrderUpdated?.();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      setShowDeleteDialog(false);
      onOrderDeleted?.();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className="mt-6 space-y-6">
        <div className="space-y-3">
          {order.tableNumber && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Table {order.tableNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{order.time}</span>
          </div>
          {order.server && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{order.server}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Order Items</h3>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {item.quantity}x {item.name}
                </p>
                {item.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                )}
              </div>
              <span className="font-semibold text-foreground">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between items-center text-lg">
          <span className="font-semibold text-foreground">Total</span>
          <span className="font-bold text-primary text-xl">{formatCurrency(order.total)}</span>
        </div>

        <Separator />

        <div className="space-y-3">
          {nextStatus && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleStatusUpdate}
              disabled={updating}
            >
              Mark as {nextStatus}
            </Button>
          )}
          
          {canPay && (
            <>
              <Button 
                className="w-full" 
                size="lg"
                variant="default"
                onClick={() => navigate(`/payment?orderId=${order.id}`)}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Process Payment
              </Button>
              <Button 
                className="w-full" 
                size="lg"
                variant="outline"
                onClick={() => setShowPaymentLinkDialog(true)}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Payment Link
              </Button>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowShippingDialog(true)}
            >
              <Truck className="w-4 h-4 mr-2" />
              Shipping
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowBarcodeScanner(true)}
            >
              <Scan className="w-4 h-4 mr-2" />
              Scan Item
            </Button>
          </div>

          {canEditOrDelete && (
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => toast({
                  title: "Coming Soon",
                  description: "Order editing will be available soon",
                })}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order {order.orderNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={updating}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentLinkManager
        open={showPaymentLinkDialog}
        onOpenChange={setShowPaymentLinkDialog}
        order={{
          id: order.id,
          order_number: order.orderNumber,
          total: order.total,
          status: order.status,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          payment_link: order.payment_link,
          payment_link_expires_at: order.payment_link_expires_at,
          created_at: order.time,
        }}
        onLinkGenerated={onOrderUpdated}
      />

      <ShippingTrackingDialog
        open={showShippingDialog}
        onOpenChange={setShowShippingDialog}
        orderId={order.id}
        onUpdate={onOrderUpdated}
      />

      <BarcodeScanner
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        onScan={(barcode, item) => {
          if (item) {
            toast({
              title: "Item Found",
              description: `${item.name} - ${formatCurrency(Number(item.price))}`,
            });
          }
        }}
        mode="lookup"
      />
    </>
  );
};

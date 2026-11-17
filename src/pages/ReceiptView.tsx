import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, Loader2, Store } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string | null;
  total: number;
  status: string;
  created_at: string;
  user_id: string;
  order_items: OrderItem[];
  business_profiles: {
    business_name: string;
    address: string | null;
    business_phone: string | null;
    logo_url: string | null;
    receipt_width: string | null;
  } | null;
}

export const ReceiptView = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { format: formatCurrency } = useCurrency();

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) {
        setError("No order number provided");
        setLoading(false);
        return;
      }
      
      // Handle order numbers with or without # prefix
      const searchNumber = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;

      try {
        // First fetch the order
        const { data: orderData, error: fetchError } = await supabase
          .from("orders")
          .select(`
            id,
            order_number,
            customer_name,
            total,
            status,
            created_at,
            user_id,
            order_items (
              id,
              name,
              quantity,
              price
            )
          `)
          .eq("order_number", searchNumber)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!orderData) {
          setError("Receipt not found");
          setLoading(false);
          return;
        }

        // Fetch business profile separately
        const { data: businessData } = await supabase
          .from("business_profiles")
          .select("business_name, address, business_phone, logo_url, receipt_width")
          .eq("user_id", orderData.user_id)
          .maybeSingle();

        setOrder({
          ...orderData,
          business_profiles: businessData,
        } as OrderData);
      } catch (err: any) {
        console.error("Error fetching order:", err);
        setError("Receipt not found");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <p className="text-muted-foreground">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Store className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Receipt Not Found</h1>
          <p className="text-muted-foreground">
            {error || "The receipt you're looking for doesn't exist."}
          </p>
        </div>
      </div>
    );
  }

  const business = order.business_profiles;
  const subtotal = order.total;
  const receiptWidth = business?.receipt_width || '80mm';

  const formattedDate = new Date(order.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${receiptWidth} auto;
            margin: 2mm;
          }
          html, body {
            width: ${receiptWidth};
            margin: 0;
            padding: 0;
          }
          body * {
            visibility: hidden;
          }
          .receipt-printable, .receipt-printable * {
            visibility: visible;
          }
          .receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: ${receiptWidth};
            font-size: ${receiptWidth === '58mm' ? '10px' : '12px'};
            padding: 2mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 sm:p-8">
        <div className="max-w-md mx-auto">
          {/* Success Header */}
          <div className="flex items-center gap-3 mb-6 no-print">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Receipt</h1>
              <p className="text-sm text-muted-foreground">Order #{order.order_number}</p>
            </div>
          </div>

          {/* Receipt Card */}
          <div className="receipt-printable bg-white rounded-2xl border shadow-lg p-6 sm:p-8">
            {/* Business Info */}
            <div className="text-center mb-6">
              {business?.logo_url && (
                <img src={business.logo_url} alt={business.business_name} className="h-12 mx-auto mb-3" />
              )}
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {business?.business_name || "Business"}
              </h2>
              {business?.address && (
                <p className="text-sm text-muted-foreground">{business.address}</p>
              )}
              {business?.business_phone && (
                <p className="text-sm text-muted-foreground">Tel: {business.business_phone}</p>
              )}
            </div>

            <Separator className="my-4" />

            {/* Order Details */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Order #:</span>
                <span className="font-semibold text-gray-900">{order.order_number}</span>
              </div>
              {order.customer_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold text-gray-900">{order.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date:</span>
                <span className="font-semibold text-gray-900">{formattedDate}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-600">Status:</span>
                <Badge className="bg-green-500 text-white capitalize">{order.status}</Badge>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Items */}
            <div className="space-y-3 mb-4">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {item.quantity}x {item.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.price)} each
                    </p>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Total */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-xl font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(order.total)}
              </span>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">Thank you for your business!</p>
              <p className="text-sm text-gray-600">Please come back soon!</p>
            </div>
          </div>

          {/* Print Button */}
          <div className="mt-6 no-print">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReceiptView;

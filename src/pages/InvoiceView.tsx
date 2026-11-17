import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Building2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  paid_amount: number | null;
  late_fees_applied: number | null;
  notes: string | null;
  items: InvoiceItem[];
  payment_link_token: string | null;
}

interface BusinessProfile {
  business_name: string;
  currency: string;
  logo_url: string | null;
  address: string | null;
  business_email: string | null;
  business_phone: string | null;
}

const InvoiceView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvoice();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchInvoice = async () => {
    try {
      // Fetch invoice by payment link token
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("payment_link_token", token)
        .single();

      if (invoiceError || !invoiceData) {
        throw new Error("Invoice not found or link has expired");
      }

      setInvoice({
        ...invoiceData,
        items: (invoiceData.items as unknown as InvoiceItem[]) || [],
      });

      // Fetch business profile
      const { data: businessData } = await supabase
        .from("business_profiles")
        .select("business_name, currency, logo_url, address, business_email, business_phone")
        .eq("user_id", invoiceData.user_id)
        .single();

      if (businessData) {
        setBusiness(businessData);
      }
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Could not load invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = business?.currency || "GHS";
    const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currency === "GHS" ? "GH₵" : currency} ${formatted}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>;
      case "sent":
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Overdue</Badge>;
      case "partially_paid":
        return <Badge className="bg-blue-500"><CreditCard className="h-3 w-3 mr-1" /> Partial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handlePayNow = async () => {
    if (!invoice) return;
    
    setProcessingPayment(true);
    try {
      const amountDue = invoice.total - (invoice.paid_amount || 0) + (invoice.late_fees_applied || 0);
      const email = invoice.customer_email || `${invoice.customer_phone?.replace(/[^0-9]/g, '')}@invoice.local`;
      
      if (!invoice.customer_phone) {
        throw new Error("Customer phone number is required for mobile money payment.");
      }
      // Initialize iSmart MoMo collection
      const { data, error } = await supabase.functions.invoke("ismart-checkout", {
        body: {
          orderId: invoice.id,
          orderNumber: invoice.invoice_number,
          amount: amountDue,
          customerName: invoice.customer_name,
          customerPhone: invoice.customer_phone,
          customerEmail: email,
          provider: "MTN",
          merchantUserId: invoice.user_id,
          items: invoice.items?.map((item: any) => ({
            name: item.description || item.name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
          })) || [],
        },
      });

      if (error) throw error;
      if (data?.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      if (data?.success === false) throw new Error(data.error || "Failed to initialize payment");

      toast({
        title: "Check your phone",
        description: "Approve the mobile money prompt to complete payment.",
      });
      window.location.href = `/merchant-payment/callback?reference=${data?.reference || invoice.id}`;
    } catch (error: any) {
      console.error("Error initiating payment:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Could not initiate payment",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const isOverdue = invoice && new Date(invoice.due_date) < new Date() && invoice.status !== "paid";
  const amountDue = invoice 
    ? invoice.total - (invoice.paid_amount || 0) + (invoice.late_fees_applied || 0)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!token || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This invoice link may have expired or is invalid.
            </p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-center gap-4">
                {business?.logo_url ? (
                  <img 
                    src={business.logo_url} 
                    alt={business.business_name}
                    className="h-16 w-16 object-contain rounded-lg"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{business?.business_name || "Business"}</h1>
                  {business?.address && (
                    <p className="text-sm text-muted-foreground">{business.address}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Invoice</p>
                <p className="text-xl font-bold text-primary">{invoice.invoice_number}</p>
                {getStatusBadge(isOverdue ? "overdue" : invoice.status)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" /> Bill To
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{invoice.customer_name}</p>
              {invoice.customer_email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" /> {invoice.customer_email}
                </p>
              )}
              {invoice.customer_phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" /> {invoice.customer_phone}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Issue Date:</span>
                <span className="font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                  {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Description</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Qty</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Price</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-3 px-2">{item.name}</td>
                      <td className="py-3 px-2 text-center">{item.quantity}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(item.price)}</td>
                      <td className="py-3 px-2 text-right font-medium">
                        {formatCurrency(item.quantity * item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
              {(invoice.paid_amount || 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid:</span>
                  <span>-{formatCurrency(invoice.paid_amount || 0)}</span>
                </div>
              )}
              {(invoice.late_fees_applied || 0) > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Late Fees:</span>
                  <span>+{formatCurrency(invoice.late_fees_applied || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Amount Due:</span>
                <span className="text-primary">{formatCurrency(amountDue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Payment Action */}
        {invoice.status !== "paid" && amountDue > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-lg">Ready to pay?</p>
                  <p className="text-sm text-muted-foreground">
                    Complete your payment securely online
                  </p>
                </div>
                <Button 
                  size="lg" 
                  onClick={handlePayNow}
                  disabled={processingPayment}
                  className="w-full sm:w-auto"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {processingPayment ? "Processing..." : `Pay ${formatCurrency(amountDue)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paid Confirmation */}
        {invoice.status === "paid" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div className="text-center">
                  <p className="font-semibold text-lg text-green-800">Invoice Paid</p>
                  <p className="text-sm text-green-600">
                    Thank you for your payment!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Questions? Contact {business?.business_email || business?.business_phone || "the business"}</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;

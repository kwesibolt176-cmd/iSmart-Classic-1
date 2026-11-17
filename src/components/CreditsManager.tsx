import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { MessageSquare, Mail, Plus, History, CreditCard, Loader2, AlertTriangle, Sparkles, Package } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { format } from "date-fns";

interface CreditBundle {
  id: string;
  name: string;
  sms_credits: number;
  email_credits: number;
  price: number;
  currency: string;
}

interface CreditTransaction {
  id: string;
  credit_type: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface BusinessCredits {
  sms_credits: number;
  email_credits: number;
}

export const CreditsManager = () => {
  const { user, profile } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [credits, setCredits] = useState<BusinessCredits | null>(null);
  const [bundles, setBundles] = useState<CreditBundle[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCredits();
      fetchBundles();
      fetchTransactions();
    }
  }, [user?.id]);

  const fetchCredits = async () => {
    try {
      const { data: businessProfile } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!businessProfile) {
        setCredits({ sms_credits: 0, email_credits: 0 });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("business_credits")
        .select("sms_credits, email_credits")
        .eq("business_id", businessProfile.id)
        .maybeSingle();

      if (error) throw error;
      setCredits(data || { sms_credits: 0, email_credits: 0 });
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits({ sms_credits: 0, email_credits: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchBundles = async () => {
    try {
      // Fetch credit packages and group into bundles
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      
      // Create bundled packages combining SMS and Email
      const bundledPackages: CreditBundle[] = [
        {
          id: "bundle_starter",
          name: "Starter Bundle",
          sms_credits: 100,
          email_credits: 500,
          price: 50,
          currency: profile?.currency || "GHS",
        },
        {
          id: "bundle_growth",
          name: "Growth Bundle",
          sms_credits: 500,
          email_credits: 2500,
          price: 200,
          currency: profile?.currency || "GHS",
        },
        {
          id: "bundle_business",
          name: "Business Bundle",
          sms_credits: 1000,
          email_credits: 5000,
          price: 350,
          currency: profile?.currency || "GHS",
        },
        {
          id: "bundle_enterprise",
          name: "Enterprise Bundle",
          sms_credits: 5000,
          email_credits: 25000,
          price: 1500,
          currency: profile?.currency || "GHS",
        },
      ];
      
      setBundles(bundledPackages);
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: businessProfile } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!businessProfile) return;

      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("business_id", businessProfile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions((data || []) as CreditTransaction[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const handlePurchase = async (bundle: CreditBundle) => {
    setPurchasing(bundle.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: businessProfile } = await supabase
        .from("business_profiles")
        .select("id, business_phone, business_name")
        .eq("user_id", user!.id)
        .single();

      if (!businessProfile) throw new Error("Business profile not found");
      if (!businessProfile.business_phone) {
        throw new Error("Please add a mobile money phone number to your business profile.");
      }

      const reference = crypto.randomUUID();
      const { data: result, error } = await supabase.functions.invoke("ismart-checkout", {
        body: {
          orderId: reference,
          orderNumber: `CR-${reference.slice(0, 8)}`,
          amount: bundle.price,
          customerName: businessProfile.business_name || user?.email,
          customerPhone: businessProfile.business_phone,
          customerEmail: user?.email || (profile as any)?.business_email,
          provider: "MTN",
          merchantUserId: user!.id,
          items: [{ name: bundle.name, quantity: 1, unitPrice: bundle.price }],
        },
      });

      if (error) throw error;
      if (result?.checkoutUrl) { window.location.href = result.checkoutUrl; return; }
      if (result?.success === false) throw new Error(result.error || "Failed to initialize payment");

      toast.success("Check your phone to approve the mobile money prompt.");
      window.location.href = `/payment/callback?reference=${reference}`;
    } catch (error: any) {
      console.error("Error purchasing credits:", error);
      toast.error(error.message || "Failed to initialize payment");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isLowSMS = (credits?.sms_credits || 0) < 50;
  const isLowEmail = (credits?.email_credits || 0) < 100;

  return (
    <div className="space-y-6">
      {/* Credit Balances */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={isLowSMS ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              SMS Credits
              {isLowSMS && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Low
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(credits?.sms_credits || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">messages remaining</p>
          </CardContent>
        </Card>

        <Card className={isLowEmail ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Email Credits
              {isLowEmail && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Low
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(credits?.email_credits || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">emails remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Balance Warning */}
      {(isLowSMS || isLowEmail) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">Low Credit Balance</p>
                <p className="text-sm text-amber-700">
                  Top up your credits to continue sending communications to your customers.
                </p>
              </div>
              <Button size="sm" onClick={() => setTopUpOpen(true)}>
                Top Up Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => setTopUpOpen(true)} className="gap-2">
          <CreditCard className="h-4 w-4" />
          Buy Credit Bundle
        </Button>
        <Button variant="outline" onClick={() => setHistoryOpen(true)} className="gap-2">
          <History className="h-4 w-4" />
          Transaction History
        </Button>
      </div>

      {/* Top-Up Dialog - Bundled Packages */}
      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Purchase Credit Bundle
            </DialogTitle>
            <DialogDescription>
              Get both SMS and Email credits in one convenient bundle. Better value than buying separately!
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            {bundles.map((bundle) => (
              <Card 
                key={bundle.id} 
                className="cursor-pointer hover:border-primary transition-colors relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg">
                  Bundle
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {bundle.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        SMS Credits
                      </span>
                      <span className="font-bold">{bundle.sms_credits.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-green-500" />
                        Email Credits
                      </span>
                      <span className="font-bold">{bundle.email_credits.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-muted-foreground">Total</span>
                      <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                        {formatCurrency(bundle.price)}
                      </Badge>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => handlePurchase(bundle)}
                      disabled={purchasing === bundle.id}
                    >
                      {purchasing === bundle.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Purchase Bundle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Credit Transaction History
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {format(new Date(tx.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.credit_type === "sms" ? "default" : "secondary"}>
                          {tx.credit_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.description || tx.transaction_type}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.amount > 0 ? "text-green-600" : "text-destructive"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {tx.balance_after}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

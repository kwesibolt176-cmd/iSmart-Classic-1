import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Smartphone, Wifi, Search, CheckCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { useISmartAPI } from "@/hooks/use-ismart-api";
import { toast } from "sonner";
import { createTransactionNotification } from "@/lib/transaction-notifications";

interface AirtimeDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// The bundle-query endpoints wrap their list under various keys depending on
// network/provider (and possibly casing) rather than returning a bare array —
// normalize whatever shape comes back into a plain array so the picker below
// always has something consistent to render.
const extractBundles = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["bundles", "Bundles", "data", "Data", "items", "Items", "packages", "Packages"]) {
      const value = record[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
};

const NETWORKS = [
  { id: "MTN", name: "MTN", logo: "/assets/mtnlogo.png" },
  { id: "Telecel", name: "Telecel", logo: "/assets/telecellogo.png" },
  { id: "AT", name: "AirtelTigo", logo: "/utilities/airtel-tigo.png" }
];

export function AirtimeDataDialog({ open, onOpenChange, onSuccess }: AirtimeDataDialogProps) {
  const { profile, user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const ismart = useISmartAPI();

  const [type, setType] = useState<"airtime" | "data">("airtime");
  const [processing, setProcessing] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  
  const [form, setForm] = useState({
    recipientNumber: "",
    amount: "",
    network: "MTN" as "MTN" | "Telecel" | "AT",
    bundleCode: "",
    bundleName: "",
    pin: "",
  });

  const resetVerification = () => {
    setIsVerified(false);
    setQueryResult(null);
  };

  const handleQuery = async () => {
    if (!form.recipientNumber) {
      toast.error("Please enter a recipient number");
      return;
    }

    setQuerying(true);
    setQueryResult(null);
    setIsVerified(false);

    try {
      if (type === "airtime") {
        setIsVerified(true);
        setQueryResult({ message: "Ready to purchase airtime" });
        toast.success("Ready to purchase");
        return;
      }

      const payload = {
        Destination: form.recipientNumber,
        Amount: 0,
        ClientReference: `DATA-QUERY-${Date.now()}`,
      };

      let result;
      if (form.network === "MTN") result = await ismart.queryMTNData(payload);
      else if (form.network === "Telecel") result = await ismart.queryTelecelData(payload);
      else result = await ismart.queryATData(payload);

      if (result?.success) {
        const bundles = extractBundles(result.data);
        setQueryResult(bundles);
        setIsVerified(true);
        if (bundles.length > 0) {
          toast.success("Bundles fetched successfully");
        } else {
          toast.info("No bundles available for this network right now");
        }
      } else {
        toast.error(result?.error || "Failed to fetch bundles");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setQuerying(false);
    }
  };

  const handlePayment = async () => {
    if (!form.recipientNumber || !form.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    const amount = parseFloat(form.amount);
    if (!(amount > 0)) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!/^\d{4,6}$/.test(form.pin)) {
      toast.error("Enter your 4–6 digit transaction PIN");
      return;
    }

    setProcessing(true);
    try {
      const basePayload = {
        Destination: form.recipientNumber,
        Amount: amount,
        CallbackUrl: `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ismart-callback`,
        ClientReference: `${type.toUpperCase()}-${Date.now()}`,
        pin: form.pin,
      };

      let result;
      if (type === "airtime") {
        if (form.network === "MTN") result = await ismart.buyMTNAirtime(basePayload);
        else if (form.network === "Telecel") result = await ismart.buyTelecelAirtime(basePayload);
        else result = await ismart.buyATAirtime(basePayload);
      } else {
        const payload = { ...basePayload, BundleValue: form.bundleCode };
        if (form.network === "MTN") result = await ismart.buyMTNData(payload);
        else if (form.network === "Telecel") result = await ismart.buyTelecelData(payload);
        else result = await ismart.buyATData(payload);
      }

      if (result?.success) {
        toast.success(`${type === "airtime" ? "Airtime" : "Data"} processed successfully`);
        
        if (profile?.id) {
          await supabase.from("utility_payments").insert({
            business_id: profile.id,
            utility_type: type === "airtime" ? "airtime" as const : "data" as const,
            recipient_number: form.recipientNumber,
            amount: amount,
          });
        }

        // Create transaction notification
        if (user?.id) {
          await createTransactionNotification({
            userId: user.id,
            transactionId: `${type.toUpperCase()}-${Date.now()}`,
            orderNumber: `${type.toUpperCase()}-${Date.now().toString().slice(-6)}`,
            amount: amount,
            paymentMethod: `${type === "airtime" ? "Airtime" : "Data"} - ${form.network}`,
            customerPhone: form.recipientNumber,
          });
        }
        
        onOpenChange(false);
        setForm({ recipientNumber: "", amount: "", network: "MTN", bundleCode: "", bundleName: "" });
        resetVerification();
        if (onSuccess) onSuccess();
      } else {
        toast.error(result?.error || "Payment failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-0 text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${type === "airtime" ? "bg-primary/10" : "bg-emerald-500/10"}`}>
              {type === "airtime" ? <Smartphone className="h-5 w-5 text-primary" /> : <Wifi className="h-5 w-5 text-emerald-600" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Buy {type === "airtime" ? "Airtime" : "Data Bundle"}
              </DialogTitle>
              <DialogDescription>
                Top up any network instantly and securely.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <Tabs value={type} onValueChange={(v: any) => { setType(v); resetVerification(); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/30">
              <TabsTrigger value="airtime" className="font-bold data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white transition-all">
                AIRTIME
              </TabsTrigger>
              <TabsTrigger value="data" className="font-bold data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white transition-all">
                DATA BUNDLE
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1">
            {/* Network Selector */}
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Network Provider</Label>
              <div className="grid grid-cols-3 gap-3">
                {NETWORKS.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { setForm(prev => ({ ...prev, network: n.id as any })); resetVerification(); }}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${
                      form.network === n.id ? "border-primary bg-primary/10 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {n.logo ? (
                      <img src={n.logo} alt={n.name} className="h-6 w-auto mb-1 rounded object-contain" />
                    ) : (
                      <div className="h-6 flex items-center font-bold text-[10px]">{n.name}</div>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{n.name}</span>
                    {form.network === n.id && (
                      <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
                        <CheckCircle className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2 text-left">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recipient Number</Label>
                <PhoneInput
                  placeholder="Enter recipient number"
                  className="h-11 font-medium bg-muted/10 border-border/60 focus:bg-background transition-all"
                  value={form.recipientNumber}
                  onChange={(value) => {
                    setForm(prev => ({ ...prev, recipientNumber: value }));
                    if (isVerified) resetVerification();
                  }}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 text-left">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transaction PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={form.pin}
                  onChange={(event) => setForm(prev => ({ ...prev, pin: event.target.value.replace(/\D/g, "") }))}
                  placeholder="4–6 digit PIN"
                />
              </div>

              {type === "data" && isVerified && Array.isArray(queryResult) && (
                <div className="space-y-2 sm:col-span-2 text-left animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Package</Label>
                  {queryResult.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/10 border border-border/60">
                      No bundles available for this network right now.
                    </p>
                  ) : (
                    <Select
                      value={form.bundleCode}
                      onValueChange={(v) => {
                        const item = queryResult.find((i: any) => (i.id ?? i.Id ?? i.code ?? i.Code) === v);
                        const bundleAmount = item?.amount ?? item?.Amount ?? item?.price ?? item?.Price;
                        setForm(f => ({
                          ...f,
                          bundleCode: v,
                          bundleName: item?.name ?? item?.Name ?? "",
                          amount: bundleAmount != null ? String(bundleAmount) : "",
                        }));
                      }}
                    >
                      <SelectTrigger className="h-11 font-semibold bg-muted/10">
                        <SelectValue placeholder="Select a bundle" />
                      </SelectTrigger>
                      <SelectContent>
                        {queryResult.map((item: any) => {
                          const id = item.id ?? item.Id ?? item.code ?? item.Code;
                          const name = item.name ?? item.Name;
                          const amount = item.amount ?? item.Amount ?? item.price ?? item.Price;
                          return (
                            <SelectItem key={id} value={id}>
                              {name} - {formatCurrency(amount)}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="space-y-2 sm:col-span-2 text-left">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount (GHS)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">GHS</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-12 h-11 font-bold tabular-nums bg-muted/10 read-only:bg-muted/5 focus:bg-background transition-all"
                    value={form.amount}
                    readOnly={type === "data" && isVerified && !!form.bundleCode}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Verification / Payment Status */}
            {isVerified && type === "airtime" && (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Recipient Verified</span>
                </div>
                <p className="text-xs text-muted-foreground">The number is ready for airtime top-up. Enter an amount to proceed.</p>
              </div>
            )}

            {!isVerified ? (
              <Button 
                onClick={handleQuery} 
                disabled={querying || !form.recipientNumber} 
                className="w-full h-11 font-bold tracking-widest shadow-lg shadow-primary/20"
              >
                {querying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {type === "data" ? "FETCH BUNDLES" : "VERIFY NUMBER"}
              </Button>
            ) : (
              <Button 
                onClick={handlePayment} 
                disabled={processing || !(parseFloat(form.amount) > 0)}
                className="w-full h-11 font-bold tracking-widest shadow-lg shadow-primary/20"
              >
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                PAY {form.amount ? formatCurrency(parseFloat(form.amount)) : ""}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

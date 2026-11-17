import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { useISmartAPI } from "@/hooks/use-ismart-api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Search,
  Smartphone,
  Wifi,
  Zap,
  Droplets,
  Tv as TvIcon,
  Globe,
  Plus,
  X
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatPhoneNumber, isValidGhanaPhone } from "@/lib/utils";
import { createTransactionNotification } from "@/lib/transaction-notifications";

// --- Types & Constants ---

type UtilityType = "phone" | "internet" | "electricity" | "water" | "tv" | "broadband";

const UTILITY_CATEGORIES: { id: UtilityType; name: string; description: string; icon: string; color: string }[] = [
  {
    id: "electricity",
    name: "Electricity",
    description: "Pay your prepaid or postpaid electricity bills quickly and securely.",
    icon: "/utilities/ECG.png",
    color: "bg-amber-50"
  },
  {
    id: "water",
    name: "Water",
    description: "Settle your Ghana Water Company bills with ease.",
    icon: "/assets/utilities/GWC.png",
    color: "bg-blue-50"
  },
  {
    id: "internet",
    name: "Data Bundles",
    description: "Purchase data bundles for MTN, Telecel, and AirtelTigo.",
    icon: "/utilities/Databundles.png",
    color: "bg-emerald-50"
  },
  {
    id: "broadband",
    name: "Broadband",
    description: "Pay for your MTN and Telecel high-speed broadband services.",
    icon: "/utilities/Broadband.png",
    color: "bg-sky-50"
  },
  {
    id: "tv",
    name: "Cable TV",
    description: "Stay connected to DStv, GOtv, and StarTimes services.",
    icon: "/utilities/Cabletv.png",
    color: "bg-violet-50"
  },
  {
    id: "phone",
    name: "Airtime",
    description: "Instant airtime top-up for all major networks.",
    icon: "/utilities/Databundles.png",
    color: "bg-rose-50"
  }
];

const NETWORKS = [
  { id: "MTN", name: "MTN", logo: "/assets/mtnlogo.png" },
  { id: "Telecel", name: "Telecel", logo: "/assets/telecellogo.png" },
  { id: "AT", name: "AirtelTigo", logo: "/utilities/airtel-tigo.png" }
];

const TV_PROVIDERS = [
  { id: "DStv", name: "DStv" },
  { id: "GOtv", name: "GOtv" },
  { id: "StarTimes", name: "StarTimes" }
];

// --- Helpers ---

const isValidLocalPhone = (value: string) => /^0\d{9}$/.test(value || "");
const normalizeNumberInput = (value: string) => value.replace(/\D/g, "");

// --- Sub-components ---

const CustomerDetailsDisplay = ({ customerDetails, utilityType, formatCurrency }: any) => {
  if (!customerDetails) return null;

  return (
    <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-[#f5f7fa] to-[#e4ecf7] border border-[#d1d5db] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-[#0f172a] text-base">Customer Details</p>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-[hsl(225_60%_25%)] px-3 py-1 rounded-full border border-[hsl(225_60%_25%)]">
          {utilityType}
        </span>
      </div>

      <div className="space-y-3">
        {(customerDetails.customerName || customerDetails.name) && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#64748b] font-medium">Name:</span>
            <span className="text-[#0f172a] font-bold">{customerDetails.customerName || customerDetails.name}</span>
          </div>
        )}
        {customerDetails.amountDue !== undefined && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#64748b] font-medium">Amount Due:</span>
            <span className="text-[#0f172a] font-bold">{formatCurrency(customerDetails.amountDue)}</span>
          </div>
        )}
        {customerDetails.meterBalance !== undefined && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#64748b] font-medium">Balance:</span>
            <span className="text-[#0f172a] font-bold">{formatCurrency(customerDetails.meterBalance)}</span>
          </div>
        )}
      </div>

      {customerDetails.meters && customerDetails.meters.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#d1d5db]/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">Linked Accounts</p>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-bold">
              {customerDetails.meters.length} Found
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {customerDetails.meters.slice(0, 3).map((meter: any, idx: number) => (
              <div key={idx} className="p-3 bg-white/80 rounded-xl border border-white shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0f172a] line-clamp-1">{meter.display || `Account ${idx + 1}`}</p>
                  <p className="text-[10px] text-[#64748b] mt-0.5 font-medium">ID: {meter.value}</p>
                </div>
                {meter.amount > 0 && (
                  <p className="text-xs font-bold text-[hsl(225_60%_25%)]">{formatCurrency(meter.amount)}</p>
                )}
              </div>
            ))}
            {customerDetails.meters.length > 3 && (
              <p className="text-[10px] text-center text-[#64748b] font-medium pt-1">
                + {customerDetails.meters.length - 3} more accounts available in selection below
              </p>
            )}
          </div>
          <div className="mt-3 p-2 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-[10px] text-amber-700 font-medium leading-tight">
              <strong>Tip:</strong> Please select the specific account you wish to pay for from the dropdown menu below.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

export default function Utilities() {
  const { profile, user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const ismart = useISmartAPI();

  const [selectedCategory, setSelectedCategory] = useState<UtilityType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Form State
  const [processing, setProcessing] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  
  const [form, setForm] = useState({
    network: "MTN",
    provider: "DStv",
    meterType: "prepaid",
    destination: "",
    accountNumber: "",
    amount: "",
    email: "",
    clientReference: "",
    bundleCode: "",
    bundleName: "",
    sessionId: "",
    pin: ""
  });

  useEffect(() => {
    if (profile?.id) fetchPaymentHistory();
  }, [profile?.id]);

  const fetchPaymentHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("utility_payments")
        .select("*")
        .eq("business_id", profile?.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPayments(data || []);
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetForm = () => {
    setForm({
      network: "MTN",
      provider: "DStv",
      meterType: "prepaid",
      destination: "",
      accountNumber: "",
      amount: "",
      email: "",
      clientReference: "",
      bundleCode: "",
      bundleName: "",
      sessionId: "",
      pin: ""
    });
    setQueryResult(null);
    setIsVerified(false);
    setCustomerDetails(null);
  };

  const handleCategorySelect = (category: UtilityType) => {
    setSelectedCategory(category);
    resetForm();
    setModalOpen(true);
  };

  const handleVerify = async () => {
    if (!selectedCategory) return;
    
    setQuerying(true);
    setQueryResult(null);
    setIsVerified(false);

    try {
      let result;
      
      if (selectedCategory === "electricity") {
        if (!form.destination) { toast.error("Please enter a phone number"); setQuerying(false); return; }
        const normalizedDest = formatPhoneNumber(form.destination, 'international');
        if (!isValidGhanaPhone(normalizedDest)) { toast.error("Please enter a valid Ghana phone number"); setQuerying(false); return; }
        
        result = await ismart.queryElectricity({
          Destination: normalizedDest,
          Amount: 0,
          ClientReference: `ELEC-VERIFY-${Date.now()}`,
          businessId: profile?.id
        });
      } else if (selectedCategory === "water") {
        if (!form.accountNumber || !form.destination) { toast.error("Enter meter number and phone"); setQuerying(false); return; }
        const normalizedDest = formatPhoneNumber(form.destination, 'international');
        
        result = await ismart.queryWater({
          destination: form.accountNumber,
          mobile: normalizedDest,
          Destination: form.accountNumber,
          Mobile: normalizedDest,
          Amount: 0,
          ClientReference: `WATER-VERIFY-${Date.now()}`,
          Extradata: { Phone: normalizedDest, Bundle: "" },
          businessId: profile?.id
        });
      } else if (selectedCategory === "internet") {
        if (!form.destination) { toast.error("Please enter a phone number"); setQuerying(false); return; }
        const normalizedDest = formatPhoneNumber(form.destination, 'international');
        
        const payload = { 
          Destination: normalizedDest, 
          Amount: 0, 
          ClientReference: `DATA-${Date.now()}`,
          businessId: profile?.id 
        };
        if (form.network === "MTN") result = await ismart.queryMTNData(payload);
        else if (form.network === "Telecel") result = await ismart.queryTelecelData(payload);
        else result = await ismart.queryATData(payload);
      } else if (selectedCategory === "broadband") {
        if (!form.accountNumber && !form.destination) { toast.error("Enter landline or destination"); setQuerying(false); return; }
        
        const rawDest = form.destination || form.accountNumber;
        // If it's all digits, normalize it to international format (233...)
        const dest = /^\d+$/.test(rawDest) ? formatPhoneNumber(rawDest, 'international') : rawDest;
        
        const payload = { 
          Destination: dest, 
          Amount: 0, 
          ClientReference: `BB-${Date.now()}`,
          businessId: profile?.id
        };
        
        if (form.network === "MTN") result = await ismart.queryMTNBroadband(payload);
        else result = await ismart.queryTelecelBroadband(payload);
      } else if (selectedCategory === "tv") {
        if (!form.destination) { toast.error("Please enter account number"); setQuerying(false); return; }
        const payload = { Destination: form.destination, Amount: 0, ClientReference: `TV-${Date.now()}` };
        if (form.provider === "DStv") result = await ismart.queryDStv(payload);
        else if (form.provider === "GOtv") result = await ismart.queryGOtv(payload);
        else result = await ismart.queryStarTimes(payload);
      } else if (selectedCategory === "phone") {
        setIsVerified(true);
        setQueryResult({ success: true, message: "Ready to purchase airtime" });
        setQuerying(false);
        return;
      }

      if (result?.success) {
        const rawData = result.data;
        const normalizedDetails: any = { ...rawData };
        let linkedItems: any[] = [];

        // Normalize nested data structures from iSmart APIs
        if (rawData?.data?.Data && Array.isArray(rawData.data.Data)) {
           linkedItems = rawData.data.Data;
        } else if (rawData?.data?.bundles && Array.isArray(rawData.data.bundles)) {
           linkedItems = rawData.data.bundles;
        } else if (rawData?.data && Array.isArray(rawData.data)) {
           linkedItems = rawData.data;
        } else if (rawData?.Data && Array.isArray(rawData.Data)) {
           linkedItems = rawData.Data;
        } else if (rawData?.bundles && Array.isArray(rawData.bundles)) {
           linkedItems = rawData.bundles;
        } else if (Array.isArray(rawData)) {
           linkedItems = rawData;
        }

        if (linkedItems.length > 0) {
          // Check if this is a flattened key-value array (common in Water API)
          const isKeyValueFormat = linkedItems.some(item => 
            item.Display === "name" || item.Display === "amountDue" || item.Display === "sessionId"
          );

          if (isKeyValueFormat) {
            const nameItem = linkedItems.find(i => i.Display === "name");
            const amountItem = linkedItems.find(i => i.Display === "amountDue");
            const sessionItem = linkedItems.find(i => i.Display === "sessionId");
            
            const customerName = nameItem?.Value || "Customer";
            const amountDue = amountItem?.Amount || parseFloat(amountItem?.Value || "0");
            
            normalizedDetails.meters = [{
              display: `${customerName} (Due: GHS ${amountDue})`,
              value: form.accountNumber || form.destination,
              amount: amountDue,
              sessionId: sessionItem?.Value
            }];
          } else {
            normalizedDetails.meters = linkedItems.map((item: any) => ({
              display: item.Display || item.display || item.name || item.label || item.Value || item.value || item.code,
              value: item.Value || item.value || item.code || item.id || item.accountNumber,
              amount: item.Amount || item.amount || item.price || 0
            }));
          }
        }

        setQueryResult((selectedCategory === "internet" || selectedCategory === "broadband") ? (normalizedDetails.meters || []) : rawData);
        setCustomerDetails(normalizedDetails);
        setIsVerified(true);
        toast.success("Verification successful");
        
        // Auto-fill some fields if available
        if (normalizedDetails.meters && normalizedDetails.meters.length > 0) {
          const firstItem = normalizedDetails.meters[0];
          setForm(f => ({ 
            ...f, 
            accountNumber: firstItem.value,
            amount: firstItem.amount > 0 ? String(firstItem.amount) : f.amount,
            sessionId: firstItem.sessionId || f.sessionId
          }));
        }
        
        if (rawData?.amountDue) setForm(f => ({ ...f, amount: String(rawData.amountDue) }));
        if (rawData?.sessionId) setForm(f => ({ ...f, sessionId: rawData.sessionId }));
        if (rawData?.customerName || rawData?.name) {
          setCustomerDetails((prev: any) => ({ ...prev, customerName: rawData.customerName || rawData.name }));
        }
      } else {
        toast.error(result?.error || "Verification failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setQuerying(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedCategory || !form.amount) { toast.error("Fill required fields"); return; }
    if (!/^\d{4,6}$/.test(form.pin)) { toast.error("Enter your 4–6 digit transaction PIN"); return; }
    
    setProcessing(true);
    try {
      const amount = parseFloat(form.amount);
      const isPhoneTarget = selectedCategory === "phone" || selectedCategory === "internet";
      const rawDestination = isPhoneTarget ? form.destination : (form.accountNumber || form.destination);
      
      // For phone/internet, always format. For broadband, format only if it's all digits (landline).
      const normalizedDest = (isPhoneTarget || (selectedCategory === "broadband" && /^\d+$/.test(rawDestination))) 
        ? formatPhoneNumber(rawDestination, 'international') 
        : rawDestination;
      
      const basePayload = {
        Destination: normalizedDest,
        Amount: amount,
        CallbackUrl: `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ismart-callback`,
        ClientReference: form.clientReference || `${selectedCategory.toUpperCase()}-${Date.now()}`,
        businessId: profile?.id,
        pin: form.pin,
      };

      let result;
      if (selectedCategory === "phone") {
        const airtimePayload = { ...basePayload, ProductCode: "airtime" };
        if (form.network === "MTN") result = await ismart.buyMTNAirtime(airtimePayload);
        else if (form.network === "Telecel") result = await ismart.buyTelecelAirtime(airtimePayload);
        else result = await ismart.buyATAirtime(airtimePayload);
      } else if (selectedCategory === "internet") {
        const payload = { ...basePayload, BundleValue: form.bundleCode };
        if (form.network === "MTN") result = await ismart.buyMTNData(payload);
        else if (form.network === "Telecel") result = await ismart.buyTelecelData(payload);
        else result = await ismart.buyATData(payload);
      } else if (selectedCategory === "electricity") {
        result = await ismart.buyElectricity({ ...basePayload, ProductCode: "PD-006", Extradata: { bundle: form.accountNumber } });
      } else if (selectedCategory === "water") {
        result = await ismart.buyWater({ 
          ...basePayload, 
          Extradata: { 
            Phone: form.destination, 
            Bundle: `GHS ${amount}`, 
            Email: form.email,
            sessionId: form.sessionId
          } 
        });
      } else if (selectedCategory === "broadband") {
        if (form.network === "MTN") result = await ismart.buyMTNBroadband({ ...basePayload, ProductCode: form.bundleCode });
        else result = await ismart.buyTelecelBroadband({ ...basePayload, ProductCode: form.bundleCode });
      } else if (selectedCategory === "tv") {
        if (form.provider === "DStv") result = await ismart.buyDStv(basePayload);
        else if (form.provider === "GOtv") result = await ismart.buyGOtv(basePayload);
        else result = await ismart.buyStarTimes(basePayload);
      }

      if (result?.success) {
        toast.success("Payment processed successfully");
        if (profile?.id) {
          const utilityTypeMap: Record<string, string> = {
            phone: "airtime", internet: "data", electricity: "electricity",
            water: "water", broadband: "internet",
          };
          await supabase.from("utility_payments").insert({
            business_id: profile.id,
            utility_type: (utilityTypeMap[selectedCategory] || "other") as any,
            recipient_number: form.destination || form.accountNumber || "",
            amount: amount,
          });
          fetchPaymentHistory();
        }

        // Create transaction notification
        if (user?.id) {
          const categoryLabel = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
          await createTransactionNotification({
            userId: user.id,
            transactionId: `UTIL-${Date.now()}`,
            orderNumber: `UTIL-${Date.now().toString().slice(-6)}`,
            amount: amount,
            paymentMethod: `Utility - ${categoryLabel}`,
          });
        }

        setModalOpen(false);
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
    <div className="flex-1 overflow-auto bg-background/50 pb-20">
      <PageHeader 
        title="Utilities" 
        description="Simplify your utility payments securely."
        className="bg-background shadow-sm"
      />

      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-12 animate-in fade-in duration-700">
        {/* Category Grid */}
        <section className="space-y-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#111827]">
              Select Utility Provider
            </h2>
            <p className="text-sm text-[#6b7280]">
              Choose a provider to settle your bills instantly.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {UTILITY_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`group relative flex items-center gap-4 p-5 bg-white border border-[#e5e7eb] rounded-xl cursor-pointer transition-all hover:border-[#d1d5db] hover:shadow-md ${
                  selectedCategory === cat.id ? 'border-[hsl(225_60%_25%)] bg-[hsl(225_60%_25%)/10]' : ''
                }`}
              >
                <div className="w-12 h-12 flex items-center justify-center bg-[#f3f4f6] rounded-lg shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <img 
                    src={cat.icon} 
                    alt={cat.name} 
                    className="w-8 h-8 object-contain" 
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-[0.95rem] font-bold text-[#111827] mb-0.5">
                    {cat.name}
                  </h3>
                  <p className="text-[0.75rem] text-[#6b7280] line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="text-[#9ca3af] group-hover:text-[#6b7280] transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* History Grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-[#111827]">Recent Activity</h2>
              <p className="text-sm text-[#6b7280]">Your recent utility transactions and their status.</p>
            </div>
          </div>

          {loadingHistory ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-[#f9fafb] animate-pulse border border-[#e5e7eb]" />)}
            </div>
          ) : payments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {payments.map((p) => (
                <div key={p.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-5">
                    <div className="p-2.5 rounded-xl bg-[hsl(225_60%_25%)]/10 text-[hsl(225_60%_25%)]">
                      <Zap className="w-5 h-5" />
                    </div>
                    <Badge variant={p.status === "completed" ? "default" : "secondary"} className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-none ${
                      p.status === "completed" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-[#f3f4f6] text-[#6b7280]"
                    }`}>
                      {p.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5 mb-5">
                    <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">{p.utility_type}</p>
                    <p className="font-bold text-[#111827] text-lg truncate">{p.recipient_number}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#f3f4f6]">
                    <p className="text-xl font-black text-[#111827] tabular-nums">{formatCurrency(p.amount)}</p>
                    <div className="flex items-center gap-1.5 text-[#9ca3af]">
                      <Clock className="w-3 h-3" />
                      <p className="text-[10px] font-bold uppercase">{format(new Date(p.created_at), 'MMM d, HH:mm')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#e5e7eb] rounded-3xl py-16 flex flex-col items-center justify-center text-center space-y-4 bg-[#f9fafb]/50">
              <div className="p-5 rounded-3xl bg-white shadow-sm">
                <Clock className="w-10 h-10 text-[#d1d5db]" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-[#111827] text-lg">No recent activity</p>
                <p className="text-sm text-[#6b7280] max-w-[280px]">Transactions will appear here once you make your first payment.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Payment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-5 bg-[#f9fafb] border-b border-[#e5e7eb]">
            <div className="flex items-center justify-between w-full pr-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-white border border-[#e5e7eb] rounded-xl shadow-sm shrink-0">
                  <img 
                    src={selectedCategory ? UTILITY_CATEGORIES.find(c => c.id === selectedCategory)?.icon : ""} 
                    alt="" 
                    className="w-6 h-6 object-contain" 
                  />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-[#111827]">
                    {selectedCategory && UTILITY_CATEGORIES.find(c => c.id === selectedCategory)?.name} Payment
                  </DialogTitle>
                  <DialogDescription className="text-[#6b7280] mt-0.5 text-sm font-medium">
                    Complete the details below to settle your bill.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* 1. Network / Provider Selection (If applicable) */}
            {(selectedCategory === "phone" || selectedCategory === "internet" || selectedCategory === "broadband" || selectedCategory === "tv") && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">
                  {selectedCategory === "tv" ? "Select TV Provider" : "Select Network Provider"}
                </Label>
                {selectedCategory === "tv" ? (
                  <Select value={form.provider} onValueChange={(v) => { setForm(prev => ({ ...prev, provider: v, destination: "", accountNumber: "", amount: "" })); setIsVerified(false); }}>
                    <SelectTrigger className="h-12 bg-white border-[#e5e7eb] rounded-xl font-semibold shadow-sm">
                      <SelectValue placeholder="Choose TV provider" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#e5e7eb]">
                      {TV_PROVIDERS.map(p => <SelectItem key={p.id} value={p.id} className="font-medium">{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {NETWORKS.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { setForm(prev => ({ ...prev, network: n.id })); setIsVerified(false); }}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                          form.network === n.id 
                            ? "border-[hsl(225_60%_25%)] bg-[hsl(225_60%_25%)/10] ring-2 ring-[hsl(225_60%_25%)]/10" 
                            : "border-[#e5e7eb] bg-white hover:border-[hsl(225_60%_25%)]/30 hover:bg-[#f9fafb]"
                        }`}
                      >
                        <div className="h-8 w-8 flex items-center justify-center mb-2">
                          {n.logo ? (
                            <img src={n.logo} alt={n.name} className="max-h-full max-w-full object-contain rounded" />
                          ) : (
                            <span className="font-bold text-[10px]">{n.name}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#111827] uppercase tracking-wider">{n.name}</span>
                        {form.network === n.id && (
                          <div className="absolute -top-1.5 -right-1.5 bg-[hsl(225_60%_25%)] text-white rounded-full p-1 shadow-sm">
                            <CheckCircle className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Identification Fields (Progressive Disclosure) */}
            <div className="space-y-6">
              {/* Electricity specific Meter Type */}
              {selectedCategory === "electricity" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">Meter type</Label>
                  <Input
                    value="Prepaid"
                    readOnly
                    className="h-12 bg-[#f3f4f6] border-[#e5e7eb] rounded-xl font-bold"
                  />
                </div>
              )}

              {/* Phone Number / Destination / Landline */}
              {((selectedCategory === "phone" && form.network) || 
                (selectedCategory === "internet" && form.network) || 
                (selectedCategory === "broadband" && form.network) || 
                (selectedCategory === "electricity") || 
                (selectedCategory === "water") || 
                (selectedCategory === "tv" && form.provider)) && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">
                    {selectedCategory === "phone" || selectedCategory === "internet" ? "Recipient Phone Number" : 
                     selectedCategory === "electricity" ? "Phone number for this electricity account (Destination)" :
                     selectedCategory === "water" ? "Phone number for this water account (Destination)" :
                     selectedCategory === "broadband" && form.network === "MTN" ? "Destination (landline number)" :
                     selectedCategory === "broadband" && form.network === "Telecel" ? "Landline" :
                     selectedCategory === "tv" ? "Smart Card / Account Number" : "Recipient Number"}
                  </Label>
                   <div className="relative group">
                    {selectedCategory === "tv" ? (
                      <>
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] group-focus-within:text-[hsl(225_60%_25%)] transition-colors" />
                        <Input
                          placeholder="Enter smart card or account number"
                          className="pl-11 h-12 bg-white border-[#e5e7eb] rounded-xl font-medium shadow-sm focus:ring-[hsl(225_60%_25%)]/20 transition-all"
                          value={form.destination}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isVerified) handleVerify();
                          }}
                          onChange={(e) => {
                            setForm(prev => ({ ...prev, destination: e.target.value }));
                            if (isVerified) setIsVerified(false);
                          }}
                        />
                      </>
                    ) : selectedCategory === "broadband" ? (
                      <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] group-focus-within:text-[hsl(225_60%_25%)] transition-colors" />
                        <Input
                          placeholder={form.network === "MTN" ? "Enter MTN Broadband ID / Landline" : "Enter Telecel Landline"}
                          className="pl-11 h-12 bg-white border-[#e5e7eb] rounded-xl font-medium shadow-sm focus:ring-[hsl(225_60%_25%)]/20 transition-all"
                          value={form.destination}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isVerified) handleVerify();
                          }}
                          onChange={(e) => {
                            setForm(prev => ({ ...prev, destination: e.target.value }));
                            if (isVerified) setIsVerified(false);
                          }}
                        />
                      </div>
                    ) : (
                      <PhoneInput
                        placeholder={selectedCategory === "electricity" ? "e.g. 501234567" : 
                                     selectedCategory === "water" ? "Enter phone number" : "e.g. 241414141"}
                        className="h-12 bg-white border-[#e5e7eb] rounded-xl font-medium shadow-sm focus-within:ring-[hsl(225_60%_25%)]/20 transition-all"
                        value={form.destination}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isVerified) handleVerify();
                        }}
                        onChange={(value) => {
                          setForm(prev => ({ ...prev, destination: value }));
                          if (isVerified) setIsVerified(false);
                        }}
                      />
                    )}
                  </div>
                  {selectedCategory === "electricity" && (
                    <p className="text-[10px] text-[#6b7280] font-medium italic">(format: 233 followed by 9 digits, then press Enter)</p>
                  )}
                  {selectedCategory === "tv" && (
                    <p className="text-[10px] text-[#6b7280] font-medium italic">(Press Enter after typing the number)</p>
                  )}
                </div>
              )}

              {/* Water Meter Number (Always shown for water) */}
              {selectedCategory === "water" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">Meter Number</Label>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] group-focus-within:text-[hsl(225_60%_25%)] transition-colors" />
                    <Input
                      placeholder="Enter water meter number"
                      className="pl-11 h-12 bg-white border-[#e5e7eb] rounded-xl font-medium shadow-sm focus:ring-[hsl(225_60%_25%)]/20 transition-all"
                      value={form.accountNumber}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isVerified) handleVerify();
                      }}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, accountNumber: e.target.value }));
                        if (isVerified) setIsVerified(false);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 3. Verification Action */}
              {!isVerified && selectedCategory !== "phone" && (
                <Button 
                  onClick={handleVerify} 
                  disabled={querying || (!form.destination && !form.accountNumber)} 
                  className="w-full h-12 bg-[hsl(225_60%_25%)] hover:bg-[hsl(225_60%_20%)] text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all"
                >
                  {querying ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{selectedCategory === "internet" || selectedCategory === "broadband" ? "Checking bundles..." : "Verifying..."}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      <span>{selectedCategory === "internet" || selectedCategory === "broadband" ? "Check bundles" : "Verify"}</span>
                    </div>
                  )}
                </Button>
              )}

              {/* 4. Verified Fields & Payment (Shown after verification or if phone/airtime) */}
              {(isVerified || (selectedCategory === "phone" && form.destination && form.network)) && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  {/* Customer Details Display */}
                  <CustomerDetailsDisplay 
                    customerDetails={customerDetails} 
                    utilityType={selectedCategory} 
                    formatCurrency={formatCurrency} 
                  />

                  {/* Meter/Account Selection (If multiple options available) */}
                  {isVerified && (selectedCategory === "electricity" || selectedCategory === "water" || selectedCategory === "tv" || selectedCategory === "broadband") && customerDetails?.meters && customerDetails.meters.length > 0 && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">
                        Select Specific Account / Meter
                      </Label>
                      <Select 
                        value={form.accountNumber} 
                        onValueChange={(v) => {
                          const selected = customerDetails.meters.find((m: any) => m.value === v);
                          setForm(f => ({ 
                            ...f, 
                            accountNumber: v,
                            amount: selected?.amount > 0 ? String(selected.amount) : f.amount
                          }));
                        }}
                      >
                        <SelectTrigger className="h-14 bg-white border-[#e5e7eb] rounded-xl font-bold shadow-sm focus:ring-2 ring-primary/20 transition-all">
                          <SelectValue placeholder="Select account to pay" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[#e5e7eb] max-h-[300px]">
                          {customerDetails.meters.map((m: any) => (
                            <SelectItem key={m.id || m.value} value={m.value} className="py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-sm">{m.display || m.value}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">ID: {m.value} {m.amount > 0 ? `| Balance: GH₵${m.amount}` : ''}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Bundle Selection (Data / Broadband MTN) */}
                  {isVerified && (selectedCategory === "internet" || (selectedCategory === "broadband" && form.network === "MTN")) && queryResult && Array.isArray(queryResult) && (
                    <div className="space-y-3">
                      <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">
                        {selectedCategory === "internet" ? "Select data bundle" : "Select broadband bundle"}
                      </Label>
                      <Select 
                        value={form.bundleCode} 
                        onValueChange={(v) => {
                          const item = queryResult.find((i: any) => (i.id === v || i.code === v || i.value === v));
                          setForm(f => ({ 
                            ...f, 
                            bundleCode: v, 
                            bundleName: item?.name || item?.display || "", 
                            amount: item?.amount?.toString() || item?.price?.toString() || "" 
                          }));
                        }}
                      >
                        <SelectTrigger className="h-12 bg-white border-[#e5e7eb] rounded-xl font-semibold shadow-sm">
                          <SelectValue placeholder="Choose bundle" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[#e5e7eb]">
                          {queryResult.map((item: any, idx: number) => (
                            <SelectItem key={item.id || item.code || item.value || idx} value={item.id || item.code || item.value} className="font-medium">
                              {item.display || item.name} {item.amount ? `(GH₵${item.amount})` : item.price ? `(GH₵${item.price})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Additional Water Fields (Email, Session ID) */}
                  {selectedCategory === "water" && isVerified && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">Email</Label>
                        <Input
                          placeholder="Enter email for receipt"
                          className="h-12 bg-white border-[#e5e7eb] rounded-xl font-medium shadow-sm"
                          value={form.email}
                          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </>
                  )}

                  {/* Client Reference (Electricity, Water, Broadband Telecel, TV) */}
                  {(selectedCategory === "electricity" || selectedCategory === "water" || (selectedCategory === "broadband" && form.network === "Telecel") || selectedCategory === "tv") && isVerified && (
                    <div className="space-y-3">
                      <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">Client reference</Label>
                      <Input
                        placeholder="Enter client reference"
                        className="h-12 bg-white border-[#e5e7eb] rounded-xl font-medium shadow-sm"
                        value={form.clientReference}
                        onChange={(e) => setForm(prev => ({ ...prev, clientReference: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Bundle value (Telecel Broadband only) */}
                  {selectedCategory === "broadband" && form.network === "Telecel" && isVerified && (
                    <div className="space-y-3">
                      <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">Bundle value (e.g., 1GB)</Label>
                      <Input
                        placeholder="Enter bundle value"
                        className="h-12 bg-white border-[#e5e7eb] rounded-xl font-medium shadow-sm"
                        value={form.bundleName}
                        onChange={(e) => setForm(prev => ({ ...prev, bundleName: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Amount Field */}
                  <div className="space-y-3">
                    <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">
                      Amount (GH₵)
                    </Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#6b7280] group-focus-within:text-[hsl(225_60%_25%)] transition-colors">GH₵</div>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-14 h-12 bg-white border-[#e5e7eb] rounded-xl font-bold text-lg shadow-sm focus:ring-[hsl(225_60%_25%)]/20 transition-all"
                        value={form.amount}
                        onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                        readOnly={isVerified && (selectedCategory === "internet" || (selectedCategory === "broadband" && form.network === "MTN") || selectedCategory === "water")}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[0.75rem] font-bold uppercase tracking-widest text-[#6b7280]">Transaction PIN</Label>
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

                  {/* Payment Button */}
                  <Button 
                    onClick={handlePayment} 
                    disabled={processing || !form.amount || parseFloat(form.amount) <= 0} 
                    className="w-full h-14 bg-[#111827] hover:bg-[#1f2937] text-white font-bold rounded-xl shadow-xl transition-all hover:-translate-y-1 active:translate-y-0"
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        <span>Pay {form.amount ? formatCurrency(parseFloat(form.amount)) : ""}</span>
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

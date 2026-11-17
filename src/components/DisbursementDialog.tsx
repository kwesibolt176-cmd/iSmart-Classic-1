import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Send, Phone, Building2, Wallet, Users, MessageSquare, CheckCircle, Search } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { getBankLogo } from "@/utils/bankLogos";
import { createTransactionNotification } from "@/lib/transaction-notifications";
import { verifyAccount } from "@/lib/verify-account";
import { verifyFinancialDestination } from "@/lib/verify-financial-destination";
import { callMerchantApi } from "@/lib/merchant-api";
import { getFinancialAttempt } from "@/lib/financial-idempotency";
import type { FinancialAttempt } from "@/lib/financial-idempotency";
import { functionErrorMessage } from "@/lib/function-errors";
import { railHealth, useWalletPaymentMethods } from "@/hooks/use-wallet-payment-methods";

interface Beneficiary {
  id: string;
  name: string;
  account_number: string;
  account_name: string | null;
  bank_name: string | null;
  phone: string | null;
  is_verified: boolean;
}

interface PaymentProvider {
  id: string;
  name: string;
  slug: string;
  provider_type: string;
}

interface DisbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultBeneficiaryId?: string;
}

const MOBILE_NETWORKS = [
  { id: "MTN", name: "MTN Momo", logo: "/assets/mtnlogo.png" },
  { id: "TELECEL", name: "Telecel Cash", logo: "/assets/telecellogo.png" },
];

const GHANA_BANKS = [
  { value: 'ABS', label: 'Absa Bank Ghana', logo: '/banklogos/abs.png' },
  { value: 'ACC', label: 'Access Bank Ghana', logo: '/banklogos/acc.ico' },
  { value: 'ADB', label: 'Agricultural Development Bank', logo: '/banklogos/adb.ico' },
  { value: 'BOA', label: 'Bank of Africa Ghana', logo: '/banklogos/boa.png' },
  { value: 'CAL', label: 'CAL Bank', logo: '/banklogos/cal.png' },
  { value: 'CBG', label: 'Consolidated Bank Ghana', logo: '/banklogos/cbg.png' },
  { value: 'ECB', label: 'Ecobank Ghana', logo: '/banklogos/ecb.png' },
  { value: 'FBN', label: 'FBNBank Ghana', logo: '/banklogos/fbn.png' },
  { value: 'FID', label: 'Fidelity Bank Ghana', logo: '/banklogos/fid.png' },
  { value: 'FAB', label: 'First Atlantic Bank', logo: '/banklogos/fab.ico' },
  { value: 'FNB', label: 'First National Bank Ghana', logo: '/banklogos/fnb.png' },
  { value: 'GCB', label: 'GCB Bank', logo: '/banklogos/gcb.png' },
  { value: 'GTB', label: 'Guaranty Trust Bank Ghana', logo: '/banklogos/gtb.png' },
  { value: 'NIB', label: 'National Investment Bank', logo: '/banklogos/nib.ico' },
  { value: 'OMN', label: 'OmniBSIC Bank', logo: '/banklogos/omn.ico' },
  { value: 'PBL', label: 'Prudential Bank', logo: '/banklogos/pbl.ico' },
  { value: 'REP', label: 'Republic Bank Ghana', logo: '/banklogos/rep.ico' },
  { value: 'SGG', label: 'Societe Generale Ghana', logo: '/banklogos/sgg.ico' },
  { value: 'STB', label: 'Stanbic Bank Ghana', logo: '/banklogos/stb.ico' },
  { value: 'SCB', label: 'Standard Chartered Bank Ghana', logo: '/banklogos/scb.ico' },
  { value: 'UBA', label: 'United Bank for Africa Ghana', logo: '/banklogos/uba.ico' },
  { value: 'UMB', label: 'Universal Merchant Bank', logo: '/banklogos/umb.svg' },
  { value: 'ZEN', label: 'Zenith Bank Ghana', logo: '/banklogos/zen.ico' },
];

const mapToIVerifyOperator = (provider: string) => {
  const map: Record<string, string> = {
    MTN: "mtn", TELECEL: "vodafone", VODAFONE: "vodafone", AIRTELTIGO: "airteltigo",
  };
  return map[provider?.toUpperCase()] || provider?.toLowerCase();
};

export function DisbursementDialog({ open, onOpenChange, onSuccess, defaultBeneficiaryId }: DisbursementDialogProps) {
  const { profile, user } = useBusiness();
  const { methods: paymentMethods, loading: paymentMethodsLoading } = useWalletPaymentMethods(profile, open);
  const [sending, setSending] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const requestAttempt = useRef<FinancialAttempt | null>(null);

  // iVerify — Mobile Money
  const [mmValidating, setMmValidating] = useState(false);
  const [mmFetched, setMmFetched] = useState(false);
  const [mmAccountName, setMmAccountName] = useState("");
  const [mobileVerificationProof, setMobileVerificationProof] = useState("");

  // iVerify — Bank
  const [bankValidating, setBankValidating] = useState(false);
  const [bankFetched, setBankFetched] = useState(false);
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankVerifiedName, setBankVerifiedName] = useState("");

  // iSmartpay — Wallet
  const [walletValidating, setWalletValidating] = useState(false);
  const [walletFetched, setWalletFetched] = useState(false);
  const [walletAccountName, setWalletAccountName] = useState("");

  const [sendForm, setSendForm] = useState({
    beneficiaryId: "",
    amount: "",
    destinationType: "" as "mobile_money" | "bank" | "wallet" | "",
    recipientName: "",
    recipientAccount: "",
    recipientPhone: "",
    providerId: "",
    bankCode: "",
    narration: "",
    pin: "",
  });

  const resetVerify = () => {
    setMmFetched(false); setMmAccountName(""); setMobileVerificationProof("");
    setBankFetched(false); setBankHolderName(""); setBankVerifiedName("");
    setWalletFetched(false); setWalletAccountName("");
  };

  useEffect(() => {
    if (open) {
      fetchInitialData();
      if (defaultBeneficiaryId) {
        setSendForm(prev => ({ ...prev, beneficiaryId: defaultBeneficiaryId }));
      }
    }
  }, [open, defaultBeneficiaryId]);

  const fetchInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [beneficiariesRes, providersRes] = await Promise.all([
        supabase.from('beneficiaries').select('*').eq('business_id', profile?.id).eq('is_active', true).order('name'),
        supabase.from('payment_providers').select('*').eq('is_active', true).eq('supports_disbursement', true),
      ]);
      if (beneficiariesRes.data) setBeneficiaries(beneficiariesRes.data);
      if (providersRes.data) setProviders(providersRes.data);
    } catch (error) {
      console.error('Error fetching disbursement data:', error);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Helper to detect mobile operator from phone number
  const detectOperator = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '').replace(/^\+233/, '0');
    if (cleanPhone.length < 3) return null;
    
    const prefix = cleanPhone.substring(0, 3);
    
    const mtnPrefixes = ['024', '025', '053', '054', '055', '059'];
    const telecelPrefixes = ['020', '050'];
    const atPrefixes = ['026', '056', '027', '057'];

    if (mtnPrefixes.includes(prefix)) return 'MTN';
    if (telecelPrefixes.includes(prefix)) return 'TELECEL';
    if (atPrefixes.includes(prefix)) return null;
    
    return null;
  };

  // Auto-detect operator for Mobile Money
  useEffect(() => {
    if (sendForm.destinationType === 'mobile_money') {
      const detected = detectOperator(sendForm.recipientPhone);
      if (detected) {
        if (detected !== sendForm.providerId) {
          setSendForm(prev => ({ ...prev, providerId: detected }));
          setMmFetched(false);
          setMmAccountName("");
          setMobileVerificationProof("");
        }
      } else if (!sendForm.recipientPhone && sendForm.providerId) {
        // Clear selection when prefix is cleared
        setSendForm(prev => ({ ...prev, providerId: "" }));
        setMmFetched(false);
        setMmAccountName("");
        setMobileVerificationProof("");
      }
    }
  }, [sendForm.recipientPhone, sendForm.destinationType]);

  const handleFetchMobile = async () => {
    if (!sendForm.recipientPhone || !sendForm.providerId) return;
    setMmValidating(true);
    try {
      const num = formatPhoneNumber(sendForm.recipientPhone, 'local');
      const data = await verifyFinancialDestination({ businessId: profile?.id, phoneNumber: num, provider: mapToIVerifyOperator(sendForm.providerId) });
      const name = data?.data?.accountname || data?.data?.accountName || data?.data?.account_name || data?.data?.name || data?.accountname || data?.name || data?.account_name || data?.accountName;
      if (!name) throw new Error("Could not verify account details");
      setMmFetched(true);
      setMmAccountName(name);
      setMobileVerificationProof(data.verificationProof);
      setSendForm(prev => ({ ...prev, recipientName: name }));
      toast.success(`Account verified: ${name}`);
    } catch (e: any) {
      toast.error(e.message || "Could not fetch account details");
    } finally {
      setMmValidating(false);
    }
  };

  const handleFetchBank = async () => {
    if (!sendForm.recipientAccount || !sendForm.bankCode) return;
    setBankValidating(true);
    try {
      const data = await verifyAccount({ channel: "bank", mobile_number: "", account_number: sendForm.recipientAccount.trim(), bank_code: sendForm.bankCode, operator: "mtn" });
      const name = data?.data?.accountname || data?.data?.accountName || data?.data?.account_name || data?.data?.name || data?.accountname || data?.name || data?.account_name || data?.accountName;
      const bName = data?.bank_name || data?.data?.bank_name || "";
      if (!name) throw new Error("Could not verify account details");
      setBankFetched(true);
      setBankHolderName(name);
      if (bName) setBankVerifiedName(bName);
      setSendForm(prev => ({ ...prev, recipientName: name }));
      toast.success(`Account verified: ${name}`);
    } catch (e: any) {
      toast.error(e.message || "Could not fetch account details");
    } finally {
      setBankValidating(false);
    }
  };

  const handleFetchWallet = async () => {
    if (!sendForm.recipientPhone) return;
    setWalletValidating(true);
    try {
      const merchantBusinessId = localStorage.getItem("ismart_business_id");
      if (!merchantBusinessId) throw new Error("Merchant business is not linked");
      const data = await callMerchantApi<{ businessName?: string; ownerName?: string; handle: string }>(
        "getWalletRecipient",
        { path: { id: merchantBusinessId, handle: sendForm.recipientPhone } },
      );
      const displayName = data.businessName || data.ownerName || data.handle;

      setWalletFetched(true);
      setWalletAccountName(displayName);
      setSendForm(prev => ({ ...prev, recipientName: displayName }));
      toast.success(`Wallet verified: ${displayName}`);
    } catch (e: any) {
      toast.error(e.message || "Could not verify wallet details");
    } finally {
      setWalletValidating(false);
    }
  };

  const handleSendMoney = async () => {
    if (!sendForm.amount) { toast.error("Please enter amount"); return; }
    if (!/^\d{4,6}$/.test(sendForm.pin)) { toast.error("Enter your 4–6 digit transaction PIN"); return; }
    if (!sendForm.destinationType && !sendForm.beneficiaryId) { toast.error("Please choose a destination or beneficiary"); return; }
    if (sendForm.destinationType === 'wallet' && !walletFetched && !sendForm.beneficiaryId) { toast.error("Please verify wallet first"); return; }
    if (sendForm.destinationType === 'bank' && (!sendForm.bankCode || !sendForm.recipientAccount.trim() || !sendForm.recipientName.trim())) {
      toast.error("Enter the bank, account number and confirmed account holder name");
      return;
    }

    setSending(true);
    try {
      const selectedBeneficiary = beneficiaries.find(b => b.id === sendForm.beneficiaryId);
      const recipientPhone = selectedBeneficiary?.phone || sendForm.recipientPhone;
      const recipientAccount = selectedBeneficiary?.account_number || sendForm.recipientAccount;
      const recipientName = selectedBeneficiary?.name || sendForm.recipientName;
      const recipientBankName = selectedBeneficiary?.bank_name;

      const channel = sendForm.destinationType === "mobile_money" ? "MOBILE_MONEY" :
        sendForm.destinationType === "bank" ? "BANK" :
        sendForm.destinationType === "wallet" ? "WALLET" :
        (recipientPhone && /^(\+?233|0)?[0-9]{9,10}$/.test(recipientPhone.replace(/\s/g, '')) ? "MOBILE_MONEY" : "BANK");

      const provider = channel === "MOBILE_MONEY"
        ? ((sendForm.providerId === "VODAFONE" ? "TELECEL" : sendForm.providerId) || "MTN")
        : (sendForm.bankCode || recipientBankName || sendForm.providerId || "GTB");

      if (channel === "MOBILE_MONEY" && (!mmFetched || !mobileVerificationProof)) {
        toast.error("Please verify the mobile money number first");
        return;
      }

      const nameParts = recipientName.split(' ');
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const requestBody = {
          businessId: profile?.id,
          amount: parseFloat(sendForm.amount),
          firstName, lastName,
          phoneNumber: recipientPhone,
          handle: channel === "WALLET" ? recipientPhone : undefined,
          channel, provider,
          narration: sendForm.narration || 'Payment',
          accountNumber: channel !== "MOBILE_MONEY" ? recipientAccount : undefined,
          accountName: channel !== "MOBILE_MONEY" ? recipientName : undefined,
          bankCode: channel !== "MOBILE_MONEY" ? (sendForm.bankCode || recipientBankName || provider) : undefined,
          currency: profile?.currency || 'GHS',
          pin: sendForm.pin,
          verificationProof: channel === "MOBILE_MONEY" ? mobileVerificationProof : undefined,
      };
      const fingerprint = JSON.stringify(requestBody);
      requestAttempt.current = getFinancialAttempt(requestAttempt.current, fingerprint);
      const { data, error } = await supabase.functions.invoke('process-disbursement', {
        body: { ...requestBody, clientRequestId: requestAttempt.current.requestId },
      });

      if (error) throw new Error(await functionErrorMessage(error, data, "Failed to initiate transfer"));

      if (data?.success) {
        requestAttempt.current = null;
        toast.success(data.message || "Transfer initiated successfully");

        // Create disbursement notification
        if (user?.id && sendForm.amount) {
          try {
            await createTransactionNotification({
              userId: user.id,
              transactionId: data.reference,
              orderNumber: data.reference,
              amount: parseFloat(sendForm.amount),
              paymentMethod: `Disbursement - ${sendForm.destinationType || 'Transfer'}`,
              customerName: sendForm.recipientName || undefined,
              customerPhone: sendForm.recipientPhone || undefined,
            });
          } catch (notificationError) {
            console.error("Transfer notification could not be created", notificationError);
          }
        }

        onOpenChange(false);
        setSendForm({ beneficiaryId: "", amount: "", destinationType: "", recipientName: "", recipientAccount: "", recipientPhone: "", providerId: "", bankCode: "", narration: "", pin: "" });
        resetVerify();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data?.message || data?.error || "Failed to initiate transfer");
      }
    } catch (error: unknown) {
      console.error('Error sending money:', error);
      toast.error(error instanceof Error ? error.message : "Failed to initiate transfer");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg overflow-y-auto max-h-[90vh] custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Send className="h-4 w-4 text-primary" />
            </div>
            Send Money
          </DialogTitle>
          <DialogDescription>Quickly transfer funds to any destination</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loadingInitial ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Amount */}
              <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  1. Transaction Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
                    {profile?.currency || 'GHS'}
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-14 h-14 text-2xl font-bold bg-background border-2 focus-visible:ring-primary/20"
                    value={sendForm.amount}
                    onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                  />
                </div>
              </div>

              {/* Beneficiaries */}
              {beneficiaries.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Quick Selection
                  </Label>
                  <Select
                    value={sendForm.beneficiaryId}
                    onValueChange={(v) => {
                      if (v === "none") { setSendForm({ ...sendForm, beneficiaryId: "", destinationType: "" }); resetVerify(); return; }
                      const b = beneficiaries.find(bn => bn.id === v);
                      if (b) {
                        const identifier = b.phone || b.account_number || "";
                        const cleanId = identifier.replace(/\s/g, '');
                        const isMoMo = cleanId.length <= 10;
                        setSendForm({ ...sendForm, beneficiaryId: v, destinationType: isMoMo ? "mobile_money" : "bank", recipientName: b.name, recipientPhone: isMoMo ? cleanId : (b.phone || ""), recipientAccount: b.account_number, providerId: b.bank_name || "" });
                        resetVerify();
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose saved beneficiary" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">New Recipient</SelectItem>
                      {beneficiaries.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name} - {b.account_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Destination Type Tiles */}
              {!sendForm.beneficiaryId && (
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    2. Choose Destination
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'mobile_money' as const, label: 'Mobile Money', icon: Phone, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
                      { id: 'bank' as const, label: 'Bank Account', icon: Building2, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
                      { id: 'wallet' as const, label: 'App Wallet', icon: Wallet, color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => { setSendForm({ ...sendForm, destinationType: method.id, providerId: "", bankCode: "" }); resetVerify(); }}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                          sendForm.destinationType === method.id
                            ? `${method.color} ring-2 ring-primary border-primary/50`
                            : 'bg-background border-border hover:border-primary/30 hover:bg-muted/30'
                        }`}
                      >
                        <method.icon className="h-6 w-6" />
                        <span className="text-[10px] font-bold uppercase tracking-tight text-center">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Fields */}
              {sendForm.destinationType && (
                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 gap-4">

                    {/* Mobile Money */}
                    {sendForm.destinationType === 'mobile_money' && (
                      <>
                        {/* Logo Network Selector */}
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Mobile Network *</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {MOBILE_NETWORKS.map((net) => (
                              (() => {
                                const health = railHealth(paymentMethods, "disbursement", net.id, "GHS");
                                const unavailable = paymentMethods !== null && health !== "healthy";
                                return (
                              <button
                                key={net.id}
                                type="button"
                                onClick={() => { setSendForm({ ...sendForm, providerId: net.id }); setMmFetched(false); setMmAccountName(""); setMobileVerificationProof(""); }}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium",
                                  sendForm.providerId === net.id ? "border-primary bg-primary/8 shadow-sm" : "border-border bg-card hover:border-primary/40"
                                )}
                              >
                                <img src={net.logo} alt={net.name} className="w-7 h-7 object-contain rounded" />
                                <span className="text-[10px] text-left leading-tight">{net.name}</span>
                                {sendForm.providerId === net.id && <CheckCircle className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />}
                                {unavailable && <span className="text-[10px] text-destructive ml-auto">Processor reports down</span>}
                              </button>
                                );
                              })()
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Mobile Number *</Label>
                          <PhoneInput
                            placeholder="Enter mobile number"
                            value={sendForm.recipientPhone}
                            onChange={(value) => { setSendForm({ ...sendForm, recipientPhone: value }); setMmFetched(false); setMmAccountName(""); setMobileVerificationProof(""); }}
                          />
                        </div>

                        {/* Fetch Button */}
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("w-full gap-2 transition-all", mmFetched && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30")}
                          onClick={handleFetchMobile}
                          disabled={paymentMethodsLoading || mmValidating || mmFetched || !sendForm.recipientPhone || !sendForm.providerId}
                        >
                          {mmValidating ? <><RefreshCw className="h-4 w-4 animate-spin" /> Fetching...</> : mmFetched ? <><CheckCircle className="h-4 w-4" /> Details Verified</> : <><Search className="h-4 w-4" /> Fetch Account Details</>}
                        </Button>

                        {(mmFetched || mmAccountName) && (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              Account Name
                              <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider bg-green-100 dark:bg-green-950 px-1.5 py-0.5 rounded-full ml-1">Verified</span>
                            </Label>
                            <Input value={mmAccountName} readOnly disabled className="bg-muted/60 cursor-not-allowed font-semibold" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Bank Account */}
                    {sendForm.destinationType === 'bank' && (
                      <>
                        {/* Bank Select with logos */}
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Bank *</Label>
                          <Select
                            value={sendForm.bankCode}
                            onValueChange={(v) => { setSendForm({ ...sendForm, bankCode: v, providerId: v }); setBankFetched(false); setBankHolderName(""); setBankVerifiedName(""); }}
                          >
                            <SelectTrigger className="h-12 bg-muted/10 border-border/60">
                              <SelectValue placeholder="Choose your bank">
                                {sendForm.bankCode && (() => {
                                  const bank = GHANA_BANKS.find(b => b.value === sendForm.bankCode);
                                  return bank ? (
                                    <div className="flex items-center gap-2">
                                      {getBankLogo(bank.label) && <img src={getBankLogo(bank.label)!} alt="" className="w-5 h-5 rounded-sm object-contain bg-white shrink-0 shadow-sm" />}
                                      <span>{bank.label}</span>
                                    </div>
                                  ) : null;
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {GHANA_BANKS.map((bank) => (
                                <SelectItem key={bank.value} value={bank.value}>
                                  <div className="flex items-center gap-3 py-1">
                                    {getBankLogo(bank.label) && <img src={getBankLogo(bank.label)!} alt="" className="w-5 h-5 rounded-sm object-contain bg-white shrink-0 shadow-sm" />}
                                    <span className="font-medium">{bank.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Account Number *</Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Enter bank account number"
                              className="pl-9"
                              value={sendForm.recipientAccount}
                              onChange={(e) => { setSendForm({ ...sendForm, recipientAccount: e.target.value }); setBankFetched(false); setBankHolderName(""); setBankVerifiedName(""); }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Account Holder Name *</Label>
                          <Input
                            value={sendForm.recipientName}
                            onChange={(event) => setSendForm({ ...sendForm, recipientName: event.target.value })}
                            placeholder="Enter the name exactly as registered at the bank"
                          />
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            The Merchant API does not provide beneficiary bank lookup. Confirm the bank, account number and holder name with the recipient before sending.
                          </p>
                        </div>
                      </>
                    )}

                    {/* Wallet */}
                    {sendForm.destinationType === 'wallet' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">iSmartPay handle *</Label>
                          <Input
                            placeholder="@business-handle"
                            value={sendForm.recipientPhone}
                            onChange={(event) => {
                              setSendForm({ ...sendForm, recipientPhone: event.target.value });
                              setWalletFetched(false);
                              setWalletAccountName("");
                            }}
                          />
                        </div>

                        {/* Fetch Button */}
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("w-full gap-2 transition-all", walletFetched && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30")}
                          onClick={handleFetchWallet}
                          disabled={walletValidating || walletFetched || !sendForm.recipientPhone}
                        >
                          {walletValidating ? <><RefreshCw className="h-4 w-4 animate-spin" /> Verifying...</> : walletFetched ? <><CheckCircle className="h-4 w-4" /> Wallet Verified</> : <><Search className="h-4 w-4" /> Verify Wallet</>}
                        </Button>

                        {(walletFetched || walletAccountName) && (
                          <div className="space-y-2 mt-4">
                            <Label className="flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              Account Name
                              <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider bg-green-100 dark:bg-green-950 px-1.5 py-0.5 rounded-full ml-1">Verified</span>
                            </Label>
                            <Input value={walletAccountName} readOnly disabled className="bg-muted/60 cursor-not-allowed font-semibold" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Recipient name is auto-filled by fetch account details */}
                  </div>
                </div>
              )}

              {/* Narration */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  3. Description
                </Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    placeholder="What is this transfer for? (Optional)"
                    className="pl-9 min-h-[80px] resize-none"
                    value={sendForm.narration}
                    onChange={(e) => setSendForm({ ...sendForm, narration: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-pin">Transaction PIN</Label>
                <Input
                  id="transaction-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  minLength={4}
                  maxLength={6}
                  value={sendForm.pin}
                  onChange={(event) => setSendForm({ ...sendForm, pin: event.target.value.replace(/\D/g, "") })}
                  placeholder="4–6 digit PIN"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-11">
            Cancel
          </Button>
          <Button
            onClick={handleSendMoney}
            disabled={sending || !sendForm.amount || (!sendForm.destinationType && !sendForm.beneficiaryId)}
            className="w-full sm:w-auto h-11 px-8 shadow-md hover:shadow-lg transition-all"
          >
            {sending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Complete Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

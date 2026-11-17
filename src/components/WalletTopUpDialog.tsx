import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, CheckCircle, Search, Smartphone, Building2 } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { getBankLogo } from "@/utils/bankLogos";
import { verifyAccount } from "@/lib/verify-account";
import { verifyFinancialDestination } from "@/lib/verify-financial-destination";
import { getFinancialAttempt } from "@/lib/financial-idempotency";
import type { FinancialAttempt } from "@/lib/financial-idempotency";
import { functionErrorMessage } from "@/lib/function-errors";
import { railHealth, useWalletPaymentMethods } from "@/hooks/use-wallet-payment-methods";

interface WalletTopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currency?: string;
}

const MOBILE_PROVIDERS = [
  { id: "MTN", name: "MTN Mobile Money", logo: "/assets/mtnlogo.png" },
  { id: "TELECEL", name: "Telecel Cash", logo: "/assets/telecellogo.png" },
];

const GHANA_BANKS = [
  { value: 'ABS', label: 'Absa Bank Ghana', logo: '/banklogos/absa bank.png' },
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
  { value: 'UMB', label: 'Universal Merchant Bank', logo: '/banklogos/umb.png' },
  { value: 'ZEN', label: 'Zenith Bank Ghana', logo: '/banklogos/zen.ico' },
];

const mapToIVerifyOperator = (provider: string) => {
  const map: Record<string, string> = {
    MTN: "mtn",
    TELECEL: "vodafone",
    VODAFONE: "vodafone",
    AIRTELTIGO: "airteltigo",
  };
  return map[provider?.toUpperCase()] || provider?.toLowerCase();
};

export function WalletTopUpDialog({ open, onOpenChange, onSuccess, currency = "GHS" }: WalletTopUpDialogProps) {
  const { profile } = useBusiness();
  const { methods: paymentMethods, loading: paymentMethodsLoading } = useWalletPaymentMethods(profile, open);
  const [processing, setProcessing] = useState(false);
  const [isValidatingAccount, setIsValidatingAccount] = useState(false);
  const [accountDetailsFetched, setAccountDetailsFetched] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [mobileVerificationProof, setMobileVerificationProof] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mobile" | "bank">("mobile");

  // Bank account verification state
  const [bankValidating, setBankValidating] = useState(false);
  const [bankFetched, setBankFetched] = useState(false);
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankVerifiedName, setBankVerifiedName] = useState("");
  const requestAttempt = useRef<FinancialAttempt | null>(null);

  const [topupForm, setTopupForm] = useState({
    amount: "",
    provider: "MTN",
    phoneNumber: "",
    firstName: "",
    lastName: "",
    channel: "MOMO",
    // Bank transfer fields
    senderBank: "",
    senderAccountNumber: "",
    senderAccountName: "",
    transactionReference: "",
  });

  const handlePhoneChange = (value: string) => {
    setTopupForm((prev) => ({ ...prev, phoneNumber: value }));
    setAccountDetailsFetched(false);
    setAccountName("");
    setMobileVerificationProof("");
  };

  const handleProviderChange = (providerId: string) => {
    setTopupForm((prev) => ({ ...prev, provider: providerId }));
    setAccountDetailsFetched(false);
    setAccountName("");
    setMobileVerificationProof("");
  };

  const handleFetchAccountDetails = async () => {
    if (!topupForm.phoneNumber.trim() || !topupForm.provider) return;

    setIsValidatingAccount(true);
    try {
      const mobileNumber = formatPhoneNumber(topupForm.phoneNumber, 'local');
      const operator = mapToIVerifyOperator(topupForm.provider);

      const data = await verifyFinancialDestination({
          businessId: profile?.id,
          phoneNumber: mobileNumber,
          provider: operator,
      });

      const name =
        data?.data?.accountname ||
        data?.data?.accountName ||
        data?.data?.account_name ||
        data?.data?.name ||
        data?.accountname ||
        data?.name ||
        data?.account_name ||
        data?.accountName;

      if (!name) throw new Error("Could not verify account details");

      setAccountDetailsFetched(true);
      setAccountName(name);
      setMobileVerificationProof(data.verificationProof);
      toast.success(`Account verified: ${name}`);
    } catch (error: any) {
      toast.error(error.message || "Could not fetch account details");
    } finally {
      setIsValidatingAccount(false);
    }
  };

  const handleFetchBankAccountDetails = async () => {
    if (!topupForm.senderAccountNumber || !topupForm.senderBank) return;
    setBankValidating(true);
    try {
      const data = await verifyAccount({
          channel: "bank",
          mobile_number: "",
          account_number: topupForm.senderAccountNumber.trim(),
          bank_code: topupForm.senderBank,
          operator: "mtn",
      });
      const name = data?.data?.accountname || data?.data?.accountName || data?.data?.account_name || data?.data?.name || data?.accountname || data?.name || data?.account_name || data?.accountName;
      const bName = data?.bank_name || data?.data?.bank_name || "";
      if (!name) throw new Error("Could not verify account details");
      setBankFetched(true);
      setBankAccountName(name);
      if (bName) setBankVerifiedName(bName);
      setTopupForm(prev => ({ ...prev, senderAccountName: name }));
      toast.success(`Account verified: ${name}`);
    } catch (e: any) {
      toast.error(e.message || "Could not fetch account details");
    } finally {
      setBankValidating(false);
    }
  };

  const handleTopup = async () => {
    if (!topupForm.amount) {
      toast.error("Please enter amount");
      return;
    }

    const amount = parseFloat(topupForm.amount);
    if (amount <= 0 || amount > 1000000) {
      toast.error("Amount must be between 0.01 and 1,000,000");
      return;
    }

    // Validation for different payment methods
    if (paymentMethod === "mobile") {
      if (!topupForm.phoneNumber) {
        toast.error("Please enter phone number");
        return;
      }
      if (!accountDetailsFetched || !mobileVerificationProof) {
        toast.error("Please verify the mobile money number first");
        return;
      }
    } else if (paymentMethod === "bank") {
      if (!topupForm.senderBank || !topupForm.senderAccountNumber || !bankAccountName || !topupForm.transactionReference) {
        toast.error("Please fill all bank transfer details");
        return;
      }
    }

    setProcessing(true);
    try {
      const requestBody = {
          businessId: profile?.id,
          amount,
          firstName: topupForm.firstName || profile?.business_name?.split(" ")[0] || "Customer",
          lastName: topupForm.lastName || profile?.business_name?.split(" ").slice(1).join(" ") || "User",
          phoneNumber: topupForm.phoneNumber,
          provider: topupForm.provider,
          channel: paymentMethod === "mobile" ? topupForm.channel : "BANK",
          currency,
          // Bank transfer specific fields
          senderBank: topupForm.senderBank,
          senderAccountNumber: topupForm.senderAccountNumber,
          senderAccountName: topupForm.senderAccountName,
          transactionReference: topupForm.transactionReference,
          paymentMethod,
          verificationProof: paymentMethod === "mobile" ? mobileVerificationProof : undefined,
      };
      const fingerprint = JSON.stringify(requestBody);
      requestAttempt.current = getFinancialAttempt(requestAttempt.current, fingerprint);
      const { data, error } = await supabase.functions.invoke("wallet-topup", {
        body: { ...requestBody, clientRequestId: requestAttempt.current.requestId },
      });

      if (error) {
        throw new Error(await functionErrorMessage(error, data, "Failed to initiate top-up"));
      }

      if (data?.success) {
        requestAttempt.current = null;
        const message = paymentMethod === "mobile" 
          ? "Check your phone for payment prompt"
          : "Bank transfer details submitted for verification";
        toast.success(data.message || message);
        onOpenChange(false);
        setTopupForm({ 
          amount: "", 
          provider: "MTN", 
          phoneNumber: "", 
          firstName: "", 
          lastName: "", 
          channel: "MOMO",
          senderBank: "",
          senderAccountNumber: "",
          senderAccountName: "",
          transactionReference: "",
        });
        setAccountDetailsFetched(false);
        setAccountName("");
        setMobileVerificationProof("");
        setBankFetched(false);
        setBankAccountName("");
        setBankVerifiedName("");
        if (onSuccess) onSuccess();
      } else {
        toast.error(data?.message || "Failed to initiate top-up");
      }
    } catch (error: unknown) {
      console.error("Top-up error:", error);
      const rawMessage = error instanceof Error ? error.message : "An error occurred during top-up";
      const message = /iSmart API returned 5\d\d|Edge function returned 5\d\d|status code 5\d\d/i.test(rawMessage)
        ? "iSmart payment service is temporarily unavailable. Please try again shortly."
        : rawMessage;
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
          <DialogDescription>Fund your wallet using Mobile Money or Bank Transfer</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={topupForm.amount}
              onChange={(e) => setTopupForm({ ...topupForm, amount: e.target.value })}
            />
          </div>

          {/* Payment Method Tabs */}
          <Tabs value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mobile" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Money
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bank Transfer
              </TabsTrigger>
            </TabsList>

            {/* Mobile Money Tab */}
            <TabsContent value="mobile" className="space-y-4 mt-4">
              {/* Network Selector with Logos */}
              <div className="space-y-2">
                <Label>Mobile Network *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {MOBILE_PROVIDERS.map((provider) => (
                    (() => {
                      const health = railHealth(paymentMethods, "collection", provider.id, currency);
                      const unavailable = paymentMethods !== null && health === "down";
                      return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => handleProviderChange(provider.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 px-3 py-3 rounded-xl border-2 transition-all duration-150 font-medium text-xs",
                        topupForm.provider === provider.id
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                      )}
                    >
                      <img src={provider.logo} alt={provider.name} className="w-10 h-10 object-contain rounded-md" />
                      <span className="text-center leading-tight text-[10px]">{provider.name}</span>
                      {topupForm.provider === provider.id && (
                        <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      {unavailable && <span className="text-[10px] text-destructive">Processor reports down</span>}
                    </button>
                      );
                    })()
                  ))}
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <PhoneInput
                  value={topupForm.phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="Enter phone number"
                />
                <p className="text-xs text-muted-foreground">
                  You'll receive a prompt on this number to approve the payment
                </p>
              </div>

              {/* Fetch Account Details Button */}
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full gap-2 transition-all",
                  accountDetailsFetched && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30"
                )}
                onClick={handleFetchAccountDetails}
                disabled={paymentMethodsLoading || isValidatingAccount || accountDetailsFetched || !topupForm.phoneNumber || !topupForm.provider}
              >
                {isValidatingAccount ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Fetching...</>
                ) : accountDetailsFetched ? (
                  <><CheckCircle className="h-4 w-4" /> Details Verified</>
                ) : (
                  <><Search className="h-4 w-4" /> Fetch Account Details</>
                )}
              </Button>

              {/* Verified Account Name */}
              {(accountDetailsFetched || accountName) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Account Name
                    <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider bg-green-100 dark:bg-green-950 px-1.5 py-0.5 rounded-full ml-1">
                      Verified
                    </span>
                  </Label>
                  <Input
                    value={accountName}
                    readOnly
                    disabled
                    className="bg-muted/60 cursor-not-allowed font-semibold text-foreground"
                  />
                </div>
              )}
            </TabsContent>

            {/* Bank Transfer Tab */}
            <TabsContent value="bank" className="space-y-4 mt-4">
              {/* Transfer Details Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Bank *</Label>
                  <Select value={topupForm.senderBank} onValueChange={(value) => setTopupForm({ ...topupForm, senderBank: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {GHANA_BANKS.map((bank) => (
                        <SelectItem key={bank.value} value={bank.value}>
                          <div className="flex items-center gap-3">
                            {getBankLogo(bank.label) && (
                              <img src={getBankLogo(bank.label)!} alt="" className="w-5 h-5 rounded-sm object-contain bg-white shrink-0" />
                            )}
                            <span>{bank.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Your Account Number *</Label>
                  <Input
                    placeholder="Enter your account number"
                    value={topupForm.senderAccountNumber}
                    onChange={(e) => {
                      setTopupForm({ ...topupForm, senderAccountNumber: e.target.value });
                      setBankFetched(false); setBankAccountName(""); setBankVerifiedName("");
                    }}
                  />
                </div>

                {/* Fetch Bank Account Details */}
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full gap-2 transition-all",
                    bankFetched && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30"
                  )}
                  onClick={handleFetchBankAccountDetails}
                  disabled={bankValidating || bankFetched || !topupForm.senderAccountNumber || !topupForm.senderBank}
                >
                  {bankValidating ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Fetching...</>
                  ) : bankFetched ? (
                    <><CheckCircle className="h-4 w-4" /> Details Verified</>
                  ) : (
                    <><Search className="h-4 w-4" /> Fetch Account Details</>
                  )}
                </Button>

                {(bankFetched || bankAccountName) && (
                  <div className="grid grid-cols-2 gap-3">
                    {bankVerifiedName && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Bank Name</Label>
                        <Input value={bankVerifiedName} readOnly disabled className="bg-muted/60 cursor-not-allowed text-sm" />
                      </div>
                    )}
                    <div className={cn("space-y-2", !bankVerifiedName && "col-span-2")}>
                      <Label className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        Account Holder
                        <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider bg-green-100 dark:bg-green-950 px-1.5 py-0.5 rounded-full ml-1">Verified</span>
                      </Label>
                      <Input value={bankAccountName} readOnly disabled className="bg-muted/60 cursor-not-allowed font-semibold" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Transaction Reference *</Label>
                  <Input
                    placeholder="Enter transaction reference from your bank"
                    value={topupForm.transactionReference}
                    onChange={(e) => setTopupForm({ ...topupForm, transactionReference: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the reference number you received after making the transfer
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Instructions:</strong> Complete your bank transfer first, then fill in your details and transaction reference for verification.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleTopup} disabled={processing} className="w-full sm:w-auto">
            {processing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Top Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

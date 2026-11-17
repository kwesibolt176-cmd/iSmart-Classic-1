import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PinVerificationDialog } from "@/components/PinVerificationDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, RefreshCw, History, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle, Phone, Building2, Eye, EyeOff, Search } from "lucide-react";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Separator } from "@/components/ui/separator";
import { WalletTopUpDialog } from "@/components/WalletTopUpDialog";
import { getBankLogo } from "@/utils/bankLogos";
import { verifyAccount } from "@/lib/verify-account";
import { verifyFinancialDestination } from "@/lib/verify-financial-destination";
import { reconcilePendingReferences } from "@/lib/status-check";
import { getFinancialAttempt } from "@/lib/financial-idempotency";
import type { FinancialAttempt } from "@/lib/financial-idempotency";
import { functionErrorMessage } from "@/lib/function-errors";
import { callMerchantApi } from "@/lib/merchant-api";
import { mergeWalletTransactions, normalizeMerchantWalletTransactions } from "@/lib/merchant-wallet-transactions";
import type { MerchantWalletTransaction } from "@/lib/merchant-wallet-transactions";

interface BusinessWallet {
  id: string;
  currency: string;
  available_balance: number;
  pending_balance: number;
  total_collected: number;
  total_disbursed: number;
  is_active: boolean;
}

type WalletTransaction = MerchantWalletTransaction;

const MOBILE_PROVIDERS = [
  { id: "MTN", name: "MTN Mobile Money", logo: "/assets/mtnlogo.png" },
  { id: "TELECEL", name: "Telecel Cash", logo: "/assets/telecellogo.png" },
];

const mapToIVerifyOperator = (provider: string) => {
  const map: Record<string, string> = {
    MTN: "mtn", TELECEL: "vodafone", VODAFONE: "vodafone", AIRTELTIGO: "airteltigo",
  };
  return map[provider?.toUpperCase()] || provider?.toLowerCase();
};

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

interface WalletProps {
  autoOpenTopup?: boolean;
}

export const Wallet = ({ autoOpenTopup }: WalletProps = {}) => {
  const { profile, showBalance, setShowBalance } = useBusiness();
  const { format: formatAmount } = useCurrency();
  const [wallet, setWallet] = useState<BusinessWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const withdrawalAttempt = useRef<FinancialAttempt | null>(null);

  // iVerify state — Mobile Money
  const [mmValidating, setMmValidating] = useState(false);
  const [mmFetched, setMmFetched] = useState(false);
  const [mmAccountName, setMmAccountName] = useState("");
  const [mobileVerificationProof, setMobileVerificationProof] = useState("");

  // iVerify state — Bank
  const [bankValidating, setBankValidating] = useState(false);
  const [bankFetched, setBankFetched] = useState(false);
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankVerifiedName, setBankVerifiedName] = useState("");

  // Transfer form state
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    provider: "MTN",
    phoneNumber: "",
    channel: "MOBILE_MONEY",
    accountNumber: "",
    accountName: "",
    bankCode: "",
    pin: "",
  });

  // Helper to detect mobile operator from phone number
  const detectOperator = (phone: string) => {
    const cleanPhone = formatPhoneNumber(phone, 'local');
    if (cleanPhone.length < 3) return null;
    
    const prefix = cleanPhone.substring(0, 3);
    
    const mtnPrefixes = ['024', '025', '053', '054', '055', '059'];
    const telecelPrefixes = ['020', '050'];
    const atPrefixes = ['026', '056', '027', '057'];

    if (mtnPrefixes.includes(prefix)) return 'MTN';
    if (telecelPrefixes.includes(prefix)) return 'TELECEL';
    if (atPrefixes.includes(prefix)) return 'AIRTELTIGO';
    
    return null;
  };



  // Auto-detect operator for Withdraw form
  useEffect(() => {
    if (withdrawForm.channel === 'MOBILE_MONEY') {
      if (!withdrawForm.phoneNumber) {
        setWithdrawForm(prev => ({ ...prev, provider: "MTN" })); // Defaulting back to MTN for Withdraw if cleared
        return;
      }
      const detected = detectOperator(withdrawForm.phoneNumber);
      if (detected && ['MTN', 'TELECEL'].includes(detected) && detected !== withdrawForm.provider) {
        setWithdrawForm(prev => ({ ...prev, provider: detected }));
      }
    }
  }, [withdrawForm.phoneNumber, withdrawForm.channel]);

  useEffect(() => {
    if (autoOpenTopup) {
      setTopupDialogOpen(true);
    }
  }, [autoOpenTopup]);

  useEffect(() => {
    if (profile?.id) {
      fetchWalletData();
    }
  }, [profile?.id]);

  const fetchWalletData = async () => {
    try {
      const merchantBusinessId = profile?.merchant_business_id || profile?.ismart_business_id;
      // Fetch wallet
      const { data: walletData, error: walletError } = await supabase
        .from('business_wallets')
        .select('*')
        .eq('business_id', profile?.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') throw walletError;
      setWallet(walletData);

      // Unified wallet activity: ledger entries + collections + payouts + utilities
      const [txRes, collectionsRes, disbursementsRes, utilitiesRes, merchantTransactionsRes] = await Promise.all([
        walletData
          ? supabase
              .from('wallet_transactions')
              .select('*')
              .eq('wallet_id', walletData.id)
              .order('created_at', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from('collections')
          .select('id, created_at, amount, net_amount, status, reference, collection_type, payer_name')
          .eq('business_id', profile?.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('disbursements')
          .select('id, created_at, amount, status, reference, channel, recipient_name')
          .eq('business_id', profile?.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('utility_payments')
          .select('id, created_at, amount, status, reference, utility_type, recipient_number')
          .eq('business_id', profile?.id)
          .order('created_at', { ascending: false })
          .limit(50),
        merchantBusinessId
          ? callMerchantApi<unknown>("listWalletTransactions", {
              path: { id: merchantBusinessId },
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (txRes.error) throw txRes.error;

      const ledger: WalletTransaction[] = ((txRes.data || []) as Omit<WalletTransaction, "source">[])
        .map((transaction) => ({ ...transaction, source: "local" }));

      const mapped: WalletTransaction[] = [
        ...(collectionsRes.data || []).map((c: any) => ({
          id: `col-${c.id}`,
          transaction_type: 'collection',
          amount: Number(c.net_amount ?? c.amount ?? 0),
          fee: 0,
          balance_before: 0,
          balance_after: 0,
          reference: c.reference || c.payer_name || c.collection_type || 'Collection',
          description: c.payer_name || c.collection_type || null,
          status: c.status,
          created_at: c.created_at,
          source: 'local',
        })),
        ...(disbursementsRes.data || []).map((d: any) => ({
          id: `dis-${d.id}`,
          transaction_type: 'disbursement',
          amount: Number(d.amount ?? 0),
          fee: 0,
          balance_before: 0,
          balance_after: 0,
          reference: d.reference || d.recipient_name || d.channel || 'Payout',
          description: d.recipient_name || d.channel || null,
          status: d.status,
          created_at: d.created_at,
          source: 'local',
        })),
        ...(utilitiesRes.data || []).map((u: any) => ({
          id: `uti-${u.id}`,
          transaction_type: `utility_${u.utility_type || 'payment'}`,
          amount: Number(u.amount ?? 0),
          fee: 0,
          balance_before: 0,
          balance_after: 0,
          reference: u.reference || u.recipient_number || 'Utility payment',
          description: u.recipient_number || null,
          status: u.status,
          created_at: u.created_at,
          source: 'local',
        })),
      ];

      const merchantTransactions = normalizeMerchantWalletTransactions(merchantTransactionsRes);
      const merged = mergeWalletTransactions(merchantTransactions, [...ledger, ...mapped]);

      setTransactions(merged.slice(0, 60));

      // Fallback for missed callbacks: ask iSmart status-check about anything still
      // pending after one day, then refresh once if something resolved.
      const stalePending = merged
        .filter(
          (t) =>
            ["pending", "processing"].includes(String(t.status).toLowerCase()) &&
            !!t.reference &&
            Date.now() - new Date(t.created_at).getTime() > 1 * 24 * 60 * 60 * 1000
        )
        .map((t) => ({ reference: t.reference, channel: "MOMO" }));

      if (stalePending.length) {
        const resolved = await reconcilePendingReferences(stalePending, 50);
        if (resolved > 0) fetchWalletData();
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawForm.amount) {
      toast.error("Please enter amount");
      return;
    }

    const amount = parseFloat(withdrawForm.amount);
    if (!/^\d{4,6}$/.test(withdrawForm.pin)) {
      toast.error("Enter your 4–6 digit transaction PIN");
      return;
    }
    if (amount > (wallet?.available_balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    // Validate based on channel
    if (withdrawForm.channel === "MOBILE_MONEY") {
      if (!withdrawForm.phoneNumber || !withdrawForm.provider) {
        toast.error("Please enter phone number and select provider");
        return;
      }
      if (!mmFetched || !mobileVerificationProof) {
        toast.error("Please verify the mobile money number first");
        return;
      }
    } else {
      if (!withdrawForm.accountNumber || !withdrawForm.accountName || !withdrawForm.bankCode) {
        toast.error("Please enter account number, account name, and bank");
        return;
      }
    }

    setProcessing(true);
    try {
      const requestBody = {
          businessId: profile?.id,
          amount,
          channel: withdrawForm.channel,
          provider: withdrawForm.provider,
          phoneNumber: withdrawForm.phoneNumber,
          accountNumber: withdrawForm.accountNumber,
          accountName: withdrawForm.accountName,
          bankCode: withdrawForm.bankCode,
          currency: wallet?.currency || 'GHS',
          pin: withdrawForm.pin,
          verificationProof: withdrawForm.channel === "MOBILE_MONEY" ? mobileVerificationProof : undefined,
      };
      const fingerprint = JSON.stringify(requestBody);
      withdrawalAttempt.current = getFinancialAttempt(withdrawalAttempt.current, fingerprint);
      const { data, error } = await supabase.functions.invoke('process-disbursement', {
        body: { ...requestBody, clientRequestId: withdrawalAttempt.current.requestId },
      });

      if (error) throw new Error(await functionErrorMessage(error, data, "Failed to initiate withdrawal"));

      if (data?.success) {
        withdrawalAttempt.current = null;
        toast.success(data.message || "Withdrawal request submitted");
        setWithdrawDialogOpen(false);
        setWithdrawForm({
          amount: "",
          provider: "MTN",
          phoneNumber: "",
          channel: "MOBILE_MONEY",
          accountNumber: "",
          accountName: "",
          bankCode: "",
          pin: "",
        });
        setMmFetched(false);
        setMmAccountName("");
        setMobileVerificationProof("");
        fetchWalletData();
      } else {
        toast.error(data?.message || data?.error || "Failed to initiate withdrawal");
      }
    } catch (error: unknown) {
      console.error('Withdrawal error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to initiate withdrawal");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      processing: { variant: "secondary", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      cancelled: { variant: "secondary", icon: <AlertCircle className="h-3 w-3" /> },
    };
    const { variant, icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1 capitalize">
        {icon}
        {status}
      </Badge>
    );
  };

  const handleToggleBalance = () => {
    if (!showBalance && profile?.admin_pin) {
      setPinDialogOpen(true);
    } else {
      setShowBalance(!showBalance);
    }
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('credit') || type === 'collection' || type === 'wallet_credit') {
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Business Wallet"
        description="Monitor your financial position, manage funds, and track all incoming and outgoing transactions."
        rightContent={<WalletIcon className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">

        {/* Wallet Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 items-start">
          <Card className="sm:col-span-2 bg-primary border-primary hover:border-primary/90 transition-all shadow-sm group">
            <CardContent className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="p-3 bg-white/20 rounded-xl flex items-center justify-center">
                  <WalletIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                    Available Balance ({wallet?.currency || 'GHS'})
                  </span>
                  <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 text-white hover:bg-white/20 rounded-full" onClick={handleToggleBalance}>
                    {showBalance ? <EyeOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Eye className="h-6 w-6 sm:h-7 sm:w-7" />}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <p className="text-4xl sm:text-5xl lg:text-5xl font-black text-white tabular-nums tracking-tight truncate">
                    {showBalance ? formatAmount(wallet?.available_balance || 0) : "****"}
                  </p>
                  {(wallet?.pending_balance || 0) > 0 && (
                    <p className="text-xs font-bold text-white/80 mt-2 flex items-center gap-1.5 uppercase tracking-wide">
                      <Clock className="w-3.5 h-3.5" />
                      {showBalance ? formatAmount(wallet.pending_balance) : "****"} pending clearance
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap lg:flex-nowrap xl:flex-wrap 2xl:flex-nowrap gap-2 w-full sm:w-auto shrink-0 transition-all">
                  <Button 
                    onClick={() => setTopupDialogOpen(true)} 
                    className="gap-2 flex-1 sm:flex-none shadow-lg shadow-black/10 bg-white text-primary hover:bg-white/90 min-w-[100px] px-3 sm:px-4 h-10 font-bold"
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span className="truncate">Top Up</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setWithdrawDialogOpen(true)} 
                    className="gap-2 flex-1 sm:flex-none shadow-lg shadow-black/10 bg-white text-primary border-none hover:bg-white/90 min-w-[100px] px-3 sm:px-4 h-10 font-bold"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="truncate">Transfer</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-blue-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-blue-600 font-bold uppercase tracking-wider text-[10px]">
                  Collected
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Collected</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate">{showBalance ? formatAmount(wallet?.total_collected || 0) : "****"}</p>
            </CardContent>
          </Card>

          <Card className="hover:border-orange-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <TrendingDown className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-orange-600 font-bold uppercase tracking-wider text-[10px]">
                  Disbursed
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Payouts</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate">{showBalance ? formatAmount(wallet?.total_disbursed || 0) : "****"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>Collections, payouts, top-ups and utility payments</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-start sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-full bg-muted shrink-0">
                        {getTransactionIcon(tx.transaction_type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium capitalize text-sm sm:text-base truncate">
                          {tx.transaction_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.reference}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold text-sm sm:text-base ${tx.transaction_type.includes('credit') || tx.transaction_type === 'collection' || tx.transaction_type === 'wallet_credit' ? 'text-blue-600' : 'text-foreground'}`}>
                        {tx.transaction_type.includes('credit') || tx.transaction_type === 'collection' || tx.transaction_type === 'wallet_credit' ? '+' : '-'}
                        {showBalance ? formatAmount(tx.amount) : "****"}
                      </p>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 justify-end">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                        </span>
                        {getStatusBadge(tx.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">
                  Your wallet transactions will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <WalletTopUpDialog 
          open={topupDialogOpen} 
          onOpenChange={setTopupDialogOpen} 
          currency={wallet?.currency || 'GHS'} 
          onSuccess={() => setTimeout(() => fetchWalletData(), 2000)} 
        />

        {/* Transfer Dialog */}
        <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Transfer Funds</DialogTitle>
              <DialogDescription>
                Transfer to your bank account or mobile money
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-xl font-bold">{formatAmount(wallet?.available_balance || 0)}</p>
              </div>

              <Tabs value={withdrawForm.channel} onValueChange={(v) => {
                setWithdrawForm({ ...withdrawForm, channel: v });
                setMmFetched(false);
                setMmAccountName("");
                setMobileVerificationProof("");
              }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="MOBILE_MONEY" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Mobile Money
                  </TabsTrigger>
                  <TabsTrigger value="BANK" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Bank
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="MOBILE_MONEY" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawForm.amount}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                      max={wallet?.available_balance || 0}
                    />
                  </div>

                  {/* Logo-based network selector */}
                  <div className="space-y-2">
                    <Label>Mobile Network *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {MOBILE_PROVIDERS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setWithdrawForm({ ...withdrawForm, provider: p.id });
                            setMmFetched(false);
                            setMobileVerificationProof("");
                            setMmAccountName("");
                          }}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium",
                            withdrawForm.provider === p.id
                              ? "border-primary bg-primary/8 shadow-sm"
                              : "border-border bg-card hover:border-primary/40"
                          )}
                        >
                          <img src={p.logo} alt={p.name} className="w-7 h-7 object-contain rounded" />
                          <span className="text-xs text-left leading-tight">{p.name}</span>
                          {withdrawForm.provider === p.id && (
                            <CheckCircle className="h-4 w-4 text-primary ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <PhoneInput
                      value={withdrawForm.phoneNumber}
                      onChange={(value) => {
                        setWithdrawForm({ ...withdrawForm, phoneNumber: value });
                        setMmFetched(false);
                        setMobileVerificationProof("");
                        setMmAccountName("");
                      }}
                    />
                  </div>

                  {/* Fetch Account Details */}
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full gap-2 transition-all",
                      mmFetched && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30"
                    )}
                    onClick={async () => {
                      if (!withdrawForm.phoneNumber || !withdrawForm.provider) return;
                      setMmValidating(true);
                      try {
                        const num = formatPhoneNumber(withdrawForm.phoneNumber, 'local');
                        const data = await verifyFinancialDestination({ businessId: profile?.id, phoneNumber: num, provider: mapToIVerifyOperator(withdrawForm.provider) });
                        const name = data?.data?.accountname || data?.data?.accountName || data?.data?.account_name || data?.data?.name || data?.accountname || data?.name || data?.account_name || data?.accountName;
                        if (!name) throw new Error("Could not verify account details");
                        setMmFetched(true);
                        setMmAccountName(name);
                        setMobileVerificationProof(data.verificationProof);
                        toast.success(`Account verified: ${name}`);
                      } catch (e: any) {
                        toast.error(e.message || "Could not fetch account details");
                      } finally {
                        setMmValidating(false);
                      }
                    }}
                    disabled={mmValidating || mmFetched || !withdrawForm.phoneNumber || !withdrawForm.provider}
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
                </TabsContent>

                <TabsContent value="BANK" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawForm.amount}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                      max={wallet?.available_balance || 0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank *</Label>
                    <Select
                      value={withdrawForm.bankCode}
                      onValueChange={(v) => {
                        setWithdrawForm({ ...withdrawForm, bankCode: v });
                        setBankFetched(false); setBankHolderName(""); setBankVerifiedName("");
                      }}
                    >
                      <SelectTrigger className="h-12 bg-muted/10 border-border/60">
                        <SelectValue placeholder="Choose your bank">
                          {withdrawForm.bankCode && (() => {
                            const bank = GHANA_BANKS.find(b => b.value === withdrawForm.bankCode);
                            return bank ? (
                              <div className="flex items-center gap-2">
                                {getBankLogo(bank.label) && (
                                  <img src={getBankLogo(bank.label)!} alt="" className="w-5 h-5 rounded-sm object-contain bg-white shrink-0 shadow-sm" />
                                )}
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
                              {getBankLogo(bank.label) && (
                                <img src={getBankLogo(bank.label)!} alt="" className="w-5 h-5 rounded-sm object-contain bg-white shrink-0 shadow-sm" />
                              )}
                              <span className="font-medium">{bank.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number *</Label>
                    <Input
                      placeholder="Enter account number"
                      value={withdrawForm.accountNumber}
                      onChange={(e) => {
                        setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value });
                        setBankFetched(false); setBankHolderName(""); setBankVerifiedName("");
                      }}
                    />
                  </div>

                  {/* Bank Fetch Account Details */}
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full gap-2 transition-all",
                      bankFetched && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30"
                    )}
                    onClick={async () => {
                      if (!withdrawForm.accountNumber || !withdrawForm.bankCode) return;
                      setBankValidating(true);
                      try {
                        const data = await verifyAccount({ channel: "bank", mobile_number: "", account_number: withdrawForm.accountNumber.trim(), bank_code: withdrawForm.bankCode, operator: "mtn" });
                        const name = data?.data?.accountname || data?.data?.accountName || data?.data?.account_name || data?.data?.name || data?.accountname || data?.name || data?.account_name || data?.accountName;
                        const bName = data?.bank_name || data?.data?.bank_name || "";
                        if (!name) throw new Error("Could not verify account details");
                        setBankFetched(true);
                        setBankHolderName(name);
                        if (bName) setBankVerifiedName(bName);
                        toast.success(`Account verified: ${name}`);
                      } catch (e: any) {
                        toast.error(e.message || "Could not fetch account details");
                      } finally {
                        setBankValidating(false);
                      }
                    }}
                    disabled={bankValidating || bankFetched || !withdrawForm.accountNumber || !withdrawForm.bankCode}
                  >
                    {bankValidating ? <><RefreshCw className="h-4 w-4 animate-spin" /> Fetching...</> : bankFetched ? <><CheckCircle className="h-4 w-4" /> Details Verified</> : <><Search className="h-4 w-4" /> Fetch Account Details</>}
                  </Button>

                  {(bankFetched || bankHolderName) && (
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
                        <Input value={bankHolderName} readOnly disabled className="bg-muted/60 cursor-not-allowed font-semibold" />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              <div className="space-y-2">
                <Label htmlFor="withdraw-pin">Transaction PIN</Label>
                <Input
                  id="withdraw-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  minLength={4}
                  maxLength={6}
                  value={withdrawForm.pin}
                  onChange={(event) => setWithdrawForm({ ...withdrawForm, pin: event.target.value.replace(/\D/g, "") })}
                  placeholder="4–6 digit PIN"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleWithdraw} disabled={processing} className="w-full sm:w-auto">
                {processing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Request Withdrawal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <PinVerificationDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        correctPin={profile?.admin_pin || ""}
        onSuccess={() => setShowBalance(true)}
      />
    </div>
  );
};

export default Wallet;

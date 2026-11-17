import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";
import { Send, Plus, Users, Clock, CheckCircle, XCircle, RefreshCw, ArrowUpRight, Calendar, FileSpreadsheet, Wallet, Building2, Phone } from "lucide-react";
import { format } from "date-fns";
import { TransactionExport } from "@/components/TransactionExport";
import { PageHeader } from "@/components/ui/PageHeader";
import { DisbursementDialog } from "@/components/DisbursementDialog";
import { callMerchantApi } from "@/lib/merchant-api";
import { normalizeMerchantWalletTransactions } from "@/lib/merchant-wallet-transactions";

interface Beneficiary {
  id: string;
  name: string;
  account_number: string;
  account_name: string | null;
  bank_name: string | null;
  phone: string | null;
  is_verified: boolean;
}

interface Disbursement {
  id: string;
  amount: number;
  fee: number;
  total_amount: number;
  recipient_name: string;
  recipient_account: string;
  recipient_bank_name: string | null;
  reference: string;
  narration: string | null;
  status: string;
  scheduled_for: string | null;
  created_at: string;
}

interface PaymentProvider {
  id: string;
  name: string;
  slug: string;
  provider_type: string;
}

export const Disbursements = () => {
  const { profile } = useBusiness();
  const { format: formatAmount } = useCurrency();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [beneficiaryDialogOpen, setBeneficiaryDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string | undefined>(undefined);
  
  // Set send money form is handled by dialog now

  // New beneficiary form
  const [newBeneficiary, setNewBeneficiary] = useState({
    name: "",
    accountNumber: "",
    accountName: "",
    bankName: "",
    phone: "",
    providerId: "",
  });

  // Helper to detect mobile operator from phone number
  const detectOperator = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '').replace(/^\+233/, '0');
    if (cleanPhone.length < 3) return null;
    
    const prefix = cleanPhone.substring(0, 3);
    
    const mtnPrefixes = ['024', '025', '053', '054', '055', '059'];
    const telecelPrefixes = ['020', '050'];
    const atPrefixes = ['026', '056', '027', '057'];

    if (mtnPrefixes.includes(prefix)) return 'MTN';
    if (telecelPrefixes.includes(prefix)) return 'VODAFONE';
    if (atPrefixes.includes(prefix)) return 'AIRTELTIGO';
    
    return null;
  };



  // Auto-detect operator for New Beneficiary form
  useEffect(() => {
    const detected = detectOperator(newBeneficiary.phone);
    if (detected) {
      if (detected !== newBeneficiary.providerId) {
        setNewBeneficiary(prev => ({ ...prev, providerId: detected }));
      }
    } else if (!newBeneficiary.phone && newBeneficiary.providerId) {
      setNewBeneficiary(prev => ({ ...prev, providerId: "" }));
    }
  }, [newBeneficiary.phone]);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    try {
      const merchantBusinessId = profile?.merchant_business_id || profile?.ismart_business_id;
      const [beneficiariesRes, disbursementsRes, providersRes, merchantTransactionsRes] = await Promise.all([
        supabase
          .from('beneficiaries')
          .select('*')
          .eq('business_id', profile?.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('disbursements')
          .select('*')
          .eq('business_id', profile?.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('payment_providers')
          .select('*')
          .eq('is_active', true)
          .eq('supports_disbursement', true),
        merchantBusinessId
          ? callMerchantApi<unknown>("listWalletTransactions", {
              path: { id: merchantBusinessId },
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (beneficiariesRes.error) throw beneficiariesRes.error;
      if (disbursementsRes.error) throw disbursementsRes.error;
      if (providersRes.error) throw providersRes.error;

      setBeneficiaries(beneficiariesRes.data || []);
      const localDisbursements = (disbursementsRes.data || []) as Disbursement[];
      const byReference = new Map(localDisbursements.map(item => [item.reference.trim().toLowerCase(), item]));
      for (const transaction of normalizeMerchantWalletTransactions(merchantTransactionsRes)) {
        if (transaction.transaction_type !== "disbursement") continue;
        const key = transaction.reference.trim().toLowerCase();
        const local = byReference.get(key);
        byReference.set(key, {
          id: local?.id || transaction.id,
          amount: transaction.amount,
          fee: transaction.fee,
          total_amount: transaction.amount + transaction.fee,
          recipient_name: local?.recipient_name || transaction.description || "Recipient",
          recipient_account: local?.recipient_account || "",
          recipient_bank_name: local?.recipient_bank_name || null,
          reference: transaction.reference,
          narration: local?.narration || transaction.description,
          status: transaction.status,
          scheduled_for: local?.scheduled_for || null,
          created_at: transaction.created_at,
        });
      }
      setDisbursements([...byReference.values()].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ));
      setProviders(providersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load disbursements');
    } finally {
      setLoading(false);
    }
  };



  const handleAddBeneficiary = async () => {
    if (!newBeneficiary.name || !newBeneficiary.accountNumber) {
      toast.error("Please enter name and account number");
      return;
    }

    try {
      const { error } = await supabase
        .from('beneficiaries')
        .insert({
          business_id: profile?.id,
          name: newBeneficiary.name,
          account_number: newBeneficiary.accountNumber,
          account_name: newBeneficiary.accountName || null,
          bank_name: newBeneficiary.bankName || null,
          phone: newBeneficiary.phone || null,
          provider_id: newBeneficiary.providerId || null,
        });

      if (error) throw error;

      toast.success("Beneficiary added");
      setBeneficiaryDialogOpen(false);
      setNewBeneficiary({
        name: "",
        accountNumber: "",
        accountName: "",
        bankName: "",
        phone: "",
        providerId: "",
      });
      fetchData();
    } catch (error) {
      console.error('Error adding beneficiary:', error);
      toast.error("Failed to add beneficiary");
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      processing: { variant: "secondary", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    };
    const { variant, icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1 capitalize">
        {icon}
        {status}
      </Badge>
    );
  };

  const totalDisbursed = disbursements.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.amount, 0);
  const pendingAmount = disbursements.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0);

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
        title="Disbursements"
        description="Transfer funds securely to bank accounts and mobile money wallets across all major networks."
        rightContent={<ArrowUpRight className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <span className="text-primary font-bold uppercase tracking-wider text-[10px]">
                  Payouts
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Disbursed</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatAmount(totalDisbursed)}</p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-orange-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <span className="text-orange-500 font-bold uppercase tracking-wider text-[10px]">
                  Processing
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending Amount</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-500 tabular-nums">{formatAmount(pendingAmount)}</p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-blue-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <ArrowUpRight className="h-6 w-6 text-blue-500" />
                </div>
                <span className="text-blue-500 font-bold uppercase tracking-wider text-[10px]">
                  Volume
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Transfers</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{disbursements.length}</p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-blue-500/20 transition-all shadow-sm bg-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-blue-600 font-bold uppercase tracking-wider text-[10px]">
                  Recipients
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Beneficiaries</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{beneficiaries.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList className="w-full sm:w-auto overflow-x-auto">
              <TabsTrigger value="send" className="gap-2 flex-1 sm:flex-none">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 flex-1 sm:flex-none">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="beneficiaries" className="gap-2 flex-1 sm:flex-none">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Beneficiaries</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <TransactionExport
                data={disbursements}
                filename="disbursements"
                columns={[
                  { key: 'reference', label: 'Reference' },
                  { key: 'recipient_name', label: 'Recipient' },
                  { key: 'recipient_account', label: 'Account' },
                  { key: 'recipient_bank_name', label: 'Bank' },
                  { key: 'amount', label: 'Amount', format: (v) => formatAmount(v) },
                  { key: 'fee', label: 'Fee', format: (v) => formatAmount(v) },
                  { key: 'status', label: 'Status' },
                  { key: 'created_at', label: 'Date', format: (v) => format(new Date(v), 'yyyy-MM-dd HH:mm') },
                ]}
              />
              <Dialog open={beneficiaryDialogOpen} onOpenChange={setBeneficiaryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Beneficiary</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Beneficiary</DialogTitle>
                  <DialogDescription>
                    Save recipient details for quick transfers
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="Recipient name"
                      value={newBeneficiary.name}
                      onChange={(e) => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account/Phone Number *</Label>
                    <Input
                      placeholder="Account or phone number"
                      value={newBeneficiary.accountNumber}
                      onChange={(e) => setNewBeneficiary({ ...newBeneficiary, accountNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      placeholder="Account holder name"
                      value={newBeneficiary.accountName}
                      onChange={(e) => setNewBeneficiary({ ...newBeneficiary, accountName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select 
                      value={newBeneficiary.providerId} 
                      onValueChange={(v) => setNewBeneficiary({ ...newBeneficiary, providerId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setBeneficiaryDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleAddBeneficiary} className="w-full sm:w-auto">
                    Add Beneficiary
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

              <Button onClick={() => setSendDialogOpen(true)} className="gap-2 flex-1 sm:flex-none">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send Money</span>
                <span className="sm:hidden">Send</span>
              </Button>

              <DisbursementDialog 
                open={sendDialogOpen} 
                onOpenChange={(open) => {
                  setSendDialogOpen(open);
                  if (!open) setSelectedBeneficiaryId(undefined);
                }} 
                onSuccess={fetchData}
                defaultBeneficiaryId={selectedBeneficiaryId}
              />
          </div>
        </div>

          <TabsContent value="send">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Quick Transfer</CardTitle>
                <CardDescription>Send money to your saved beneficiaries</CardDescription>
              </CardHeader>
              <CardContent>
                {beneficiaries.length > 0 ? (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                    {beneficiaries.slice(0, 6).map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBeneficiaryId(b.id);
                          setSendDialogOpen(true);
                        }}
                        className="p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10 shrink-0">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{b.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {b.account_number}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">No beneficiaries yet</p>
                    <Button onClick={() => setBeneficiaryDialogOpen(true)}>
                      Add Your First Beneficiary
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="pt-6">
                {disbursements.length > 0 ? (
                  <div className="space-y-3">
                    {disbursements.map((d) => (
                      <div key={d.id} className="flex items-start sm:items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors gap-3">
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/20 shrink-0">
                            <ArrowUpRight className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{d.recipient_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {d.recipient_account} {d.recipient_bank_name && `• ${d.recipient_bank_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm sm:text-base">
                            -{formatAmount(d.amount)}
                          </p>
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 justify-end">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(d.created_at), 'MMM d, HH:mm')}
                            </span>
                            {getStatusBadge(d.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No transfers yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beneficiaries">
            <Card>
              <CardContent className="pt-6">
                {beneficiaries.length > 0 ? (
                  <div className="space-y-3">
                    {beneficiaries.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-full bg-muted shrink-0">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{b.name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {b.account_number}
                              {b.bank_name && ` • ${b.bank_name}`}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedBeneficiaryId(b.id);
                            setSendDialogOpen(true);
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">No beneficiaries saved</p>
                    <Button onClick={() => setBeneficiaryDialogOpen(true)}>
                      Add Beneficiary
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Disbursements;

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";
import { Link, Plus, Copy, ExternalLink, RefreshCw, TrendingUp, FileText, CheckCircle, XCircle, Clock, MoreVertical, Share2 } from "lucide-react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TransactionExport } from "@/components/TransactionExport";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentLinkDialog } from "@/components/PaymentLinkDialog";
import { callMerchantApi } from "@/lib/merchant-api";
import { normalizeMerchantWalletTransactions } from "@/lib/merchant-wallet-transactions";

interface PaymentLink {
  id: string;
  short_code: string;
  title: string;
  description: string | null;
  amount: number | null;
  currency: string;
  is_fixed_amount: boolean;
  is_active: boolean;
  current_uses: number;
  total_collected: number;
  created_at: string;
  expires_at: string | null;
  redirect_url: string | null;
  metadata: Record<string, unknown> | null;
}

interface Collection {
  id: string;
  collection_type: string;
  amount: number;
  fee: number;
  net_amount: number;
  payer_name: string | null;
  payer_phone: string | null;
  reference: string;
  status: string;
  created_at: string;
}

export const Collections = () => {
  const { profile } = useBusiness();
  const { format: formatAmount } = useCurrency();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // New link form state is now handled by the dialog component

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    try {
      const merchantBusinessId = profile?.merchant_business_id || profile?.ismart_business_id;
      const [linksRes, collectionsRes, merchantTransactionsRes] = await Promise.all([
        supabase
          .from('payment_links')
          .select('*')
          .eq('business_id', profile?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('collections')
          .select('*')
          .eq('business_id', profile?.id)
          .order('created_at', { ascending: false })
          .limit(50),
        merchantBusinessId
          ? callMerchantApi<unknown>("listWalletTransactions", {
              path: { id: merchantBusinessId },
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (linksRes.error) throw linksRes.error;
      if (collectionsRes.error) throw collectionsRes.error;

      setPaymentLinks(linksRes.data || []);
      const localCollections = (collectionsRes.data || []) as Collection[];
      const byReference = new Map(localCollections.map(item => [item.reference.trim().toLowerCase(), item]));
      for (const transaction of normalizeMerchantWalletTransactions(merchantTransactionsRes)) {
        if (transaction.transaction_type !== "collection") continue;
        const key = transaction.reference.trim().toLowerCase();
        const local = byReference.get(key);
        byReference.set(key, {
          id: local?.id || transaction.id,
          collection_type: local?.collection_type || "wallet",
          amount: transaction.amount,
          fee: transaction.fee,
          net_amount: Math.max(0, transaction.amount - transaction.fee),
          payer_name: local?.payer_name || transaction.description,
          payer_phone: local?.payer_phone || null,
          reference: transaction.reference,
          status: transaction.status,
          created_at: transaction.created_at,
        });
      }
      setCollections([...byReference.values()].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };



  const paymentLinkUrl = (link: PaymentLink) => `${window.location.origin}/pay/${link.short_code}`;

  const copyLink = async (link: PaymentLink) => {
    const url = paymentLinkUrl(link);
    const copied = await navigator.clipboard.writeText(url).then(() => true).catch(() => false);
    toast[copied ? "success" : "error"](copied ? "Link copied to clipboard" : "Could not copy the link");
  };

  const shareLink = async (link: PaymentLink) => {
    const url = paymentLinkUrl(link);
    if (navigator.share) {
      await navigator.share({ title: link.title, text: `Pay ${link.title}`, url }).catch(() => undefined);
      return;
    }
    await copyLink(link);
  };

  const toggleLinkStatus = async (link: PaymentLink) => {
    try {
      const checkoutId = String(link.metadata?.merchant_checkout_id || "");
      const merchantBusinessId = profile?.merchant_business_id || profile?.ismart_business_id;
      if (!link.is_active && checkoutId) {
        toast.error("A cancelled hosted checkout cannot be reactivated. Create a new link instead.");
        return;
      }
      if (link.is_active && checkoutId) {
        if (!merchantBusinessId) throw new Error("Merchant business is not linked");
        await callMerchantApi("cancelCheckout", {
          path: { id: merchantBusinessId, checkoutId },
        });
      }
      const { error } = await supabase
        .from('payment_links')
        .update({ is_active: !link.is_active })
        .eq('id', link.id);
      if (error) throw error;
      
      toast.success(link.is_active ? "Link cancelled" : "Link activated");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update link");
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
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

  const totalCollected = collections.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.net_amount, 0);
  const activeLinks = paymentLinks.filter(l => l.is_active).length;
  const successRate = collections.length > 0
    ? Math.round((collections.filter(c => c.status === 'completed').length / collections.length) * 100)
    : 0;

  // Group collections by date
  const groupedCollections = useMemo(() => {
    const groups: Record<string, Collection[]> = {};
    collections.forEach(c => {
      const day = startOfDay(new Date(c.created_at)).toISOString();
      if (!groups[day]) groups[day] = [];
      groups[day].push(c);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [collections]);

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
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
        title="Collections"
        description="Receive payments via shareable payment links and track all incoming transactions."
        rightContent={
          <div className="flex items-center gap-2">
            <TransactionExport
              data={collections}
              filename="collections"
              columns={[
                { key: 'reference', label: 'Reference' },
                { key: 'payer_name', label: 'Payer' },
                { key: 'payer_phone', label: 'Phone' },
                { key: 'amount', label: 'Amount', format: (v) => formatAmount(v) },
                { key: 'net_amount', label: 'Net Amount', format: (v) => formatAmount(v) },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Date', format: (v) => format(new Date(v), 'yyyy-MM-dd HH:mm') },
              ]}
            />
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Link
            </Button>
            <PaymentLinkDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={fetchData} />
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Collected', value: formatAmount(totalCollected), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Active Links', value: activeLinks, icon: Link, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Transactions', value: collections.length, icon: FileText, color: 'text-foreground', bg: 'bg-muted' },
            { label: 'Success Rate', value: `${successRate}%`, icon: CheckCircle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Payment Links ── */}
        <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment Links</p>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            {paymentLinks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Link className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold">No payment links yet</p>
                  <p className="mb-4 max-w-md text-sm text-muted-foreground">Create a reusable link, then copy or share it with customers and stakeholders from this page.</p>
                  <Button onClick={() => setCreateDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Create payment link</Button>
                </CardContent>
              </Card>
            ) : <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {paymentLinks.map((link) => (
                <Card key={link.id} className={`border-border transition-all hover:shadow-md ${!link.is_active ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-sm truncate">{link.title}</p>
                          <Badge variant={link.is_active ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0 shrink-0">
                            {link.is_active ? 'Active' : 'Off'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{link.description || 'No description'}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyLink(link)}>
                            <Copy className="h-4 w-4 mr-2" /> Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleLinkStatus(link)}>
                            {link.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-border/50 mb-3">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Amount</p>
                        <p className="text-xs font-semibold">{link.amount ? formatAmount(link.amount) : 'Custom'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Collected</p>
                        <p className="text-xs font-semibold text-emerald-600">{formatAmount(link.total_collected)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Uses</p>
                        <p className="text-xs font-semibold">{link.current_uses}</p>
                      </div>
                    </div>
                    <p className="mb-3 truncate rounded bg-muted/50 px-2 py-1.5 font-mono text-[10px] text-muted-foreground" title={paymentLinkUrl(link)}>{paymentLinkUrl(link)}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => copyLink(link)}>
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => shareLink(link)} disabled={!link.is_active}>
                        <Share2 className="h-3 w-3" /> Share
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(paymentLinkUrl(link), '_blank', 'noopener,noreferrer')}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>}
          </div>

        {/* ── Transactions grouped by date ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transactions</p>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          {groupedCollections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No transactions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedCollections.map(([dateKey, items]) => (
                <div key={dateKey}>
                  {/* Date group header */}
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-bold text-muted-foreground">{getDateLabel(dateKey)}</p>
                    <div className="h-px flex-1 bg-border/40" />
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatAmount(items.filter(i => i.status === 'completed').reduce((s, i) => s + i.net_amount, 0))}
                    </p>
                  </div>
                  {/* Items in this group */}
                  <Card>
                    <CardContent className="p-0 divide-y divide-border/50">
                      {items.map((collection) => (
                        <div key={collection.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-1.5 rounded-full shrink-0 ${
                              collection.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                              collection.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' :
                              'bg-muted'
                            }`}>
                              {collection.status === 'completed'
                                ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                : collection.status === 'failed'
                                ? <XCircle className="h-3.5 w-3.5 text-red-500" />
                                : <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{collection.payer_name || 'Anonymous'}</p>
                              <p className="text-xs text-muted-foreground truncate">{collection.payer_phone || collection.reference}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold tabular-nums ${collection.status === 'completed' ? 'text-emerald-600' : 'text-foreground'}`}>
                              +{formatAmount(collection.net_amount)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(collection.created_at), 'HH:mm')}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Collections;

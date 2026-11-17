import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { format } from "date-fns";
import {
  ShoppingBag, Wallet, Zap, Gift, ArrowDownLeft, ArrowUpRight,
  ChevronLeft, ChevronRight, RefreshCw, History,
  CreditCard, Smartphone, Coins, TrendingUp
} from "lucide-react";
import { callMerchantApi } from "@/lib/merchant-api";
import { normalizeMerchantWalletTransactions } from "@/lib/merchant-wallet-transactions";

// ── Types ──────────────────────────────────────────────────────────────────

type TxType = "sale" | "collection" | "wallet" | "utility" | "gift_card";

interface UnifiedTransaction {
  id: string;
  type: TxType;
  label: string;
  sublabel: string;
  amount: number;
  direction: "in" | "out";
  status: string;
  method?: string;
  date: string;
  reference?: string;
}

const PAGE_SIZE = 8;

// ── Helpers ────────────────────────────────────────────────────────────────

const typeConfig: Record<TxType, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  sale:       { icon: ShoppingBag,   color: "text-primary",        bg: "bg-primary/10",        label: "Sale" },
  collection: { icon: TrendingUp,    color: "text-blue-600",        bg: "bg-blue-100 dark:bg-blue-900/30",  label: "Collection" },
  wallet:     { icon: Wallet,        color: "text-emerald-600",     bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Wallet" },
  utility:    { icon: Zap,           color: "text-orange-500",      bg: "bg-orange-100 dark:bg-orange-900/30",  label: "Utility" },
  gift_card:  { icon: Gift,          color: "text-purple-600",      bg: "bg-purple-100 dark:bg-purple-900/30",  label: "Gift Card" },
};

const methodIcon = (method?: string) => {
  if (!method) return null;
  const m = method.toLowerCase();
  if (m.includes("cash"))   return <Coins className="h-3 w-3" />;
  if (m.includes("card"))   return <CreditCard className="h-3 w-3" />;
  if (m.includes("mobile") || m.includes("momo")) return <Smartphone className="h-3 w-3" />;
  return null;
};

const statusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "pending":   return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "failed":    return "bg-red-500/10 text-red-500";
    default:          return "bg-muted text-muted-foreground";
  }
};

// ── Component ──────────────────────────────────────────────────────────────

export function DashboardTransactionHistory() {
  const { user, profile } = useBusiness();
  const { format: formatCurrency } = useCurrency();

  const [all, setAll] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [activeType, setActiveType] = useState<TxType | "all">("all");
  const [merchantHistoryUnavailable, setMerchantHistoryUnavailable] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user?.id || !profile?.id) return;
    setLoading(true);
    setMerchantHistoryUnavailable(false);

    try {
      const merchantBusinessId = profile.merchant_business_id || profile.ismart_business_id;
      const [salesRes, collectionsRes, walletRes, utilityRes, giftRes, merchantTransactionsRes] = await Promise.all([
        // POS sales
        supabase.from("transactions").select("id, transaction_number, transaction_date, amount, payment_method, status")
          .eq("user_id", user.id).order("transaction_date", { ascending: false }).limit(50),
        // Collections (payment links)
        supabase.from("collections").select("id, created_at, net_amount, payer_name, payer_phone, collection_type, status, reference")
          .eq("business_id", profile.id).order("created_at", { ascending: false }).limit(50),
        // Wallet transactions
        supabase.from("wallet_transactions").select("id, created_at, amount, transaction_type, status, reference")
          .eq("wallet_id", (await supabase.from("business_wallets").select("id").eq("business_id", profile.id).maybeSingle()).data?.id || "")
          .order("created_at", { ascending: false }).limit(50),
        // Utility payments
        supabase.from("utility_payments").select("id, created_at, amount, utility_type, recipient_number, status")
          .eq("business_id", profile.id).order("created_at", { ascending: false }).limit(50),
        // Gift card transactions
        supabase.from("gift_card_transactions").select("id, created_at, amount, transaction_type, gift_cards(code)")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        merchantBusinessId
          ? callMerchantApi<unknown>("listWalletTransactions", {
              path: { id: merchantBusinessId },
            }).catch(() => {
              setMerchantHistoryUnavailable(true);
              return null;
            })
          : Promise.resolve(null),
      ]);

      const unified: UnifiedTransaction[] = [];

      // Sales
      (salesRes.data || []).forEach(t => unified.push({
        id: `sale-${t.id}`, type: "sale",
        label: t.transaction_number || "Sale",
        sublabel: t.payment_method || "POS",
        amount: Number(t.amount), direction: "in",
        status: t.status, method: t.payment_method,
        date: t.transaction_date,
      }));

      // Collections
      (collectionsRes.data || []).forEach(c => unified.push({
        id: `col-${c.id}`, type: "collection",
        label: c.payer_name || "Payment Link",
        sublabel: c.payer_phone || c.collection_type || "Collection",
        amount: Number(c.net_amount), direction: "in",
        status: c.status, date: c.created_at,
        reference: c.reference || undefined,
      }));

      // Wallet
      (walletRes.data || []).forEach(w => unified.push({
        id: `wal-${w.id}`, type: "wallet",
        label: w.transaction_type?.replace(/_/g, " ") || "Wallet",
        sublabel: w.reference || "",
        amount: Number(w.amount),
        direction: w.transaction_type?.includes("credit") || w.transaction_type === "collection" ? "in" : "out",
        status: w.status, date: w.created_at,
        reference: w.reference || undefined,
      }));

      // iSmart is the source of truth for processor-backed financial activity.
      // Remove local wallet/collection duplicates by reference before adding it.
      normalizeMerchantWalletTransactions(merchantTransactionsRes).forEach(transaction => {
        const duplicateIndex = unified.findIndex(item =>
          (item.type === "wallet" || item.type === "collection") &&
          item.reference?.trim().toLowerCase() === transaction.reference.trim().toLowerCase()
        );
        if (duplicateIndex >= 0) unified.splice(duplicateIndex, 1);
        unified.push({
          id: transaction.id,
          type: transaction.transaction_type === "collection" ? "collection" :
            transaction.transaction_type.startsWith("utility") ? "utility" : "wallet",
          label: transaction.transaction_type.replace(/_/g, " "),
          sublabel: transaction.reference,
          amount: transaction.amount,
          direction: transaction.transaction_type === "collection" ? "in" : "out",
          status: transaction.status,
          date: transaction.created_at,
          reference: transaction.reference,
        });
      });

      // Utilities
      (utilityRes.data || []).forEach(u => unified.push({
        id: `util-${u.id}`, type: "utility",
        label: u.utility_type ? u.utility_type.charAt(0).toUpperCase() + u.utility_type.slice(1) : "Utility",
        sublabel: u.recipient_number || "",
        amount: Number(u.amount), direction: "out",
        status: u.status || "completed", date: u.created_at,
      }));

      // Gift cards
      (giftRes.data || []).forEach((g: any) => unified.push({
        id: `gift-${g.id}`, type: "gift_card",
        label: `Gift Card ${g.transaction_type === "credit" ? "Top-up" : "Redemption"}`,
        sublabel: g.gift_cards?.code || "",
        amount: Number(g.amount),
        direction: g.transaction_type === "credit" ? "in" : "out",
        status: "completed", date: g.created_at,
      }));

      // Sort all by date descending
      unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAll(unified);
    } catch (err) {
      console.error("Error fetching unified transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Reset page when filter changes
  useEffect(() => { setPage(0); }, [activeType]);

  const filtered = activeType === "all" ? all : all.filter(t => t.type === activeType);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const typeCounts: Record<string, number> = { all: all.length };
  all.forEach(t => { typeCounts[t.type] = (typeCounts[t.type] || 0) + 1; });

  const filters: { key: TxType | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "sale", label: "Sales" },
    { key: "collection", label: "Collections" },
    { key: "wallet", label: "Wallet" },
    { key: "utility", label: "Utilities" },
    { key: "gift_card", label: "Gift Cards" },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <History className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-bold">Transaction History</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap mt-3">
          {filters.map(f => {
            const count = typeCounts[f.key] || 0;
            if (f.key !== "all" && count === 0) return null;
            return (
              <button
                key={f.key}
                onClick={() => setActiveType(f.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  activeType === f.key
                    ? "bg-[hsl(225_60%_25%)] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f.label}
                <span className={`text-[10px] ${activeType === f.key ? "text-white/70" : "text-muted-foreground/60"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {merchantHistoryUnavailable && (
          <div role="alert" className="mx-4 mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            Live processor history is temporarily unavailable. The transactions below may be incomplete until you refresh.
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {paged.map(tx => {
              const cfg = typeConfig[tx.type];
              const Icon = cfg.icon;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  {/* Icon */}
                  <div className={`p-2 rounded-xl shrink-0 ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{tx.label}</p>
                      <Badge className={`text-[9px] px-1.5 py-0 h-4 font-bold ${statusColor(tx.status)}`}>
                        {tx.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {tx.sublabel && <span className="text-[10px] text-muted-foreground truncate">{tx.sublabel}</span>}
                      {tx.method && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          {methodIcon(tx.method)}
                          {tx.method}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount + date */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${tx.direction === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                      {tx.direction === "in" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(tx.date), "MMM d, HH:mm")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 rounded-lg text-xs font-semibold transition-all ${
                      p === page ? "bg-[hsl(225_60%_25%)] text-white" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p + 1}
                  </button>
                );
              })}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

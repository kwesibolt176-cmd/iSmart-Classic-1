import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  UtensilsCrossed, Package, Scissors, Sparkles, Wrench, Car,
  Eye, EyeOff, Sparkle, CloudSun, Sunset, Moon,
  BarChart2, TrendingUp, TrendingDown, ExternalLink
} from "lucide-react";
import { OrdersChart } from "./OrdersChart";
import { TimeReportCard } from "./TimeReportCard";
import { InventoryStatsCard } from "./InventoryStatsCard";
import LowStockAlertsBanner from "./LowStockAlertsBanner";
import { OngoingOrdersTracker } from "./OngoingOrdersTracker";
import { CashReconciliationReminder } from "./CashReconciliationReminder";
import { WalletBalanceCard } from "./dashboard/WalletBalanceCard";
import { TotalCollectionsCard, TotalDisbursementsCard } from "./dashboard/CollectionsDisbursementsCards";
import { NetCashflowCard } from "./dashboard/NetCashflowCard";
import { QuickActions } from "./dashboard/QuickActions";
import { DashboardTransactionHistory } from "./dashboard/DashboardTransactionHistory";
import { VerificationBadge } from "./VerificationBadge";
import { OrdersList } from "./OrdersList";
import { UnpaidInvoicesWidget } from "./UnpaidInvoicesWidget";
import { WalletTopUpDialog } from "@/components/WalletTopUpDialog";
import { DisbursementDialog } from "@/components/DisbursementDialog";
import { PaymentLinkDialog } from "@/components/PaymentLinkDialog";
import { AirtimeDataDialog } from "@/components/AirtimeDataDialog";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { PinVerificationDialog } from "./PinVerificationDialog";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useLowStockAlerts } from "@/hooks/use-low-stock-alerts";
import { useCurrency } from "@/hooks/use-currency";

const getItemsSoldConfig = (industry: string | undefined) => {
  switch (industry) {
    case 'restaurant': case 'full_service_restaurant': case 'quick_service':
    case 'food_truck': case 'bakery': case 'coffee_shop': case 'catering':
    case 'bar_brewery': case 'franchise':
      return { label: 'Dishes Sold', icon: UtensilsCrossed };
    case 'retail': case 'grocery': case 'clothing': case 'clothing_retail':
    case 'home_gift': case 'wine_liquor': case 'garden': case 'garden_retail':
      return { label: 'Products Sold', icon: Package };
    case 'salon': case 'barbershop': case 'nail_salon': case 'hair_salon':
    case 'beauty_salon': case 'tattoo_piercing':
      return { label: 'Services Done', icon: Scissors };
    case 'spa': case 'med_spa': case 'day_spa': case 'fitness':
    case 'healthcare': case 'cbd':
      return { label: 'Sessions Done', icon: Sparkles };
    case 'automotive': case 'transportation':
      return { label: 'Services Done', icon: Car };
    case 'cleaning': case 'contractors': case 'landscaping':
      return { label: 'Jobs Done', icon: Wrench };
    default:
      return { label: 'Items Sold', icon: Package };
  }
};

export const Dashboard = ({ onSectionChange, prefetchedData }: { 
  onSectionChange?: (section: string) => void;
  prefetchedData?: {
    revenue: number; paidOrders: number; itemsSold: number; yesterdayRevenue: number;
    walletBalance: number; collections: number; disbursements: number; netCashflow: number; inventoryCount: number;
  };
}) => {
  const { user, profile, showBalance, setShowBalance } = useBusiness();
  const { currentLocation } = useLocation();
  const { format: formatCurrency } = useCurrency();

  const itemsSoldConfig = useMemo(() => getItemsSoldConfig(profile?.industry), [profile?.industry]);

  const isRestaurantIndustry = useMemo(() => {
    const foodIndustries = ["restaurant", "bakery", "bar_brewery", "catering", "coffee_shop",
      "food_truck", "franchise", "full_service_restaurant", "quick_service"];
    return foodIndustries.includes(profile?.industry || "");
  }, [profile?.industry]);

  useLowStockAlerts();

  const [stats, setStats] = useState({
    revenue: prefetchedData?.revenue ?? 0,
    paidOrders: prefetchedData?.paidOrders ?? 0,
    itemsSold: prefetchedData?.itemsSold ?? 0,
    loading: !prefetchedData,
    yesterdayRevenue: prefetchedData?.yesterdayRevenue ?? 0,
  });
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isSendMoneyOpen, setIsSendMoneyOpen] = useState(false);
  const [isPaymentLinkOpen, setIsPaymentLinkOpen] = useState(false);
  const [isAirtimeOpen, setIsAirtimeOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const currentHour = new Date().getHours();
  const isMorning = currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 18;
  const greeting = isMorning ? 'Good morning' : isAfternoon ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (user?.id) fetchDashboardStats();
  }, [user?.id, currentLocation?.id]);

  const fetchDashboardStats = async () => {
    if (!user) return;
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

      let txQ = supabase.from("transactions").select("amount").eq("user_id", user.id)
        .gte("transaction_date", today.toISOString()).lt("transaction_date", tomorrow.toISOString()).eq("status", "completed");
      if (currentLocation) txQ = txQ.eq("location_id", currentLocation.id);
      const { data: tx } = await txQ;

      let ytxQ = supabase.from("transactions").select("amount").eq("user_id", user.id)
        .gte("transaction_date", yesterday.toISOString()).lt("transaction_date", today.toISOString()).eq("status", "completed");
      if (currentLocation) ytxQ = ytxQ.eq("location_id", currentLocation.id);
      const { data: ytx } = await ytxQ;

      const { data: inv } = await supabase.from("invoices").select("paid_amount").eq("user_id", user.id)
        .in("status", ["paid", "partially_paid"]).not("payment_date", "is", null)
        .gte("payment_date", today.toISOString()).lt("payment_date", tomorrow.toISOString());

      const { data: yInv } = await supabase.from("invoices").select("paid_amount").eq("user_id", user.id)
        .in("status", ["paid", "partially_paid"]).not("payment_date", "is", null)
        .gte("payment_date", yesterday.toISOString()).lt("payment_date", today.toISOString());

      let ordQ = supabase.from("orders").select("id, order_items(quantity)").eq("user_id", user.id)
        .gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString()).in("status", ["completed", "served"]);
      if (currentLocation) ordQ = ordQ.eq("location_id", currentLocation.id);
      const { data: orders } = await ordQ;

      const txRev = tx?.reduce((s, t) => s + Number(t.amount), 0) || 0;
      const invRev = inv?.reduce((s, i) => s + Number(i.paid_amount || 0), 0) || 0;
      const ytxRev = ytx?.reduce((s, t) => s + Number(t.amount), 0) || 0;
      const yInvRev = yInv?.reduce((s, i) => s + Number(i.paid_amount || 0), 0) || 0;

      setStats({
        revenue: txRev + invRev,
        paidOrders: orders?.length || 0,
        itemsSold: orders?.reduce((s, o: any) =>
          s + (o.order_items?.reduce((is: number, i: any) => is + i.quantity, 0) || 0), 0) || 0,
        loading: false,
        yesterdayRevenue: ytxRev + yInvRev,
      });
    } catch {
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const revenueChange = stats.yesterdayRevenue > 0
    ? Math.round(((stats.revenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100)
    : null;
  const revenueUp = revenueChange !== null && revenueChange >= 0;

  return (
    <div className="flex-1 overflow-auto bg-background">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-lg">
        <div className="px-5 sm:px-8 py-4 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
              isMorning ? 'bg-amber-50 border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-800/30'
              : isAfternoon ? 'bg-orange-50 border-orange-200/60 dark:bg-orange-950/30 dark:border-orange-800/30'
              : 'bg-indigo-50 border-indigo-200/60 dark:bg-indigo-950/30 dark:border-indigo-800/30'
            }`}>
              {isMorning ? <CloudSun className="h-5 w-5 text-amber-500" />
                : isAfternoon ? <Sunset className="h-5 w-5 text-orange-500" />
                : <Moon className="h-5 w-5 text-indigo-500" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {greeting}{profile?.business_name ? `, ${profile.business_name}` : ''}
              </h1>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationsDropdown />
            <VerificationBadge compact />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-8">

        {/* Alerts */}
        <div className="space-y-2">
          <LowStockAlertsBanner onViewInventory={() => onSectionChange?.('products-inventory')} />
          <CashReconciliationReminder onReconcile={() => onSectionChange?.('reports')} />
        </div>

        {/* ── SECTION 1: Quick Actions ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</p>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <QuickActions
            onSectionChange={onSectionChange}
            onTopUpWallet={() => setIsTopUpOpen(true)}
            onSendMoney={() => setIsSendMoneyOpen(true)}
            onPaymentLink={() => setIsPaymentLinkOpen(true)}
            onBuyAirtime={() => setIsAirtimeOpen(true)}
          />
        </div>

        {/* ── SECTION 2: Today's snapshot — Revenue hero + Wallet ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Overview</p>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* Revenue hero — spans 2 cols */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 group hover:shadow-md hover:border-primary/20 transition-all duration-300">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary/5 pointer-events-none" />
              <div className="relative flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                      <Sparkle className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Today's Revenue</p>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs font-bold gap-1.5 bg-[hsl(225_60%_25%)] hover:bg-[hsl(225_60%_20%)] text-white border-0 shrink-0"
                      onClick={() => setAnalyticsOpen(true)}
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">View Analytics</span>
                      <span className="sm:hidden">Analytics</span>
                    </Button>
                    {!stats.loading && stats.revenue > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        Live
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => { if (!showBalance && profile?.admin_pin) setPinDialogOpen(true); else setShowBalance(!showBalance); }}>
                    {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-3xl font-black text-foreground tabular-nums tracking-tight leading-none">
                    {stats.loading
                      ? <span className="inline-block h-9 w-36 bg-muted animate-pulse rounded" />
                      : showBalance ? formatCurrency(stats.revenue) : '****'}
                  </p>
                  {revenueChange !== null && (
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      revenueUp ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      {revenueUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(revenueChange)}% vs yesterday
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-border/40">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Orders</p>
                    {stats.loading
                      ? <div className="h-5 w-8 bg-muted animate-pulse rounded" />
                      : <p className="text-lg font-black text-foreground tabular-nums">{stats.paidOrders}</p>}
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{itemsSoldConfig.label}</p>
                    {stats.loading
                      ? <div className="h-5 w-8 bg-muted animate-pulse rounded" />
                      : <p className="text-lg font-black text-foreground tabular-nums">{stats.itemsSold}</p>}
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Inventory</p>
                    <div className="text-lg font-black text-foreground tabular-nums">
                      {stats.loading
                        ? <div className="h-5 w-8 bg-muted animate-pulse rounded" />
                        : <InventoryStatsCard loading={false} variant="hero" initialCount={prefetchedData?.inventoryCount} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet balance */}
            <div className="rounded-xl overflow-hidden border hover:shadow-md hover:border-primary/15 transition-all duration-300">
              <WalletBalanceCard initialBalance={prefetchedData?.walletBalance} />
            </div>
          </div>
        </div>

        {/* ── SECTION 3: Financial overview ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Financial Overview</p>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TotalCollectionsCard initialValue={prefetchedData?.collections} />
            <TotalDisbursementsCard initialValue={prefetchedData?.disbursements} />
            <NetCashflowCard initialIncoming={prefetchedData?.collections} initialOutgoing={prefetchedData?.disbursements} />
          </div>
        </div>

        {/* ── SECTION 4: Transaction History ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transaction History</p>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <DashboardTransactionHistory />
        </div>

      </div>

      {/* ── Analytics Dialog ── */}
      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50 bg-gradient-to-r from-primary/[0.04] to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <BarChart2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold leading-tight">Analytics & Insights</DialogTitle>
                <p className="text-xs text-muted-foreground">Performance overview for your business</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 text-xs hidden sm:flex"
                onClick={() => { setAnalyticsOpen(false); onSectionChange?.('reports'); }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Full Reports
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setAnalyticsOpen(false)}
              >
                <span className="text-xl leading-none">×</span>
              </Button>
            </div>
          </div>

          {/* Content — 2 column layout */}
          <div className="p-5 space-y-5">
            {/* Top row: charts side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden border border-border/50">
                <OrdersChart />
              </div>
              <div className="rounded-xl overflow-hidden border border-border/50">
                <TimeReportCard />
              </div>
            </div>

            {/* Bottom row: sidebar widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isRestaurantIndustry && (
                <div className="sm:col-span-2 lg:col-span-1">
                  <OngoingOrdersTracker />
                </div>
              )}
              <UnpaidInvoicesWidget onViewInvoices={() => { setAnalyticsOpen(false); onSectionChange?.('invoices'); }} />
              <OrdersList />
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <WalletTopUpDialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen} />
      <DisbursementDialog open={isSendMoneyOpen} onOpenChange={setIsSendMoneyOpen} />
      <PaymentLinkDialog open={isPaymentLinkOpen} onOpenChange={setIsPaymentLinkOpen} />
      <AirtimeDataDialog open={isAirtimeOpen} onOpenChange={setIsAirtimeOpen} />
      <PinVerificationDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        correctPin={profile?.admin_pin || ""}
        onSuccess={() => { setShowBalance(true); setPinDialogOpen(false); }}
      />
    </div>
  );
};

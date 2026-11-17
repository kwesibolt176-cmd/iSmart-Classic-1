import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { fetchMerchantWalletBalance } from "@/lib/merchant-wallet";
import { Wallet, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PinVerificationDialog } from "@/components/PinVerificationDialog";

export function WalletBalanceCard({ initialBalance }: { initialBalance?: number }) {
  const { profile, showBalance, setShowBalance } = useBusiness();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const { format: formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(initialBalance === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(initialBalance ?? 0);
  const [source, setSource] = useState<"ismart" | "local">("local");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (profile?.id && !hasFetched.current) {
      hasFetched.current = true;
      if (initialBalance !== undefined) {
        setLoading(false);
        fetchFromISmart();
      } else {
        fetchWalletBalance();
      }
    }
  }, [profile?.id]);

  const fetchWalletBalance = async () => {
    if (!profile?.id) return;

    // 1. Show local DB data instantly
    try {
      const { data } = await supabase
        .from("business_wallets")
        .select("available_balance")
        .eq("business_id", profile.id)
        .maybeSingle();

      setBalance(data?.available_balance || 0);
      setSource("local");
      setLoading(false);
    } catch (err) {
      console.error("Error fetching local wallet:", err);
      setLoading(false);
    }

    // 2. Then refresh from iSmart in the background
    fetchFromISmart();
  };

  const fetchFromISmart = async () => {
    const merchantBusinessId = profile?.merchant_business_id || profile?.ismart_business_id;
    if (!merchantBusinessId) return;
    setRefreshing(true);
    try {
      const walletBalance = await fetchMerchantWalletBalance(merchantBusinessId, "GHS");
      if (walletBalance !== null) {
        setBalance(walletBalance);
        setSource("ismart");

        if (profile?.id) {
          supabase
            .from("business_wallets")
            .update({ available_balance: walletBalance })
            .eq("business_id", profile.id)
            .then();
        }
      }
    } catch (err) {
      console.warn("Merchant wallet balance unavailable:", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-300 border-border bg-card relative overflow-hidden h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 p-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Wallet Balance
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (!showBalance && profile?.admin_pin) {
                setPinDialogOpen(true);
              } else {
                setShowBalance(!showBalance);
              }
            }}
          >
            {showBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={fetchFromISmart}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 px-4 pb-4">
        <div className="text-xl font-bold tracking-tight text-foreground tabular-nums mb-1">
          {loading ? (showBalance ? "..." : "****") : (showBalance ? formatCurrency(balance) : "****")}
        </div>
        <div className="flex items-center gap-2">
          {refreshing ? (
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Syncing...</span>
            </div>
          ) : (
            <>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                balance > 0 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {balance > 0 ? "Active" : "Empty"}
              </span>
              {source === "ismart" && (
                <span className="text-xs text-muted-foreground">• Live data</span>
              )}
            </>
          )}
        </div>
      </CardContent>

      <PinVerificationDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        correctPin={profile?.admin_pin || ""}
        onSuccess={() => {
          setShowBalance(true);
          setPinDialogOpen(false);
        }}
      />
    </Card>
  );
}

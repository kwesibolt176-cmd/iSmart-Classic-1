import { useEffect, useMemo, useState } from "react";
import { callMerchantApi } from "@/lib/merchant-api";
import { resolveISmartBusinessId } from "@/lib/ismart-business";

export type WalletPaymentMethod = {
  provider: string;
  currency: string;
  rail: "collection" | "disbursement";
  health: "healthy" | "degraded" | "down";
  limits: { min: string; max: string };
};

export const useWalletPaymentMethods = (profile: unknown, enabled: boolean) => {
  const [methods, setMethods] = useState<WalletPaymentMethod[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const businessId = resolveISmartBusinessId(profile);
    if (!businessId) return;
    let active = true;
    setLoading(true);
    callMerchantApi<{ items?: WalletPaymentMethod[] }>("listWalletPaymentMethods", { path: { id: businessId } })
      .then((page) => { if (active) setMethods(page.items || []); })
      .catch(() => { if (active) setMethods([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled, profile]);

  return useMemo(() => ({ methods, loading }), [methods, loading]);
};

export const railHealth = (
  methods: WalletPaymentMethod[] | null,
  rail: WalletPaymentMethod["rail"],
  provider: string,
  currency: string,
) => methods?.find((method) =>
  method.rail === rail && method.provider.toLowerCase() === provider.toLowerCase() &&
  method.currency.toUpperCase() === currency.toUpperCase()
)?.health;

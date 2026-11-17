export type CheckoutSettings = {
  enabled: boolean;
  ready: boolean;
  environment: "test" | "live";
  eligible: { ok: boolean; reason: string };
};

export type MerchantCheckout = {
  id: string;
  reference: string;
  url: string;
  environment: "test" | "live";
  status: "open" | "paid" | "expired" | "cancelled";
  expiresAt: string | null;
};

export const checkoutEligibilityMessage = (settings: CheckoutSettings) => {
  if (settings.ready) return null;
  switch (settings.eligible.reason) {
    case "tier_below_2": return "Hosted checkout requires Merchant verification tier 2 or higher.";
    case "business_unverified": return "Verify the Merchant business before enabling hosted checkout.";
    case "merchant_inactive": return "The Merchant business must be active before hosted checkout can be enabled.";
    default: return "Hosted checkout is not ready for this Merchant account.";
  }
};

export const buildCheckoutRequest = (input: {
  reference: string;
  title: string;
  description?: string;
  fixedAmount: boolean;
  amount?: number;
}) => ({
  reference: input.reference,
  amountType: input.fixedAmount ? "fixed" as const : "open" as const,
  amount: input.fixedAmount ? input.amount?.toFixed(2) : null,
  currency: "GHS" as const,
  usage: "reusable" as const,
  description: (input.description?.trim() || input.title.trim()).slice(0, 140),
  expiresInMinutes: null,
});

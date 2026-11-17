export type CampaignWinnerCriterion = "open_rate" | "click_rate" | "conversion";

export interface CampaignVariantMetrics {
  variant: "A" | "B";
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export interface CampaignWinnerResult {
  winner: "A" | "B" | null;
  reason: "winner" | "tie" | "insufficient_data";
  rates: Record<"A" | "B", number>;
}

export const determineCampaignWinner = (
  variants: CampaignVariantMetrics[],
  criterion: CampaignWinnerCriterion,
): CampaignWinnerResult => {
  const byVariant = new Map(variants.map((variant) => [variant.variant, variant]));
  const a = byVariant.get("A");
  const b = byVariant.get("B");
  if (!a || !b || a.sent === 0 || b.sent === 0) {
    return { winner: null, reason: "insufficient_data", rates: { A: 0, B: 0 } };
  }

  const metric = criterion === "open_rate" ? "opened" : criterion === "click_rate" ? "clicked" : "converted";
  const rates = { A: a[metric] / a.sent, B: b[metric] / b.sent };
  if (rates.A === rates.B) return { winner: null, reason: "tie", rates };
  return { winner: rates.A > rates.B ? "A" : "B", reason: "winner", rates };
};

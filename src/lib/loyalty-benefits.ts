export const normalizeLoyaltyBenefits = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((benefit) => benefit.trim())
    .filter(Boolean);

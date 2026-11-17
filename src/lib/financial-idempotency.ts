export type FinancialAttempt = { fingerprint: string; requestId: string };

export const getFinancialAttempt = (
  current: FinancialAttempt | null,
  fingerprint: string,
  createId: () => string = () => crypto.randomUUID(),
): FinancialAttempt => {
  if (current?.fingerprint === fingerprint) return current;
  return { fingerprint, requestId: createId() };
};

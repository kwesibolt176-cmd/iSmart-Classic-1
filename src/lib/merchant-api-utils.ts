export const merchantBusinessPath = (businessId: string) => ({ id: businessId });

export const createIdempotencyKey = (scope: string, stableReference?: string) =>
  stableReference ? `${scope}:${stableReference}` : `${scope}:${crypto.randomUUID()}`;

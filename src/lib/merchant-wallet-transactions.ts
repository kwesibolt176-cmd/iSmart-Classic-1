export interface MerchantWalletTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  fee: number;
  balance_before: number;
  balance_after: number;
  reference: string;
  description: string | null;
  status: string;
  created_at: string;
  source: "merchant_api" | "local";
}

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};

const textValue = (...values: unknown[]) => {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" ? value.trim() : "";
};

const numberValue = (...values: unknown[]) => {
  for (const value of values) {
    const candidate = record(value).amount ?? record(value).value ?? value;
    const parsed = typeof candidate === "number" ? candidate : Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const transactionItems = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const root = record(payload);
  const data = record(root.data);
  for (const candidate of [root.items, root.transactions, root.results, data.items, data.transactions, root.data]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const normalizedType = (item: UnknownRecord) => {
  const raw = textValue(item.rail, item.transaction_type, item.transactionType, item.type, item.kind).toLowerCase();
  if (raw.includes("collection") || raw.includes("credit") || raw.includes("deposit")) return "collection";
  if (raw.includes("payout") || raw.includes("disbursement") || raw.includes("withdraw")) return "disbursement";
  if (raw.includes("utility")) return "utility_payment";
  if (raw.includes("transfer")) return "transfer";
  return raw.replace(/[^a-z0-9]+/g, "_") || "wallet_transaction";
};

export const normalizeMerchantWalletTransactions = (payload: unknown): MerchantWalletTransaction[] =>
  transactionItems(payload).map((value, index) => {
    const item = record(value);
    const reference = textValue(
      item.reference,
      item.client_reference,
      item.clientReference,
      item.provider_reference,
      item.providerReference,
      item.id,
    );
    const id = textValue(item.id, item.transaction_id, item.transactionId, reference) || String(index);
    const createdAt = textValue(item.created_at, item.createdAt, item.initiated_at, item.initiatedAt, item.updated_at, item.updatedAt);
    return {
      id: `api-${id}`,
      transaction_type: normalizedType(item),
      amount: numberValue(item.amount, item.net_amount, item.netAmount),
      fee: numberValue(item.fee, item.fees),
      balance_before: numberValue(item.balance_before, item.balanceBefore),
      balance_after: numberValue(item.balance_after, item.balanceAfter),
      reference: reference || id,
      description: textValue(item.description, item.narration, item.recipient_name, item.recipientName) || null,
      status: textValue(item.status, item.state).toLowerCase() || "pending",
      created_at: createdAt || new Date(0).toISOString(),
      source: "merchant_api" as const,
    };
  });

const referenceKey = (transaction: MerchantWalletTransaction) => {
  const reference = transaction.reference.trim().toLowerCase();
  return reference ? `reference:${reference}` : `id:${transaction.id}`;
};

export const mergeWalletTransactions = (
  apiTransactions: MerchantWalletTransaction[],
  localTransactions: MerchantWalletTransaction[],
) => {
  const merged = new Map<string, MerchantWalletTransaction>();
  // The Merchant API is the financial source of truth, so insert it first.
  for (const transaction of apiTransactions) merged.set(referenceKey(transaction), transaction);
  for (const transaction of localTransactions) {
    const key = referenceKey(transaction);
    if (!merged.has(key)) merged.set(key, transaction);
  }
  return [...merged.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
};

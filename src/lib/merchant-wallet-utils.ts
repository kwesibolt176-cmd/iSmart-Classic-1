export type WalletAccount = {
  name: string;
  status: string;
  balances?: Record<string, string>;
};

export type WalletProvisioning = {
  reference: string;
  status: string;
  accounts: WalletAccount[];
};

export const walletBalanceFromProvisioning = (wallet: WalletProvisioning, currency = "GHS") => {
  const account = wallet.accounts.find((item) => item.name === "main") || wallet.accounts[0];
  const raw = account?.balances?.[currency];
  return raw === undefined || raw === null || Number.isNaN(Number(raw)) ? null : Number(raw);
};

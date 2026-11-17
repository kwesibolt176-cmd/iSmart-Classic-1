import { callMerchantApi, createIdempotencyKey } from "@/lib/merchant-api";
import { walletBalanceFromProvisioning, type WalletProvisioning } from "@/lib/merchant-wallet-utils";

export { walletBalanceFromProvisioning } from "@/lib/merchant-wallet-utils";

export const fetchMerchantWalletBalance = async (merchantBusinessId: string, currency = "GHS") => {
  const wallet = await callMerchantApi<WalletProvisioning>("provisionBusinessWallet", {
    path: { id: merchantBusinessId },
    idempotencyKey: createIdempotencyKey("wallet-balance"),
  });
  return walletBalanceFromProvisioning(wallet, currency);
};

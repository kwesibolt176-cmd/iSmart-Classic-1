import { callMerchantApi } from "@/lib/merchant-api";

type VerificationPayload = Record<string, unknown>;

export async function verifyAccount(payload: VerificationPayload) {
  const businessId = localStorage.getItem("ismart_business_id");
  if (!businessId) throw new Error("Merchant business is not linked");
  const channel = String(payload.channel || "").toLowerCase();
  if (channel === "bank") {
    throw new Error("Bank beneficiary lookup is not available in the Merchant API. Confirm the account details with the recipient.");
  }
  const provider = String(payload.operator || payload.provider || "").toLowerCase().replace("vodafone", "telecel");
  const partyValue = String(payload.mobile_number || payload.phone || "");
  const result = await callMerchantApi<{ name: string; active: boolean; provider: string }>("lookupWalletParty", {
    path: { id: businessId },
    query: { provider, partyValue },
  });
  if (!result.active) throw new Error("The mobile money account is not active");
  return { data: { accountName: result.name, accountname: result.name }, ...result };
}

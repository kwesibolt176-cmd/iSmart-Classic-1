import { MerchantApiError } from "./merchant-api-client.ts";

const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const requireClientRequestId = (value: unknown) => {
  const requestId = String(value || "").trim();
  if (!REQUEST_ID.test(requestId)) {
    throw new MerchantApiError(400, "invalid_request_id", "A valid client request id is required");
  }
  return requestId;
};

export const financialReference = (prefix: "TOPUP" | "PAY", requestId: string) =>
  `${prefix}_${requestId.replaceAll("-", "")}`;

export const normalizeProvider = (value: unknown) =>
  String(value || "").trim().toLowerCase().replace("vodafone", "telecel");

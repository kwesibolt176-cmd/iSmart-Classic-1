// iMail API client - replaces legacy iSmart SMS/Email endpoints
// Endpoints: https://imail.ismartghana.com/send/message and /send/send-html-email

import { MerchantApiError } from "./merchant-api-client.ts";
import { serviceClient } from "./merchant-session.ts";
import { getPlatformSecret } from "./platform-secrets.ts";
import { buildIMailRequest } from "./imail-payload.ts";

export type IMailChannel = "sms" | "email";
export type IMailNotificationType = "otp" | "notification" | "campaign" | "receipt" | "payment_link";

export interface IMailSendParams {
  channel: IMailChannel;
  recipient: string; // phone number for sms, email address for email
  message: string;
  service_name?: string;
  notification_type?: IMailNotificationType;
  message_type?: string;
  message_form?: "plain" | "html";
  subject?: string; // email only
}

export interface IMailResponse {
  ok: boolean;
  status: number;
  body: {
    error?: string;
    message?: string;
    message_id?: string;
    id?: string;
    [key: string]: unknown;
  } | null;
}

const apiKey = async () => {
  const key = Deno.env.get("IMAIL_API_KEY") || await getPlatformSecret(serviceClient(), "imail_api_key");
  if (!key) throw new MerchantApiError(503, "imail_not_configured", "Email and SMS delivery is temporarily unavailable.");
  return key;
};

export async function validateIMailApiKey(candidate?: string): Promise<{ valid: boolean; status: number }> {
  const key = candidate?.trim() || await apiKey();
  // Use a complete request and the RFC-reserved .invalid domain. Some gateways
  // validate the body before credentials, so an empty body can produce a false
  // positive. This cannot deliver to a real recipient.
  const response = await fetch("https://imail.ismartghana.com/send/message", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify({
      channel: "email",
      service_name: "consumer-backend",
      notification_type: "notification",
      email: "credential-check@example.invalid",
      subject: "Credential check",
      message_type: "text",
      message_details: "Credential validation only",
      message_form: "plain",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  await response.body?.cancel();
  if (response.status === 401 || response.status === 403) return { valid: false, status: response.status };
  if (response.status >= 500) throw new MerchantApiError(503, "imail_unavailable", "iMail could not validate the API key right now.");
  return { valid: true, status: response.status };
}

export async function sendIMailMessage(params: IMailSendParams): Promise<IMailResponse> {
  const request = buildIMailRequest(params);

  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": await apiKey() },
    body: JSON.stringify(request.payload),
    signal: AbortSignal.timeout(15_000),
  });

  // Read the body once as text: calling json() and then cancel() on a non-JSON
  // reply throws "Cannot cancel a locked ReadableStream" and turns a delivered
  // message into a 500.
  const text = await response.text().catch(() => "");
  let body: IMailResponse["body"] = null;
  try {
    const parsed: unknown = text ? JSON.parse(text) : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as NonNullable<IMailResponse["body"]>;
  } catch {
    body = text ? { message: text.slice(0, 500) } : null;
  }

  return { ok: response.ok, status: response.status, body };
}

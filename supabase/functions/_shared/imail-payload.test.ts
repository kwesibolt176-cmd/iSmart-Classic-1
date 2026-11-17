import { describe, expect, it } from "vitest";
import { buildIMailRequest, IMAIL_ENDPOINT, IMAIL_HTML_ENDPOINT } from "./imail-payload";

describe("iMail request routing", () => {
  it("routes SMS through the message endpoint", () => {
    expect(buildIMailRequest({ channel: "sms", recipient: "233241234567", message: "Your code is 123456", notification_type: "otp" })).toEqual({
      endpoint: IMAIL_ENDPOINT,
      payload: {
        channel: "sms",
        service_name: "consumer-backend",
        notification_type: "otp",
        phone_number: "233241234567",
        message_type: "text",
        message_details: "Your code is 123456",
        message_form: "plain",
      },
    });
  });

  it("preserves an explicitly registered service name", () => {
    expect(buildIMailRequest({
      channel: "sms",
      recipient: "233241234567",
      message: "Test",
      service_name: "merchant-portal",
    }).payload).toMatchObject({ service_name: "merchant-portal" });
  });

  it("routes plain email through the message endpoint", () => {
    expect(buildIMailRequest({ channel: "email", recipient: "someone@example.com", subject: "Welcome", message: "Hello", message_form: "plain" })).toMatchObject({
      endpoint: IMAIL_ENDPOINT,
      payload: { email: "someone@example.com", subject: "Welcome", message_details: "Hello", message_form: "plain" },
    });
  });

  it("routes HTML email through the dedicated HTML endpoint", () => {
    expect(buildIMailRequest({ channel: "email", recipient: "someone@example.com", subject: "Verify", message: "<p>Code</p>", message_form: "html" })).toEqual({
      endpoint: IMAIL_HTML_ENDPOINT,
      payload: { receiver: "someone@example.com", subject: "Verify", htmlContent: "<p>Code</p>" },
    });
  });
});

export const IMAIL_ENDPOINT = "https://imail.ismartghana.com/send/message";
export const IMAIL_HTML_ENDPOINT = "https://imail.ismartghana.com/send/send-html-email";

export type IMailPayloadParams = {
  channel: "sms" | "email";
  recipient: string;
  message: string;
  service_name?: string;
  notification_type?: string;
  message_type?: string;
  message_form?: "plain" | "html";
  subject?: string;
};

export const buildIMailRequest = (params: IMailPayloadParams) => {
  const isHtmlEmail = params.channel === "email" && params.message_form === "html";
  if (isHtmlEmail) {
    return {
      endpoint: IMAIL_HTML_ENDPOINT,
      payload: { receiver: params.recipient, subject: params.subject, htmlContent: params.message },
    };
  }

  return {
    endpoint: IMAIL_ENDPOINT,
    payload: {
      channel: params.channel,
      // The iMail key is provisioned for this registered service name.
      service_name: params.service_name || "consumer-backend",
      notification_type: params.notification_type || "notification",
      ...(params.channel === "sms" ? { phone_number: params.recipient } : { email: params.recipient }),
      ...(params.channel === "email" && params.subject ? { subject: params.subject } : {}),
      message_type: params.message_type || "text",
      message_details: params.message,
      message_form: "plain",
    },
  };
};

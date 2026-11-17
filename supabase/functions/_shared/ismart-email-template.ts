// Unified iSmartPay branded email template.
// Used by every email-sending edge function so all customer/merchant
// emails share the same look-and-feel. All emails are delivered through
// the iMail (iSmart) API via `sendIMailMessage`.

export interface IsmartEmailOptions {
  /** Optional accent title shown at the top of the white header card (e.g. "Transaction Successful"). */
  title?: string;
  /** Color of the accent title. Default: dark gray. Use red for failure states. */
  titleColor?: string;
  /** Inner HTML for the white content section. Should already include any greeting/paragraphs. */
  bodyHtml: string;
  /** Optional preheader (preview) text shown in inbox snippets. */
  preheader?: string;
  /** Document <title>. Defaults to "iSmartPay". */
  documentTitle?: string;
}

const LOGO_URL =
  Deno.env.get("ISMARTPAY_LOGO_URL") ||
  "https://www.ismartghana.com/logo.png";

const FOOTER = {
  phone: "0302944139",
  website: "https://www.ismartghana.com",
  websiteLabel: "www.ismartghana.com",
  digitalAddress: "GA-119-8029",
  location: "Rabat Plot 2, Shiashie, 2nd Zaire Avenue, East Legon",
};

export function renderIsmartEmail(opts: IsmartEmailOptions): string {
  const {
    title,
    titleColor = "#000000",
    bodyHtml,
    preheader = "",
    documentTitle = "iSmartPay",
  } = opts;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(documentTitle)} - iSmartPay</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: "Helvetica Neue", Arial, sans-serif;
        background-color: #f6f7f8;
        padding: 20px;
        color: #000;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #f6f7f8;
        padding: 20px;
      }
      .header-section {
        background-color: #ffffff;
        border-radius: 12px;
        padding: 32px 20px;
        text-align: center;
        margin-bottom: 25px;
      }
      .logo { display: inline-block; }
      .logo img { width: 160px; height: auto; display: inline-block; }
      .transaction-title {
        font-size: 26px;
        font-weight: 700;
        opacity: 0.85;
        margin-top: 18px;
      }
      .content-section {
        background-color: #ffffff;
        padding: 28px 24px;
        margin-bottom: 25px;
        border-radius: 12px;
        font-size: 16px;
        line-height: 24px;
      }
      .content-section h2 {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      .content-section p { margin-bottom: 14px; }
      .content-section a { color: #42abed; text-decoration: underline; }
      .content-section .btn {
        display: inline-block;
        background-color: #33CC33;
        color: #ffffff !important;
        text-decoration: none;
        font-weight: 500;
        padding: 14px 28px;
        border-radius: 6px;
        font-size: 16px;
        margin: 12px 0;
      }
      .content-section .code-box {
        font-size: 28px;
        letter-spacing: 8px;
        font-weight: bold;
        text-align: center;
        padding: 18px;
        background: #f4f4f5;
        border-radius: 8px;
        margin: 16px 0;
      }
      .footer {
        background-color: #011272;
        padding: 28px 32px;
        color: #ffffff;
        font-size: 13px;
        line-height: 1.8;
        border-radius: 12px;
      }
      .footer-title { font-weight: 600; margin-bottom: 8px; font-size: 14px; }
      .footer a { color: #ffffff; text-decoration: underline; }
      .footer-company { margin-top: 12px; font-weight: 600; }
      .preheader { display: none; max-height: 0; overflow: hidden; opacity: 0; }
    </style>
  </head>
  <body>
    ${preheader ? `<div class="preheader">${escapeHtml(preheader)}</div>` : ""}
    <div class="email-container">
      <div class="header-section">
        <div class="logo">
          <img src="${LOGO_URL}" alt="iSmartPay" />
        </div>
        ${
          title
            ? `<h1 class="transaction-title" style="color:${titleColor}">${escapeHtml(
                title,
              )}</h1>`
            : ""
        }
      </div>

      <div class="content-section">
        ${bodyHtml}
      </div>

      <div class="footer">
        <div class="footer-title">Customer Service</div>
        <div>t: ${FOOTER.phone}</div>
        <div>w: <a href="${FOOTER.website}">${FOOTER.websiteLabel}</a></div>
        <div>digital address: ${FOOTER.digitalAddress}</div>
        <div>l: ${FOOTER.location}</div>
        <div class="footer-company">iSmartPay</div>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SampleEmail {
  key: string;
  subject: string;
  html: string;
}

function buildSamples(): SampleEmail[] {
  const samples: SampleEmail[] = [];

  samples.push({
    key: "welcome",
    subject: "Welcome to iSmartPay",
    html: renderIsmartEmail({
      title: "Welcome to iSmartPay",
      documentTitle: "Welcome",
      preheader: "Your iSmartPay account is ready",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Welcome aboard! Your iSmartPay account has been created successfully.</p>
        <p>From your dashboard you can accept payments, send invoices, manage inventory, and run your business — all in one place.</p>
        <p style="text-align:center;"><a class="btn" href="${Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com"}">Go to Dashboard</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "transactionSuccessful",
    subject: "Transaction Successful - GHS 250.00",
    html: renderIsmartEmail({
      title: "Transaction Successful",
      documentTitle: "Transaction Successful",
      preheader: "Payment of GHS 250.00 received",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Your payment of <strong>GHS 250.00</strong> has been processed successfully.</p>
        <p>Transaction Ref: <strong>TXN-20260628-A12B34</strong><br/>
           Order: <strong>#202606280012</strong></p>
        <p style="text-align:center;"><a class="btn" href="${Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com"}/receipt?order=202606280012">View Receipt</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "paymentFailed",
    subject: "Payment Unsuccessful",
    html: renderIsmartEmail({
      title: "Payment Unsuccessful",
      titleColor: "#c0392b",
      documentTitle: "Payment Failed",
      preheader: "We couldn't process your last payment attempt",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Unfortunately, we were unable to process your payment of <strong>GHS 120.00</strong>.</p>
        <p>Reason: <strong>Insufficient funds</strong></p>
        <p>Please try again or use a different payment method.</p>
        <p style="text-align:center;"><a class="btn" href="${Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com"}">Try Again</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "payoutSuccessful",
    subject: "Payout Successful - GHS 1,500.00",
    html: renderIsmartEmail({
      title: "Payout Successful",
      documentTitle: "Payout Successful",
      preheader: "GHS 1,500.00 sent to your bank",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Your payout of <strong>GHS 1,500.00</strong> has been sent to your linked bank account ending in <strong>****4521</strong>.</p>
        <p>Reference: <strong>PAY-20260628-99ZX</strong></p>
        <p>Funds typically arrive within 1 business day.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "payoutAttemptUnsuccessful",
    subject: "Payout Attempt Unsuccessful",
    html: renderIsmartEmail({
      title: "Payout Attempt Unsuccessful",
      titleColor: "#c0392b",
      documentTitle: "Payout Failed",
      preheader: "We couldn't complete your payout",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Your payout attempt of <strong>GHS 1,500.00</strong> was unsuccessful.</p>
        <p>Reason: <strong>Bank account verification failed</strong></p>
        <p>Please update your payout details and try again.</p>
        <p style="text-align:center;"><a class="btn" href="${Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com"}/settings">Update Details</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "verifyEmail",
    subject: "Verify Your Email",
    html: renderIsmartEmail({
      title: "Verify Your Email",
      documentTitle: "Email Verification",
      preheader: "Your iSmartPay verification code is 482910",
      bodyHtml: `
        <h2>Hello,</h2>
        <p>Use the verification code below to confirm your email address on iSmartPay.</p>
        <div class="code-box">482910</div>
        <p style="color:#666;font-size:13px;">This code expires in 10 minutes. If you didn't request this, please ignore this message.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "verifyPassword",
    subject: "Confirm Your Password Change",
    html: renderIsmartEmail({
      title: "Verify Password Change",
      documentTitle: "Verify Password",
      preheader: "Use code 736201 to confirm your password change",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>We received a request to change your iSmartPay password. Use the code below to confirm.</p>
        <div class="code-box">736201</div>
        <p style="color:#666;font-size:13px;">This code expires in 10 minutes. If you didn't request this, please secure your account immediately.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "resetPassword",
    subject: "Reset Your Password",
    html: renderIsmartEmail({
      title: "Reset Your Password",
      documentTitle: "Reset Password",
      preheader: "Click below to reset your iSmartPay password",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>We received a request to reset your iSmartPay password. Click the button below to choose a new one.</p>
        <p style="text-align:center;"><a class="btn" href="${Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com"}/reset-password?token=sample-token">Reset Password</a></p>
        <p style="color:#666;font-size:13px;">This link expires in 30 minutes. If you didn't request this, please ignore this email.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "twoFactorAuth",
    subject: "Your Two-Factor Authentication Code",
    html: renderIsmartEmail({
      title: "Two-Factor Authentication",
      documentTitle: "2FA Code",
      preheader: "Your iSmartPay 2FA code is 905423",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Use the code below to complete your sign-in to iSmartPay.</p>
        <div class="code-box">905423</div>
        <p style="color:#666;font-size:13px;">This code expires in 5 minutes. If you didn't request this, please secure your account.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "invoice",
    subject: "Invoice INV-2026-0042 - Payment Required",
    html: renderIsmartEmail({
      title: "New Invoice",
      documentTitle: "Invoice INV-2026-0042",
      preheader: "Invoice INV-2026-0042 - GHS 850.00 due July 15, 2026",
      bodyHtml: `
        <h2>Dear Edem,</h2>
        <p>Please find your invoice details below:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr>
            <td style="padding:10px;border:1px solid #eee;"><strong>Invoice Number</strong></td>
            <td style="padding:10px;border:1px solid #eee;">INV-2026-0042</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #eee;"><strong>Amount Due</strong></td>
            <td style="padding:10px;border:1px solid #eee;">GHS 850.00</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #eee;"><strong>Due Date</strong></td>
            <td style="padding:10px;border:1px solid #eee;">July 15, 2026</td>
          </tr>
        </table>
        <p style="text-align:center;"><a class="btn" href="${Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com"}/invoice?token=sample">View & Pay Invoice</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "giftCard",
    subject: "🎁 You've received a GHS 100.00 Gift Card!",
    html: renderIsmartEmail({
      title: "You've Received a Gift Card 🎁",
      documentTitle: "GHS 100.00 Gift Card",
      preheader: "A friend sent you a GHS 100.00 gift card",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>You've received a gift card from <strong>iSmartPay Demo Store</strong>!</p>
        <div style="background:linear-gradient(135deg,#011272 0%,#7cb342 100%);border-radius:16px;padding:28px;margin:18px 0;text-align:center;color:white;">
          <div style="font-size:14px;opacity:0.9;">Gift Card Value</div>
          <div style="font-size:34px;font-weight:bold;margin:8px 0;">GHS 100.00</div>
          <div style="margin-top:12px;font-size:16px;letter-spacing:3px;">A1B2-C3D4-E5F6-G7H8</div>
        </div>
        <p style="text-align:center;"><a class="btn" href="${Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com"}/gift-card?code=A1B2-C3D4-E5F6-G7H8">Redeem Gift Card</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "staffInvitation",
    subject: "You're invited to join iSmartPay Demo Store",
    html: renderIsmartEmail({
      title: "You're Invited",
      documentTitle: "Staff Invitation",
      preheader: "iSmartPay Demo Store invited you to join their team",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>You've been invited to join <strong>iSmartPay Demo Store</strong> as <strong>Cashier</strong>.</p>
        <p>Click the button below to accept the invite, set your password, and create your 4-digit staff PIN.</p>
        <p style="text-align:center;"><a class="btn" href="${Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com"}/staff/accept?token=sample">Accept Invitation</a></p>
        <p style="color:#999;font-size:12px;">This invitation link will expire in 7 days.</p>
        <p>Welcome aboard,<br/><strong>iSmartPay Demo Store Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "orderConfirmation",
    subject: "Order #202606280012 Confirmed",
    html: renderIsmartEmail({
      title: "Transaction Successful",
      documentTitle: "Order Confirmation",
      preheader: "Your order #202606280012 has been confirmed",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Thanks for your order <strong>#202606280012</strong> for <strong>GHS 250.00</strong>.</p>
        <p>You can track your order status anytime:</p>
        <p style="text-align:center;"><a class="btn" href="https://app.getdowo.com/order-tracking?phone=0244000000">Track Order</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "deliveryUpdate",
    subject: "Delivery update for Order #202606280012",
    html: renderIsmartEmail({
      title: "Delivery Update",
      documentTitle: "Delivery Update",
      preheader: "Order #202606280012: Out for delivery",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Your delivery for order <strong>#202606280012</strong> is now <strong>Out for delivery</strong>.</p>
        <p>Your rider will arrive within 30 minutes.</p>
        <p>Thank you for choosing us,<br/><strong>iSmartPay Delivery</strong></p>
      `,
    }),
  });

  samples.push({
    key: "reservationConfirmed",
    subject: "Reservation confirmed for July 4, 2026 7:30 PM",
    html: renderIsmartEmail({
      title: "Reservation Confirmed",
      documentTitle: "Reservation Confirmed",
      preheader: "Reservation for July 4, 2026 at 7:30 PM",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Your reservation is confirmed for <strong>July 4, 2026 at 7:30 PM</strong> for <strong>4</strong> guest(s).</p>
        <p>We look forward to seeing you.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "refundApproved",
    subject: "Refund Approved for Order #202606280012",
    html: renderIsmartEmail({
      title: "Refund Approved",
      documentTitle: "Refund Approved",
      preheader: "Refund approved for order #202606280012",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Your refund request for order <strong>#202606280012</strong> has been <strong>approved</strong>.</p>
        <p><strong>Note from our team:</strong> Refund of GHS 250.00 will arrive in 3-5 business days.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "supportTicketUpdate",
    subject: "New reply on your ticket: Payment not received",
    html: renderIsmartEmail({
      title: "Support Ticket Update",
      documentTitle: "Support Update",
      preheader: 'Update on "Payment not received"',
      bodyHtml: `
        <h2>Hello,</h2>
        <p>Your support ticket <strong>"Payment not received"</strong> has been updated.</p>
        <p>New status: <strong>In Progress</strong></p>
        <blockquote style="border-left:4px solid #7cb342;padding-left:12px;color:#555;margin:12px 0;">
          Hi Edem, we're investigating the missing payment with our processor and will update you shortly.
        </blockquote>
        <p>You can view and reply in your dashboard.</p>
        <p>Thank you,<br/><strong>iSmartPay Support</strong></p>
      `,
    }),
  });

  samples.push({
    key: "invoiceReminder",
    subject: "Reminder: Invoice INV-2026-0042",
    html: renderIsmartEmail({
      title: "Invoice Reminder",
      documentTitle: "Invoice Reminder",
      preheader: "Invoice INV-2026-0042 due July 15, 2026",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>This is a friendly reminder for invoice <strong>INV-2026-0042</strong> due on <strong>July 15, 2026</strong>.</p>
        <p>Amount due: <strong>GHS 850.00</strong></p>
        <p>Please settle at your earliest convenience.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "lowStockAlert",
    subject: "Low Stock Alert: 2 item(s)",
    html: renderIsmartEmail({
      title: "Low Stock Alert",
      titleColor: "#c0392b",
      documentTitle: "Low Stock Alert",
      preheader: "2 products running low",
      bodyHtml: `
        <h2>Hello,</h2>
        <p><strong>iSmartPay Demo Store</strong> has <strong>2</strong> product(s) at or below their low-stock threshold.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#f4f4f5;">
            <th style="padding:8px;border:1px solid #eee;text-align:left;">Product</th>
            <th style="padding:8px;border:1px solid #eee;text-align:right;">In Stock</th>
            <th style="padding:8px;border:1px solid #eee;text-align:right;">Threshold</th>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #eee;">Coca Cola 500ml</td>
            <td style="padding:8px;border:1px solid #eee;text-align:right;">3</td>
            <td style="padding:8px;border:1px solid #eee;text-align:right;">10</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #eee;">Bread Loaf</td>
            <td style="padding:8px;border:1px solid #eee;text-align:right;">1</td>
            <td style="padding:8px;border:1px solid #eee;text-align:right;">5</td>
          </tr>
        </table>
        <p>Please replenish stock soon to avoid lost sales.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  samples.push({
    key: "paymentReceipt",
    subject: "Receipt for Order #202606280012",
    html: renderIsmartEmail({
      title: "Transaction Successful",
      documentTitle: "Receipt",
      preheader: "Receipt for order #202606280012 - GHS 250.00",
      bodyHtml: `
        <h2>Hi Edem,</h2>
        <p>Thank you for your payment of <strong>GHS 250.00</strong>.</p>
        <p>Order: <strong>#202606280012</strong><br/>
           Transaction: <strong>TXN-20260628-A12B34</strong></p>
        <p style="text-align:center;"><a class="btn" href="${Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com"}/receipt?order=202606280012">View Receipt</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    }),
  });

  return samples;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recipient } = await req.json();
    if (!recipient) throw new Error("recipient is required");

    const samples = buildSamples();
    const results: any[] = [];

    for (const s of samples) {
      const r = await sendIMailMessage({
        channel: "email",
        recipient,
        message: s.html,
        subject: `[Sample] ${s.subject}`,
        notification_type: "notification",
        message_form: "html",
      });
      results.push({ key: s.key, ok: r.ok, status: r.status });
      // small pacing to avoid hammering iMail
      await new Promise((res) => setTimeout(res, 300));
    }

    const failed = results.filter((r) => !r.ok);
    return new Response(
      JSON.stringify({
        success: failed.length === 0,
        sent: results.length - failed.length,
        failed: failed.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("send-sample-emails error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

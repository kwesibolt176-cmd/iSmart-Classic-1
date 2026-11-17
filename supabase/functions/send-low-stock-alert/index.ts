import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { userId, items } = await req.json();
    if (!userId || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Missing userId or items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();
    const { data: business } = await supabase
      .from("business_profiles")
      .select("business_name")
      .eq("user_id", userId)
      .maybeSingle();

    const email = profile?.email;
    const businessName = business?.business_name || "Your business";

    const rows = items
      .map(
        (i: any) =>
          `<tr>
             <td style="padding:8px;border:1px solid #eee;">${i.name || "Item"}</td>
             <td style="padding:8px;border:1px solid #eee;text-align:right;">${i.stock_quantity ?? i.quantity ?? 0}</td>
             <td style="padding:8px;border:1px solid #eee;text-align:right;">${i.low_stock_threshold ?? "—"}</td>
           </tr>`,
      )
      .join("");

    const html = renderIsmartEmail({
      title: "Low Stock Alert",
      titleColor: "#c0392b",
      documentTitle: "Low Stock Alert",
      preheader: `${items.length} product(s) running low`,
      bodyHtml: `
        <h2>Hello,</h2>
        <p><strong>${businessName}</strong> has <strong>${items.length}</strong> product(s) at or below their low-stock threshold.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#f4f4f5;">
            <th style="padding:8px;border:1px solid #eee;text-align:left;">Product</th>
            <th style="padding:8px;border:1px solid #eee;text-align:right;">In Stock</th>
            <th style="padding:8px;border:1px solid #eee;text-align:right;">Threshold</th>
          </tr>
          ${rows}
        </table>
        <p>Please replenish stock soon to avoid lost sales.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    });

    let emailResult: any = null;
    if (email) {
      const r = await sendIMailMessage({
        channel: "email",
        recipient: email,
        message: html,
        subject: `Low Stock Alert: ${items.length} item(s)`,
        notification_type: "notification",
        message_form: "html",
      });
      emailResult = { ok: r.ok, status: r.status };
    }

    await supabase.from("communication_logs").insert({
      user_id: userId,
      channel: "email",
      recipient: email || "not_configured",
      subject: `Low Stock Alert: ${items.length} item(s)`,
      content: `Alert for: ${items.map((i: any) => i.name).join(", ")}`,
      status: emailResult?.ok ? "sent" : "failed",
      error_message: emailResult?.ok ? null : "No merchant email or iMail failure",
    });

    return new Response(
      JSON.stringify({ success: !!emailResult?.ok, itemCount: items.length, emailResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in send-low-stock-alert:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

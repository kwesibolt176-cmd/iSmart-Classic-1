import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[STUB] Daily sales summary - email service not configured");

    // Get all businesses with daily summary enabled
    const { data: businesses } = await supabase
      .from("business_profiles")
      .select("id, business_name")
      .eq("daily_sales_summary_enabled", true);

    const results = (businesses || []).map(b => ({
      business: b.business_name,
      status: "skipped",
      message: "Email service not configured"
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: "Email service not configured. Summaries not sent."
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-daily-sales-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

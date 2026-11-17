import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ShortenRequest {
  url: string;
  title?: string;
  customCode?: string;
  expiresAt?: string;
}

const generateShortCode = (length: number = 6): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    result += chars.charAt(random[0] % chars.length);
  }
  return result;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    let businessId: string | null = null;

    // Get user if authenticated
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await adminClient.auth.getUser(token);
      if (user) {
        userId = user.id;
        
        // Get business profile
        const { data: profile } = await adminClient
          .from("business_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profile) {
          businessId = profile.id;
        }
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { url, title, customCode, expiresAt }: ShortenRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate URL
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error("Unsupported protocol");
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (customCode && !/^[A-Za-z0-9_-]{4,64}$/.test(customCode)) {
      return new Response(JSON.stringify({ error: "Custom code must be 4-64 URL-safe characters" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate or use custom short code
    let shortCode = customCode || generateShortCode();
    let attempts = 0;
    const maxAttempts = 5;

    // Check for uniqueness and retry if needed
    while (attempts < maxAttempts) {
      const { data: existing } = await adminClient
        .from("short_urls")
        .select("id")
        .eq("short_code", shortCode)
        .maybeSingle();

      if (!existing) break;

      if (customCode) {
        return new Response(
          JSON.stringify({ error: "Custom code is already taken" }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      shortCode = generateShortCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: "Failed to generate unique code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create short URL
    const { data: shortUrl, error } = await adminClient
      .from("short_urls")
      .insert({
        short_code: shortCode,
        original_url: url,
        title: title || null,
        user_id: userId,
        business_id: businessId,
        expires_at: expiresAt || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating short URL:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create short URL" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build the short URL - use the app domain
    const baseUrl = (Deno.env.get("PUBLIC_APP_URL") || "https://dev.classic.ismartghana.com").replace(/\/$/, "");
    const fullShortUrl = `${baseUrl}/s/${shortCode}`;

    return new Response(
      JSON.stringify({
        success: true,
        shortUrl: fullShortUrl,
        shortCode,
        originalUrl: url,
        id: shortUrl.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in shorten-url:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

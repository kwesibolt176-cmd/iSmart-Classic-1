import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderStatusUpdateRequest {
  orderId: string;
  newStatus: string;
  customerEmail?: string;
  customerPhone?: string;
  channel?: 'sms' | 'whatsapp';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { orderId, newStatus }: OrderStatusUpdateRequest = await req.json();

    // Fetch order to get tracking URL
    const { data: order } = await supabaseClient
      .from('orders')
      .select('order_number, customer_phone')
      .eq('id', orderId)
      .single();

    const trackingUrl = `https://app.getdowo.com/order-tracking?phone=${encodeURIComponent(order?.customer_phone || '')}`;

    console.log(`[STUB] Order status update for ${order?.order_number} to ${newStatus} - email/SMS services not configured`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: {
          email: null,
          sms: null
        },
        trackingUrl,
        message: 'Email/SMS services not configured'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);

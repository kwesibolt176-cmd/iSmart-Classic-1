import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, businessUserId, customerPhone, customerEmail, customerName, orderId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "auto-create-or-link") {
      // Auto-create customer if doesn't exist, or link order to existing customer
      if (!customerPhone && !customerEmail) {
        return new Response(
          JSON.stringify({ success: false, message: "No contact info provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for existing customer by phone or email
      let existingCustomer = null;
      
      if (customerPhone) {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("user_id", businessUserId)
          .eq("phone", customerPhone)
          .maybeSingle();
        existingCustomer = data;
      }

      if (!existingCustomer && customerEmail) {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("user_id", businessUserId)
          .eq("email", customerEmail)
          .maybeSingle();
        existingCustomer = data;
      }

      if (existingCustomer) {
        // Update existing customer with any new info
        const updates: Record<string, string> = {};
        if (customerName && !existingCustomer.name) updates.name = customerName;
        if (customerEmail && !existingCustomer.email) updates.email = customerEmail;
        if (customerPhone && !existingCustomer.phone) updates.phone = customerPhone;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("customers")
            .update(updates)
            .eq("id", existingCustomer.id);
        }

        // Link order if provided
        if (orderId) {
          await supabase
            .from("orders")
            .update({ customer_id: existingCustomer.id })
            .eq("id", orderId);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            customerId: existingCustomer.id, 
            action: "linked",
            enriched: Object.keys(updates).length > 0 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new customer
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          user_id: businessUserId,
          name: customerName || `Customer ${customerPhone || customerEmail}`,
          phone: customerPhone || null,
          email: customerEmail || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Link order if provided
      if (orderId && newCustomer) {
        await supabase
          .from("orders")
          .update({ customer_id: newCustomer.id })
          .eq("id", orderId);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          customerId: newCustomer.id, 
          action: "created" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "find-duplicates") {
      // Use AI to find potential duplicate customers
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("user_id", businessUserId);

      if (!customers || customers.length < 2) {
        return new Response(
          JSON.stringify({ duplicates: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        // Fallback to simple matching without AI
        const duplicates = findSimpleDuplicates(customers);
        return new Response(
          JSON.stringify({ duplicates }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const prompt = `Analyze these customer records and identify potential duplicates based on similar names, phone numbers, or emails. Return only high-confidence matches.

Customers:
${JSON.stringify(customers, null, 2)}

Return matches as JSON array.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a data quality assistant. Identify duplicate customer records. Return JSON array of {ids: [id1, id2], reason: string, confidence: number} objects." },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_duplicates",
                description: "Report potential duplicate customer records",
                parameters: {
                  type: "object",
                  properties: {
                    duplicates: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          ids: { type: "array", items: { type: "string" } },
                          reason: { type: "string" },
                          confidence: { type: "number" }
                        },
                        required: ["ids", "reason", "confidence"]
                      }
                    }
                  },
                  required: ["duplicates"]
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "report_duplicates" } }
        }),
      });

      if (!aiResponse.ok) {
        // Fallback to simple matching
        const duplicates = findSimpleDuplicates(customers);
        return new Response(
          JSON.stringify({ duplicates }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let duplicates = [];
      
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          duplicates = parsed.duplicates || [];
        } catch {
          duplicates = findSimpleDuplicates(customers);
        }
      }

      return new Response(
        JSON.stringify({ duplicates }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "merge-customers") {
      const { primaryId, mergeIds } = await req.json();
      
      // Update all orders from merged customers to primary customer
      for (const mergeId of mergeIds) {
        await supabase
          .from("orders")
          .update({ customer_id: primaryId })
          .eq("customer_id", mergeId);

        // Transfer loyalty points
        const { data: mergedLoyalty } = await supabase
          .from("customer_loyalty_points")
          .select("points_balance, lifetime_points")
          .eq("customer_id", mergeId)
          .single();

        if (mergedLoyalty) {
          const { data: primaryLoyalty } = await supabase
            .from("customer_loyalty_points")
            .select("id, points_balance, lifetime_points")
            .eq("customer_id", primaryId)
            .single();

          if (primaryLoyalty) {
            await supabase
              .from("customer_loyalty_points")
              .update({
                points_balance: primaryLoyalty.points_balance + mergedLoyalty.points_balance,
                lifetime_points: primaryLoyalty.lifetime_points + mergedLoyalty.lifetime_points,
              })
              .eq("id", primaryLoyalty.id);
          }

          await supabase
            .from("customer_loyalty_points")
            .delete()
            .eq("customer_id", mergeId);
        }

        // Delete merged customer
        await supabase
          .from("customers")
          .delete()
          .eq("id", mergeId);
      }

      return new Response(
        JSON.stringify({ success: true, merged: mergeIds.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in enhance-customer-profile:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function findSimpleDuplicates(customers: any[]) {
  const duplicates: { ids: string[]; reason: string; confidence: number }[] = [];
  
  for (let i = 0; i < customers.length; i++) {
    for (let j = i + 1; j < customers.length; j++) {
      const a = customers[i];
      const b = customers[j];
      
      // Exact phone match
      if (a.phone && b.phone && a.phone === b.phone) {
        duplicates.push({ ids: [a.id, b.id], reason: "Same phone number", confidence: 0.95 });
        continue;
      }
      
      // Exact email match
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
        duplicates.push({ ids: [a.id, b.id], reason: "Same email address", confidence: 0.95 });
        continue;
      }
      
      // Similar name (Levenshtein distance)
      if (a.name && b.name) {
        const similarity = calculateSimilarity(a.name.toLowerCase(), b.name.toLowerCase());
        if (similarity > 0.85) {
          duplicates.push({ ids: [a.id, b.id], reason: `Similar names (${Math.round(similarity * 100)}% match)`, confidence: similarity });
        }
      }
    }
  }
  
  return duplicates;
}

function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  
  return (longer.length - costs[s2.length]) / longer.length;
}

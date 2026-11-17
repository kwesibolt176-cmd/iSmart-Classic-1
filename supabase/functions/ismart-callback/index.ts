import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// The legacy callback accepted unsigned payloads and could mutate financial
// records. Merchant-core exposes authenticated status resources instead. Keep
// this tombstone during rollout so old senders receive an explicit response.
serve(() => new Response(JSON.stringify({
  error: {
    code: "legacy_callback_retired",
    message: "Use Merchant API transaction status resources",
  },
}), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));

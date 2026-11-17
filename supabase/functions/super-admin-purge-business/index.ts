import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKETS = ["kyc-documents", "business-assets", "product-images", "support-attachments"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Identify the caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Only super admins may purge
    const { data: isSuperAdmin, error: roleError } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    if (roleError || !isSuperAdmin) {
      return json({ error: "Forbidden: super admin role required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const businessId: string | undefined = body.businessId;
    let targetUserId: string | undefined = body.userId;
    let businessName: string | undefined = body.businessName;

    if (!targetUserId && businessId) {
      const { data: biz } = await admin
        .from("business_profiles")
        .select("user_id, business_name")
        .eq("id", businessId)
        .maybeSingle();
      targetUserId = biz?.user_id;
      businessName = businessName ?? biz?.business_name;
    }

    if (!targetUserId) {
      return json({ error: "businessId or userId is required" }, 400);
    }

    if (targetUserId === user.id) {
      return json({ error: "You cannot purge your own account" }, 400);
    }

    // Never purge another super admin
    const { data: targetIsSuperAdmin } = await admin.rpc("has_role", {
      _user_id: targetUserId,
      _role: "super_admin",
    });
    if (targetIsSuperAdmin) {
      return json({ error: "Cannot purge a super admin account" }, 400);
    }

    // 1) Purge every database row belonging to the account
    const { data: purgeResult, error: purgeError } = await admin.rpc("purge_business_data", {
      _user_id: targetUserId,
    });
    if (purgeError) {
      console.error("purge_business_data failed", purgeError);
      return json({ error: "Failed to purge account data", details: purgeError.message }, 500);
    }

    // 2) Purge stored files
    const storageResults: Record<string, number> = {};
    for (const bucket of BUCKETS) {
      try {
        const paths = await listAllPaths(admin, bucket, targetUserId);
        if (paths.length) {
          await admin.storage.from(bucket).remove(paths);
        }
        storageResults[bucket] = paths.length;
      } catch (e) {
        console.error(`storage purge failed for ${bucket}`, e);
        storageResults[bucket] = -1;
      }
    }

    // 3) Delete the auth user itself
    let authDeleted = false;
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteUserError) {
      console.error("auth user delete failed", deleteUserError);
    } else {
      authDeleted = true;
    }

    // 4) Audit trail (kept intentionally)
    await admin.from("audit_logs").insert({
      user_id: user.id,
      action: "purge_business",
      resource_type: "business_profile",
      resource_id: businessId ?? targetUserId,
      resource_name: businessName ?? targetUserId,
      old_values: { user_id: targetUserId, business_name: businessName ?? null },
      new_values: { purged: true, ...(purgeResult as Record<string, unknown>), storage: storageResults, auth_deleted: authDeleted },
    });

    return json({ success: true, purged: purgeResult, storage: storageResults, auth_deleted: authDeleted });
  } catch (error) {
    console.error("super-admin-purge-business error", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

async function listAllPaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const out: string[] = [];
  const stack = [prefix];
  while (stack.length) {
    const dir = stack.pop()!;
    const { data, error } = await admin.storage.from(bucket).list(dir, { limit: 1000 });
    if (error || !data) continue;
    for (const entry of data) {
      const path = `${dir}/${entry.name}`;
      if (entry.id === null && !entry.metadata) {
        stack.push(path);
      } else {
        out.push(path);
      }
    }
  }
  return out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

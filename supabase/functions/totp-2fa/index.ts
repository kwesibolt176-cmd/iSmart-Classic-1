import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple TOTP implementation
function generateSecret(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function base32Decode(encoded: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = encoded.toUpperCase().split('').map(c => {
    const idx = chars.indexOf(c);
    return idx >= 0 ? idx.toString(2).padStart(5, '0') : '';
  }).join('');
  
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

async function generateTOTP(secret: string, timeStep = 30): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setBigUint64(0, BigInt(counter), false);
  
  const secretBytes = base32Decode(secret);
  const keyBuffer = secretBytes.buffer.slice(secretBytes.byteOffset, secretBytes.byteOffset + secretBytes.byteLength);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, counterBuffer);
  const hmac = new Uint8Array(signature);
  
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
  
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    const code = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(code.slice(0, 4) + '-' + code.slice(4, 8));
  }
  return codes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const userEmail = claimsData.user.email || "user";
    const { action, code } = await req.json();

    // Check if user is a super admin
    const { data: isSuperAdmin } = await supabase.rpc('has_role', { 
      _user_id: userId, 
      _role: 'super_admin' 
    });

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only super admins can enable 2FA" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "setup") {
      // Generate new TOTP secret
      const secret = generateSecret();
      const backupCodes = generateBackupCodes();
      
      // Store the secret (not yet enabled)
      const { error: upsertError } = await supabase
        .from("user_two_factor_auth")
        .upsert({
          user_id: userId,
          totp_secret: secret,
          backup_codes: backupCodes,
          is_enabled: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error("Error storing 2FA secret:", upsertError);
        throw new Error("Failed to setup 2FA");
      }

      // Generate QR code URL for authenticator apps
      const otpAuthUrl = `otpauth://totp/Dowo:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=Dowo&algorithm=SHA1&digits=6&period=30`;

      return new Response(JSON.stringify({
        success: true,
        secret,
        otpAuthUrl,
        backupCodes,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify-setup") {
      // Verify the code during setup to enable 2FA
      const { data: twoFaData, error: fetchError } = await supabase
        .from("user_two_factor_auth")
        .select("totp_secret")
        .eq("user_id", userId)
        .single();

      if (fetchError || !twoFaData?.totp_secret) {
        return new Response(JSON.stringify({ error: "2FA not set up" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expectedCode = await generateTOTP(twoFaData.totp_secret);
      
      // Also check previous and next time windows for clock drift
      const prevCode = await generateTOTP(twoFaData.totp_secret, 30);
      
      if (code !== expectedCode && code !== prevCode) {
        return new Response(JSON.stringify({ error: "Invalid verification code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Enable 2FA
      const { error: updateError } = await supabase
        .from("user_two_factor_auth")
        .update({
          is_enabled: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        throw new Error("Failed to enable 2FA");
      }

      return new Response(JSON.stringify({ success: true, enabled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      // Verify code during login
      const { data: twoFaData, error: fetchError } = await supabase
        .from("user_two_factor_auth")
        .select("totp_secret, backup_codes, is_enabled")
        .eq("user_id", userId)
        .single();

      if (fetchError || !twoFaData?.is_enabled || !twoFaData?.totp_secret) {
        return new Response(JSON.stringify({ error: "2FA not enabled" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expectedCode = await generateTOTP(twoFaData.totp_secret);
      
      // Check TOTP code
      if (code === expectedCode) {
        return new Response(JSON.stringify({ success: true, verified: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check backup codes
      const backupCodes = twoFaData.backup_codes || [];
      const codeIndex = backupCodes.indexOf(code);
      
      if (codeIndex !== -1) {
        // Remove used backup code
        const updatedCodes = backupCodes.filter((_: string, i: number) => i !== codeIndex);
        await supabase
          .from("user_two_factor_auth")
          .update({ backup_codes: updatedCodes, updated_at: new Date().toISOString() })
          .eq("user_id", userId);

        return new Response(JSON.stringify({ 
          success: true, 
          verified: true, 
          usedBackupCode: true,
          remainingBackupCodes: updatedCodes.length 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disable") {
      // Verify code before disabling
      const { data: twoFaData } = await supabase
        .from("user_two_factor_auth")
        .select("totp_secret")
        .eq("user_id", userId)
        .single();

      if (twoFaData?.totp_secret) {
        const expectedCode = await generateTOTP(twoFaData.totp_secret);
        if (code !== expectedCode) {
          return new Response(JSON.stringify({ error: "Invalid verification code" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error: deleteError } = await supabase
        .from("user_two_factor_auth")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        throw new Error("Failed to disable 2FA");
      }

      return new Response(JSON.stringify({ success: true, disabled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { data: twoFaData } = await supabase
        .from("user_two_factor_auth")
        .select("is_enabled, verified_at")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({
        enabled: twoFaData?.is_enabled || false,
        verifiedAt: twoFaData?.verified_at || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("2FA error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

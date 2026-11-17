import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationSession {
  id: string;
  target_user_id: string;
  target_user_email: string;
  started_at: string;
}

export const useImpersonation = () => {
  const [activeSession, setActiveSession] = useState<ImpersonationSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: session, error } = await supabase
        .from("impersonation_sessions")
        .select("id, target_user_id, target_user_email, started_at")
        .eq("admin_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error checking impersonation session:", error);
        setLoading(false);
        return;
      }

      setActiveSession(session);
    } catch (error) {
      console.error("Error checking active session:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check for active impersonation session
    const { data: session } = await supabase
      .from("impersonation_sessions")
      .select("target_user_id")
      .eq("admin_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    // Return impersonated user ID if active session exists, otherwise current user
    return session?.target_user_id || user.id;
  };

  const isImpersonating = !!activeSession;
  const impersonatedEmail = activeSession?.target_user_email;
  const impersonatedUserId = activeSession?.target_user_id;

  return {
    activeSession,
    isImpersonating,
    impersonatedEmail,
    impersonatedUserId,
    getEffectiveUserId,
    loading,
    refetch: checkActiveSession,
  };
};

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  MerchantSessionValidationError,
  signOutMerchantPortal,
  validateMerchantPortalSession,
} from "@/lib/merchant-session";

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  industry: string;
  currency: string;
  logo_url?: string | null;
  banner_url?: string | null;
  address?: string | null;
  business_phone?: string | null;
  business_email?: string | null;
  tax_id?: string | null;
  website?: string | null;
  settlement_type?: string | null;
  settlement_provider?: string | null;
  settlement_account?: string | null;
  daily_sales_summary_enabled?: boolean | null;
  plan_tier?: string | null;
  is_suspended?: boolean | null;
  admin_pin?: string | null;
  receipt_width?: string | null;
  merchant_business_id?: string | null;
  ismart_business_id?: string | null;
}

interface FeatureSettings {
  tables_enabled: boolean;
  reservations_enabled: boolean;
  kitchen_enabled: boolean;
  inventory_enabled: boolean;
  staff_enabled: boolean;
  customers_enabled: boolean;
  chat_enabled: boolean;
  reports_enabled: boolean;
  accounting_enabled: boolean;
}

interface ImpersonationState {
  isImpersonating: boolean;
  targetUserId: string | null;
  targetUserEmail: string | null;
  sessionId: string | null;
}

interface BusinessContextType {
  user: User | null;
  profile: BusinessProfile | null;
  features: FeatureSettings | null;
  loading: boolean;
  profileChecked: boolean;
  refreshProfile: () => Promise<void>;
  // Impersonation state
  impersonation: ImpersonationState;
  // The effective user ID to use for data queries (impersonated user or actual user)
  effectiveUserId: string | null;
  // Stop impersonation
  stopImpersonation: () => Promise<void>;
  showBalance: boolean;
  setShowBalance: (show: boolean) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [features, setFeatures] = useState<FeatureSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  const [impersonation, setImpersonation] = useState<ImpersonationState>({
    isImpersonating: false,
    targetUserId: null,
    targetUserEmail: null,
    sessionId: null,
  });
  const [showBalance, setShowBalanceState] = useState(() => {
    const saved = localStorage.getItem("show_wallet_balance");
    // Default to visible; users can hide balances explicitly (persisted).
    return saved !== null ? saved === "true" : true;
  });

  // Prevent double-fetching on mount (StrictMode / fast remounts)
  const hasFetchedRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);

  const setShowBalance = (show: boolean) => {
    setShowBalanceState(show);
    localStorage.setItem("show_wallet_balance", String(show));
  };

  // Check for active impersonation session
  const checkImpersonation = useCallback(async (userId: string) => {
    try {
      const { data: session } = await supabase
        .from("impersonation_sessions")
        .select("id, target_user_id, target_user_email, is_active")
        .eq("admin_user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (session?.is_active) {
        setImpersonation({
          isImpersonating: true,
          targetUserId: session.target_user_id,
          targetUserEmail: session.target_user_email,
          sessionId: session.id,
        });
        return session.target_user_id;
      } else {
        setImpersonation({
          isImpersonating: false,
          targetUserId: null,
          targetUserEmail: null,
          sessionId: null,
        });
        return null;
      }
    } catch (error) {
      console.error("Error checking impersonation:", error);
      return null;
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Check for impersonation first
      const impersonatedUserId = await checkImpersonation(userId);
      const targetUserId = impersonatedUserId || userId;

      const { data: profileData } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if ((profileData?.merchant_business_id || profileData?.ismart_business_id) && !impersonatedUserId && navigator.onLine) {
        try {
          await validateMerchantPortalSession();
        } catch (error) {
          if (error instanceof MerchantSessionValidationError && error.requiresSignIn) {
            await signOutMerchantPortal();
            setProfile(null);
            setFeatures(null);
            return;
          }
          // A transient Merchant API outage must not destroy a valid local session.
          console.warn("Merchant session validation is temporarily unavailable.");
        }
      }

      const { data: featuresData } = await supabase
        .from("feature_settings")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        // Cache profile data for offline use
        localStorage.setItem('cached_business_profile', JSON.stringify(profileData));
      }
      
      if (featuresData) {
        setFeatures(featuresData);
        // Cache features data for offline use
        localStorage.setItem('cached_feature_settings', JSON.stringify(featuresData));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      
      // If offline, try to load from cache
      if (!navigator.onLine) {
        console.log("Offline: Attempting to load cached profile data");
        try {
          const cachedProfile = localStorage.getItem('cached_business_profile');
          const cachedFeatures = localStorage.getItem('cached_feature_settings');
          
          if (cachedProfile) {
            setProfile(JSON.parse(cachedProfile));
          }
          if (cachedFeatures) {
            setFeatures(JSON.parse(cachedFeatures));
          }
        } catch (cacheError) {
          console.error("Error loading cached data:", cacheError);
        }
      }
    } finally {
      setProfileChecked(true);
    }
  }, [checkImpersonation]);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const stopImpersonation = useCallback(async () => {
    if (!user || !impersonation.sessionId) return;

    try {
      // End the impersonation session
      await supabase
        .from("impersonation_sessions")
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq("id", impersonation.sessionId);

      // Log to audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "impersonation_end",
        entity_type: "user",
        entity_id: impersonation.targetUserId,
        metadata: {
          target_email: impersonation.targetUserEmail,
        },
      });

      // Reset impersonation state
      setImpersonation({
        isImpersonating: false,
        targetUserId: null,
        targetUserEmail: null,
        sessionId: null,
      });

      // Refetch profile with the admin's own data
      await fetchProfile(user.id);
    } catch (error) {
      console.error("Error stopping impersonation:", error);
    }
  }, [user, impersonation, fetchProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only act on meaningful auth events. supabase-js re-emits SIGNED_IN (and
        // sometimes TOKEN_REFRESHED) every time the tab becomes visible again; treating
        // that as a new sign-in reset profileChecked, unmounted the app behind the full
        // loading screen and lost in-progress work (QA BUG-01 / BUG-10).
        const sameUser = Boolean(session?.user && session.user.id === loadedUserIdRef.current);
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || (event === 'SIGNED_IN' && sameUser)) {
          // Keep the existing user object for the same account so dependants do not re-run.
          if (session?.user) {
            setUser((prev) => (prev?.id === session.user.id ? prev : session.user));
          }
          return;
        }

        setUser(session?.user ?? null);

        if (session?.user && event === 'USER_UPDATED' && sameUser) {
          // Refresh quietly; the app stays mounted.
          setTimeout(() => { void fetchProfile(session.user.id); }, 0);
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          // A real sign-in (or a different account): reset and load the profile.
          loadedUserIdRef.current = session.user.id;
          setProfileChecked(false);
          hasFetchedRef.current = true;
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(() => {
            fetchProfile(session.user.id).finally(() => setLoading(false));
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          hasFetchedRef.current = false;
          loadedUserIdRef.current = null;
          setProfile(null);
          setFeatures(null);
          setProfileChecked(true);
          setShowBalance(false);
          localStorage.removeItem("show_wallet_balance");
          setImpersonation({
            isImpersonating: false,
            targetUserId: null,
            targetUserEmail: null,
            sessionId: null,
          });
          setLoading(false);
        }
      }
    );

    // THEN check for existing session — this is the initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (hasFetchedRef.current) return; // already handled by onAuthStateChange
      setUser(session?.user ?? null);
      if (session?.user) {
        hasFetchedRef.current = true;
        loadedUserIdRef.current = session.user.id;
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setProfileChecked(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // The effective user ID for data queries
  const effectiveUserId = impersonation.isImpersonating && impersonation.targetUserId 
    ? impersonation.targetUserId 
    : user?.id || null;

  return (
    <BusinessContext.Provider value={{ 
      user, 
      profile, 
      features, 
      loading, 
      profileChecked, 
      refreshProfile,
      impersonation,
      effectiveUserId,
      stopImpersonation,
      showBalance,
      setShowBalance,
    }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};

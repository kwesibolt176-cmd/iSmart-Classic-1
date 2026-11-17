import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { persistISmartBusinessId } from "@/lib/ismart-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ShieldAlert, Mail, KeyRound, User, Phone, Building2, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { useDomainContext } from "@/hooks/use-domain-context";
import { formatPhoneNumber } from "@/lib/utils";
import { friendlyAuthError, messageFromAuthPayload } from "@/lib/auth-errors";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BUSINESS_CATEGORIES,
  BUSINESS_TYPES,
  getIndustriesForCategory,
  type BusinessTypeValue,
} from "@/lib/business-taxonomy";
import ismartPayLogo from "@/assets/ismartpay-logo.png";
import { clearMerchantClientState, signOutMerchantPortal } from "@/lib/merchant-session";

type PortalAuthResult = {
  success?: boolean;
  tokenHash?: string;
  email?: string;
  two_factor_required?: boolean;
  preauth_token?: string;
  principal?: { businessId?: string };
};

type InvokeErrorLike = {
  message?: string;
  context?: { json?: () => Promise<unknown>; text?: () => Promise<string> };
};

type AuthFlowError = Error & { kind?: "login" | "register" };
const asMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const GOOGLE_AUTH_ENABLED = false;

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessTypeValue | "">("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessIndustry, setBusinessIndustry] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [phoneLoginOpen, setPhoneLoginOpen] = useState(false);
  const [phoneLoginCodeSent, setPhoneLoginCodeSent] = useState(false);
  const [phoneLoginNumber, setPhoneLoginNumber] = useState("");
  const [phoneLoginCode, setPhoneLoginCode] = useState("");

  // Password reset states — 3-step flow
  const [resetStep, setResetStep] = useState<"idle" | "email" | "otp" | "newPassword">("idle");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetUserId, setResetUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Legacy aliases for backward compat
  const showResetForm = resetStep !== "idle";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const isValidPhone = phoneNumber.trim() === "" || !!formatPhoneNumber(phoneNumber.trim(), 'international');

  // Password strength checks (shared rules, evaluated per field)
  const buildPasswordChecks = (value: string) => [
    { label: "At least 8 characters", met: value.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(value) },
    { label: "One lowercase letter", met: /[a-z]/.test(value) },
    { label: "One number", met: /\d/.test(value) },
    { label: "One special character (!@#$%...)", met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value) },
  ];
  const passwordChecks = buildPasswordChecks(password);
  const newPasswordChecks = buildPasswordChecks(newPassword);

  const domainContext = useDomainContext();
  const adminHome = typeof window !== "undefined" && window.location.hostname.startsWith("control.")
    ? "/"
    : "/super-admin";
  const postAuthPath = domainContext === "admin" ? adminHome : "/";

  const referralCode = searchParams.get("ref");
  const isTrialSignup = referralCode === "free-trial";

  // Check if user has super_admin role
  const checkSuperAdminRole = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: userId, _role: 'super_admin' });

      if (error) {
        console.error('Error checking super_admin role:', error);
        return false;
      }
      return data || false;
    } catch (err) {
      console.error('Exception checking super_admin role:', err);
      return false;
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (domainContext === "admin") {
          setCheckingRole(true);
          const hasSuperAdmin = await checkSuperAdminRole(session.user.id);
          setCheckingRole(false);

          if (hasSuperAdmin) {
            navigate(postAuthPath);
          } else {
            setAccessDenied(true);
          }
        } else {
          navigate(postAuthPath);
        }
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        if (domainContext === "admin") {
          setCheckingRole(true);
          const hasSuperAdmin = await checkSuperAdminRole(session.user.id);
          setCheckingRole(false);

          if (hasSuperAdmin) {
            navigate(postAuthPath);
          } else {
            setAccessDenied(true);
          }
        } else {
          navigate(postAuthPath);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, domainContext, postAuthPath]);

  const handleSignOut = async () => {
    await signOutMerchantPortal();
    setAccessDenied(false);
  };

  useEffect(() => {
    if (isTrialSignup) {
      setIsSignUp(true);
    }
  }, [isTrialSignup]);

  const createTrialSubscription = async (userId: string) => {
    try {
      const { data: trialPlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", "Free Trial")
        .eq("is_active", true)
        .single();

      if (!trialPlan) {
        console.error("Free trial plan not found");
        return;
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await supabase.from("user_subscriptions").insert({
        user_id: userId,
        plan_id: trialPlan.id,
        status: "active",
        billing_cycle: "monthly",
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        is_trial: true,
        referral_code: referralCode,
      });

      await supabase.from("referral_signups").insert({
        user_id: userId,
        referral_code: referralCode || "free-trial",
        source_url: window.location.href,
      });

      toast({
        title: "Free Trial Activated!",
        description: "You have 30 days of full access. Enjoy!",
      });
    } catch (error) {
      console.error("Error creating trial subscription:", error);
    }
  };

  // Extract a clean error message from a Supabase functions.invoke response
  const extractInvokeError = async (error: unknown, data: unknown, fallback: string): Promise<string> => {
    const invokeError = error as InvokeErrorLike | null;
    // Prefer the JSON body returned by the edge function (even on non-2xx)
    const dataMessage = messageFromAuthPayload(data);
    if (dataMessage) return dataMessage;

    // Try to read the response body from the FunctionsHttpError
    if (invokeError?.context?.json) {
      try {
        const body = await invokeError.context.json();
        const bodyMessage = messageFromAuthPayload(body);
        if (bodyMessage) return bodyMessage;
      } catch {/* ignore */}
    }
    if (invokeError?.context?.text) {
      try {
        const text = await invokeError.context.text();
        const parsed = JSON.parse(text);
        const parsedMessage = messageFromAuthPayload(parsed);
        if (parsedMessage) return parsedMessage;
      } catch {/* ignore */}
    }

    return invokeError?.message || fallback;
  };

  const completePortalSession = async (result: { tokenHash?: string; email?: string }) => {
    if (!result.tokenHash || !result.email) throw new Error("Merchant login did not return a portal session");
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: result.tokenHash,
      type: "magiclink",
    });
    if (error || !data.session) throw new Error(error?.message || "Could not establish the portal session");
    return data.user;
  };

  const finishMerchantLogin = async (result: PortalAuthResult) => {
    const supabaseUser = await completePortalSession(result);
    if (result?.principal?.businessId) {
      localStorage.setItem("ismart_business_id", result.principal.businessId);
      await persistISmartBusinessId(supabaseUser.id, result.principal.businessId);
    }
    toast({ title: "Welcome back!", description: "You are signed in." });
    navigate(postAuthPath);
  };

  useEffect(() => {
    if (!GOOGLE_AUTH_ENABLED) return;
    const googleCode = searchParams.get("code");
    if (searchParams.get("auth_provider") !== "google" || !googleCode) return;
    const exchangeKey = `google-exchange:${googleCode}`;
    if (sessionStorage.getItem(exchangeKey)) return;
    sessionStorage.setItem(exchangeKey, "pending");
    setIsLoading(true);
    supabase.functions.invoke("merchant-auth", {
      body: { action: "google-exchange", googleCode },
    }).then(async ({ data, error }) => {
      if (error || !data?.success) throw new Error(await extractInvokeError(error, data, "Google sign-in failed"));
      sessionStorage.setItem(exchangeKey, "complete");
      await finishMerchantLogin(data);
    }).catch((error) => {
      sessionStorage.removeItem(exchangeKey);
      const display = friendlyAuthError(error instanceof Error ? error.message : "Google sign-in failed", "login");
      toast({ title: display.title, description: display.message, variant: "destructive" });
    }).finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const startGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const returnTo = `${window.location.origin}/auth?auth_provider=google`;
      const { data, error } = await supabase.functions.invoke("merchant-auth", {
        body: { action: "google-start", returnTo },
      });
      if (error || !data?.url) throw new Error(await extractInvokeError(error, data, "Google sign-in is unavailable"));
      window.location.assign(data.url);
    } catch (error) {
      const display = friendlyAuthError(error instanceof Error ? error.message : "Google sign-in failed", "login");
      toast({ title: display.title, description: display.message, variant: "destructive" });
      setIsLoading(false);
    }
  };

  const requestPhoneLogin = async () => {
    const phone = formatPhoneNumber(phoneLoginNumber, "international");
    if (!phone) {
      toast({ title: "Invalid phone number", description: "Enter a valid phone number.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("merchant-auth", {
        body: { action: "request-phone-login", phone },
      });
      if (error) throw new Error(await extractInvokeError(error, data, "Could not send the login code"));
      setPhoneLoginCodeSent(true);
      toast({ title: "Code sent", description: "Check your phone for the 6-digit login code." });
    } catch (error) {
      const display = friendlyAuthError(error instanceof Error ? error.message : "Phone login failed", "login");
      toast({ title: display.title, description: display.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneLogin = async () => {
    const phone = formatPhoneNumber(phoneLoginNumber, "international");
    if (!phone || !/^\d{6}$/.test(phoneLoginCode)) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("merchant-auth", {
        body: { action: "verify-phone-login", phone, code: phoneLoginCode },
      });
      if (error || !data?.success) throw new Error(await extractInvokeError(error, data, "Phone login failed"));
      await finishMerchantLogin(data);
    } catch (error) {
      const display = friendlyAuthError(error instanceof Error ? error.message : "Phone login failed", "login");
      toast({ title: display.title, description: display.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Merchant API authentication is performed server-side; upstream credentials
  // and tokens are never stored in browser storage.
  const ismartLogin = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.functions.invoke("merchant-auth", {
      body: { action: "login", email: normalizedEmail, password },
    });

    if (error) {
      const msg = await extractInvokeError(error, data, "Login failed on iSmart API");
      const err = new Error(msg) as AuthFlowError;
      err.kind = "login";
      throw err;
    }
    if (data?.two_factor_required && data?.preauth_token) return data;
    if (!data?.success) throw Object.assign(new Error("The sign-in service returned an incomplete response."), { kind: "login" });

    return data;
  };

  const verifyTwoFactor = async () => {
    if (!/^\d{6}$/.test(twoFactorCode)) {
      toast({ title: "Invalid code", description: "Enter the 6-digit authenticator code.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("merchant-auth", {
        body: { action: "verify-2fa", preauthToken: twoFactorToken, code: twoFactorCode },
      });
      if (error || !data?.success) throw new Error(await extractInvokeError(error, data, "Two-factor verification failed"));
      const supabaseUser = await completePortalSession(data);
      if (data?.principal?.businessId) {
        localStorage.setItem("ismart_business_id", data.principal.businessId);
        await persistISmartBusinessId(supabaseUser.id, data.principal.businessId);
      }
      setTwoFactorToken("");
      setTwoFactorCode("");
      toast({ title: "Welcome back!", description: "You are signed in." });
      navigate(postAuthPath);
    } catch (error) {
      const result = friendlyAuthError(error instanceof Error ? error.message : "Two-factor verification failed", "login");
      toast({ title: result.title, description: result.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a business account on iSmart for merchant registrations.
  const ismartRegister = async (params: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    business_name?: string;
    business_type?: BusinessTypeValue;
    category?: string;
    industry?: string;
    country?: string;
  }) => {
    const { data, error } = await supabase.functions.invoke("merchant-auth", {
      body: {
        action: "register",
        email: params.email,
        phone: params.phone_number,
        password: params.password,
        fullName: `${params.first_name} ${params.last_name}`.trim(),
        business: params.business_name ? {
          businessName: params.business_name,
          businessType: params.business_type,
          category: params.category,
          industry: params.industry,
          country: params.country || "Ghana",
          tradingName: params.business_name,
        } : undefined,
      },
    });

    if (error || !data?.success) {
      const msg = await extractInvokeError(error, data, "Registration failed on iSmart API");
      const err = new Error(msg) as AuthFlowError;
      err.kind = "register";
      throw err;
    }

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (!normalizedEmail) {
        toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (isSignUp) {
        if (domainContext === "admin") {
          toast({
            title: "Sign up not allowed",
            description: "Super admin accounts cannot be created through sign up.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Validate required fields
        if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim() || !businessName.trim()) {
          toast({
            title: "Missing fields",
            description: "Please fill in all required fields.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (!businessType || !businessCategory || !businessIndustry) {
          toast({
            title: "Business details required",
            description: "Please select your business type, category and industry.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Validate password
        if (!passwordChecks.every(c => c.met)) {
          toast({
            title: "Weak password",
            description: "Password must be at least 8 characters with uppercase, lowercase, number, and special character.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Format and validate phone
        const formattedPhone = formatPhoneNumber(phoneNumber.trim(), 'international');
        if (!formattedPhone || formattedPhone.length !== 12) {
          toast({
            title: "Invalid phone number",
            description: "Please enter a valid phone number.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Step 1: Register on iSmart API
        const registerResult = await ismartRegister({
          email: normalizedEmail,
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: formattedPhone,
          business_name: businessName.trim(),
          business_type: businessType as BusinessTypeValue, // checked non-empty above
          category: businessCategory,
          industry: businessIndustry,
          country: "Ghana",
        });

        const supabaseUser = await completePortalSession(registerResult);
        const registeredBusinessId = registerResult?.principal?.businessId;
        if (registeredBusinessId) {
          localStorage.setItem("ismart_business_id", registeredBusinessId);
          await persistISmartBusinessId(supabaseUser.id, registeredBusinessId);
        }

        if (isTrialSignup && supabaseUser?.id) {
          await createTrialSubscription(supabaseUser.id);
        }

        toast({
          title: "Account created!",
          description: isTrialSignup
            ? "Your 30-day free trial is ready. Please check your email to verify your account."
            : "Your account has been registered on iSmartPay. Please check your email to verify.",
        });
      } else {
        clearMerchantClientState();
        const ismartResult = await ismartLogin(normalizedEmail, password);
        if (ismartResult?.two_factor_required) {
          setTwoFactorToken(ismartResult.preauth_token);
          setTwoFactorCode("");
          toast({ title: "Verification required", description: "Enter the code from your authenticator app." });
          return;
        }
        const supabaseUser = await completePortalSession(ismartResult);
        if (ismartResult?.principal?.businessId) {
          localStorage.setItem("ismart_business_id", ismartResult.principal.businessId);
          await persistISmartBusinessId(supabaseUser.id, ismartResult.principal.businessId);
        }

        toast({
          title: "Welcome back!",
          description: "You are signed in.",
        });

        navigate(postAuthPath);
      }
    } catch (error: unknown) {
      let errorMessage = asMessage(error, "An unexpected error occurred");
      const kind = (error as AuthFlowError)?.kind;

      // Try to unwrap stringified JSON
      try {
        const parsed = JSON.parse(errorMessage);
        errorMessage = messageFromAuthPayload(parsed) || errorMessage;
      } catch {/* not JSON */}
      const display = friendlyAuthError(errorMessage, kind === "register" ? "register" : "login");

      toast({
        title: display.title,
        description: display.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 — Request OTP (keeps original API)
  const handleRequestOTP = async () => {
    if (!resetEmail.trim()) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("merchant-auth", {
        body: { action: "request-password-reset", email: resetEmail.trim().toLowerCase() },
      });
      if (error) throw new Error(await extractInvokeError(error, data, "Failed to send OTP"));

      toast({ title: "OTP Sent", description: "Check your email for the 6-digit code." });
      setResetStep("otp");
    } catch (err: unknown) {
      const display = friendlyAuthError(asMessage(err, "Could not send the code"), "reset");
      toast({ title: display.title, description: display.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 — Confirm OTP
  const handleConfirmOTP = async () => {
    if (resetOtp.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit code.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("merchant-auth", {
        body: { action: "confirm-password-reset", code: resetOtp, email: resetEmail.trim().toLowerCase() },
      });
      if (error || !data?.reset_token) throw new Error(await extractInvokeError(error, data, "Invalid or expired OTP"));
      setResetUserId(data.reset_token);
      sessionStorage.setItem("passwordResetToken", data.reset_token);
      toast({ title: "OTP Verified", description: "Now set your new password." });
      setResetStep("newPassword");
    } catch (err: unknown) {
      const display = friendlyAuthError(asMessage(err, "Could not verify the code"), "reset");
      toast({ title: display.title, description: display.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3 — Reset Password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: "Password mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (!newPasswordChecks.every(c => c.met)) {
      toast({ title: "Weak password", description: "Password does not meet requirements.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const resetToken = resetUserId || sessionStorage.getItem("passwordResetToken") || "";
      if (!resetToken) {
        throw new Error("Reset session expired. Please request a new code.");
      }
      const { data, error } = await supabase.functions.invoke("merchant-auth", {
        body: {
          action: "reset-password",
          resetToken,
          newPassword,
        },
      });
      if (error) throw new Error(await extractInvokeError(error, data, "Failed to reset password"));

      sessionStorage.removeItem("passwordResetToken");
      setResetSuccess(true);
      toast({ title: "Password Reset!", description: "Your password has been updated. Please sign in." });
      setTimeout(() => {
        setResetStep("idle");
        setResetSuccess(false);
        setResetEmail(""); setResetOtp(""); setResetUserId("");
        setNewPassword(""); setConfirmPassword("");
      }, 2000);
    } catch (err: unknown) {
      const display = friendlyAuthError(asMessage(err, "Could not reset the password"), "reset");
      toast({ title: display.title, description: display.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelReset = () => {
    setResetStep("idle");
    setResetSuccess(false);
    setResetEmail(""); setResetOtp(""); setResetUserId("");
    setNewPassword(""); setConfirmPassword("");
    sessionStorage.removeItem("passwordResetToken");
  };


  if (domainContext === "admin" && accessDenied) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#f0f4f8] p-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 shadow-sm p-8 rounded-lg">
            <div className="text-center">
              <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6">
                You do not have super admin privileges to access this platform.
              </p>
              <Button onClick={handleSignOut} variant="outline" className="w-full h-12 rounded-lg">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking role
  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#1B2B65]" />
          <p className="text-sm text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#f0f4f8] p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 shadow-sm p-6 sm:p-8 rounded-lg">
          {/* Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <img src={ismartPayLogo} alt="iSmartPay" className="h-10 sm:h-12" />
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-6 sm:mb-8">
            {twoFactorToken ? "Two-Factor Verification"
              : resetStep === "email" ? "Forgot Password"
              : resetStep === "otp" ? "Verify Your Identity"
              : resetStep === "newPassword" ? "Reset Password"
              : domainContext === "admin"
                ? "Super Admin Portal"
                : isSignUp
                  ? "Create New Account"
                  : "Sign In to Your Account"}
          </h1>

          {twoFactorToken && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Enter the 6-digit code from your authenticator app to finish signing in.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={twoFactorCode}
                maxLength={6}
                onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                className="h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600"
              />
              <Button onClick={verifyTwoFactor} className="w-full h-12" disabled={isLoading || twoFactorCode.length !== 6}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify and Sign In"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setTwoFactorToken(""); setTwoFactorCode(""); }}
                disabled={isLoading}
              >
                Back to Sign In
              </Button>
            </div>
          )}

          {/* ── Password Reset Flow (3 steps) ── */}
          {!twoFactorToken && showResetForm && (
            <div className="space-y-4">

              {/* Step 1 — Email */}
              {resetStep === "email" && (
                <>
                  <p className="text-sm text-gray-600 text-center">Enter your email and we'll send you a 6-digit code.</p>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value.toLowerCase().trim())}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="email"
                      required
                      className="h-12 pl-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 transition-colors"
                    />
                  </div>
                  <Button onClick={handleRequestOTP} className="w-full h-12 rounded-lg text-base font-semibold bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Code"}
                  </Button>
                  <Button variant="ghost" onClick={cancelReset} className="w-full">Back to Sign In</Button>
                </>
              )}

              {/* Step 2 — OTP */}
              {resetStep === "otp" && (
                <>
                  <div className="text-center space-y-1">
                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                      <KeyRound className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600">Enter the 6-digit code sent to <strong>{resetEmail}</strong></p>
                  </div>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={resetOtp}
                    maxLength={6}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoFocus
                    className="h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600"
                  />
                  <Button onClick={handleConfirmOTP} className="w-full h-12 rounded-lg text-base font-semibold bg-blue-600 hover:bg-blue-700" disabled={isLoading || resetOtp.length !== 6}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Code"}
                  </Button>
                  <Button variant="ghost" onClick={() => setResetStep("email")} className="w-full">Back</Button>
                </>
              )}

              {/* Step 3 — New Password */}
              {resetStep === "newPassword" && !resetSuccess && (
                <>
                  <p className="text-sm text-gray-600 text-center">Create a new password for your account.</p>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <KeyRound className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoFocus
                      autoComplete="new-password"
                      className="h-12 pl-12 pr-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600"
                    />
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="space-y-1 px-1">
                      {newPasswordChecks.map((check) => (
                        <div key={check.label} className="flex items-center gap-1.5 text-xs">
                          {check.met ? <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> : <XCircle className="h-3 w-3 text-destructive shrink-0" />}
                          <span className={check.met ? "text-green-600" : "text-muted-foreground"}>{check.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <KeyRound className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="h-12 pl-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600"
                    />
                  </div>
                  <Button onClick={handleResetPassword} className="w-full h-12 rounded-lg text-base font-semibold bg-blue-600 hover:bg-blue-700" disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reset Password"}
                  </Button>
                  <Button variant="ghost" onClick={cancelReset} className="w-full">Cancel</Button>
                </>
              )}

              {/* Success */}
              {resetSuccess && (
                <div className="text-center space-y-3 py-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                  </div>
                  <p className="font-semibold text-gray-900">Password Reset!</p>
                  <p className="text-sm text-gray-600">Redirecting you to sign in...</p>
                </div>
              )}
            </div>
          )}

          {!twoFactorToken && !showResetForm && (<>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Registration fields */}
              {isSignUp && domainContext !== "admin" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="h-12 pl-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="h-12 px-4 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <PhoneInput
                      value={phoneNumber}
                      onChange={(value) => setPhoneNumber(value)}
                      placeholder="Enter phone number"
                      required
                    />
                    {phoneNumber && !isValidPhone && (
                      <p className="text-xs text-destructive mt-1 ml-1">
                        Please enter a valid phone number
                      </p>
                    )}
                    {phoneNumber && isValidPhone && (
                      <p className="text-xs text-green-600 mt-1 ml-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Will be sent as {formatPhoneNumber(phoneNumber.trim(), 'international')}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Business Name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className="h-12 pl-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Business Type</Label>
                    <Select value={businessType} onValueChange={(v) => setBusinessType(v as BusinessTypeValue)}>
                      <SelectTrigger className="h-12 rounded-lg border-gray-200 bg-gray-50">
                        <SelectValue placeholder="Select your registered legal form" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        {BUSINESS_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Category</Label>
                      <Select
                        value={businessCategory}
                        onValueChange={(v) => { setBusinessCategory(v); setBusinessIndustry(""); }}
                      >
                        <SelectTrigger className="h-12 rounded-lg border-gray-200 bg-gray-50">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          {BUSINESS_CATEGORIES.map((c) => (
                            <SelectItem key={c.category} value={c.category}>{c.category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Industry</Label>
                      <Select
                        value={businessIndustry}
                        onValueChange={setBusinessIndustry}
                        disabled={!businessCategory}
                      >
                        <SelectTrigger className="h-12 rounded-lg border-gray-200 bg-gray-50">
                          <SelectValue placeholder={businessCategory ? "Select industry" : "Select category first"} />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          {getIndustriesForCategory(businessCategory).map((i) => (
                            <SelectItem key={i} value={i}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* Email Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  required
                  className="h-12 pl-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 transition-colors"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-12 pr-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 transition-colors"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password strength indicator (sign up only) */}
              {isSignUp && password && (
                <div className="space-y-1 px-1">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-1.5 text-xs">
                      {check.met ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive shrink-0" />
                      )}
                      <span className={check.met ? "text-green-600" : "text-muted-foreground"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Forgot Password */}
              {!isSignUp && (
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => { setResetEmail(email); setResetStep("email"); }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-lg text-base font-semibold bg-blue-600 hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  isSignUp ? "Create Account" : "Sign In"
                )}
              </Button>
            </form>

            {!isSignUp && domainContext !== "admin" && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="h-px flex-1 bg-gray-200" />or<span className="h-px flex-1 bg-gray-200" />
                </div>
                {phoneLoginOpen ? (
                  <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                    <PhoneInput
                      value={phoneLoginNumber}
                      onChange={setPhoneLoginNumber}
                      placeholder="Phone number"
                      disabled={phoneLoginCodeSent}
                    />
                    {phoneLoginCodeSent && (
                      <Input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="6-digit code"
                        value={phoneLoginCode}
                        maxLength={6}
                        onChange={(event) => setPhoneLoginCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="h-12 text-center tracking-[0.35em]"
                      />
                    )}
                    <Button
                      type="button"
                      className="w-full h-11"
                      disabled={isLoading || (phoneLoginCodeSent && phoneLoginCode.length !== 6)}
                      onClick={phoneLoginCodeSent ? verifyPhoneLogin : requestPhoneLogin}
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : phoneLoginCodeSent ? "Verify and Sign In" : "Send Login Code"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => { setPhoneLoginOpen(false); setPhoneLoginCodeSent(false); setPhoneLoginCode(""); }}
                    >
                      Use email instead
                    </Button>
                  </div>
                ) : (
                  <>
                    {GOOGLE_AUTH_ENABLED && (
                      <Button type="button" variant="outline" className="w-full h-11" onClick={startGoogleLogin} disabled={isLoading}>
                        Continue with Google
                      </Button>
                    )}
                    <Button type="button" variant="outline" className="w-full h-11" onClick={() => setPhoneLoginOpen(true)} disabled={isLoading}>
                      <Smartphone className="mr-2 h-4 w-4" /> Sign in with phone
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Divider and Create Account */}
            {domainContext !== "admin" && (
              <>
                <div className="my-4 sm:my-6 text-center">
                  <span className="text-xs sm:text-sm text-gray-500">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 sm:h-12 rounded-lg text-sm sm:text-base font-semibold border border-green-600 text-white bg-green-600 hover:bg-green-700 transition-colors"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? "Sign In" : "Create New Account"}
                </Button>
              </>
            )}
          </>)}
        </div>
      </div>
    </div>
  );
};

export default Auth;

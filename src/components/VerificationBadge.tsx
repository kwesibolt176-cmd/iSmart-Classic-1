import { useState, useEffect, useMemo } from "react";
import { useCriticalFlow, loadFlowState, saveFlowState, clearFlowState } from "@/lib/critical-flow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useISmartAPI } from "@/hooks/use-ismart-api";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  MapPin,
  Shield,
  Upload,
  User,
  Loader2,
  Mail,
  Phone,
  ArrowRight,
  Lock,
  Zap,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { mirrorDocumentToISmart } from "@/lib/ismart-uploads";
import { resolveISmartBusinessId, ensureISmartBusinessId } from "@/lib/ismart-business";
import {
  effectiveVerificationLevel,
  levelStepsCompleted,
  parseUpstreamVerification,
} from "@/lib/verification-status";

interface BusinessVerification {
  id: string;
  verification_level: number;
  status: string;
  business_registration_verified: boolean;
  identity_verified: boolean;
  address_verified: boolean;
  bank_verified: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  documents: Record<string, any> | null;
}

function readContactVerification(payload: unknown): { email: boolean; phone: boolean } | null {
  if (!payload || typeof payload !== "object") return null;

  const value = payload as Record<string, unknown>;
  const email = value.email_verified ?? value.emailVerified ?? value.email;
  const phone = value.phone_verified ?? value.phoneVerified ?? value.phone ?? value.phone_number;

  if (typeof email === "boolean" || typeof phone === "boolean") {
    return { email: email === true, phone: phone === true };
  }

  for (const nested of Object.values(value)) {
    const result = readContactVerification(nested);
    if (result) return result;
  }

  return null;
}

const levelConfig: Record<number, {
  label: string;
  limit: string;
  gradient: string;
  iconBg: string;
  badge: string;
  ring: string;
}> = {
  0: { label: "Not Started", limit: "No transactions", gradient: "from-red-600 to-red-500", iconBg: "bg-red-500/20", badge: "bg-red-500/10 text-red-600 border-red-500/30", ring: "ring-red-500/20" },
  1: { label: "Basic Verified", limit: "GHS 5,000/day", gradient: "from-blue-600 to-blue-500", iconBg: "bg-blue-500/20", badge: "bg-blue-500/10 text-blue-600 border-blue-500/30", ring: "ring-blue-500/20" },
  2: { label: "ID Verified", limit: "GHS 50,000/day", gradient: "from-amber-600 to-amber-500", iconBg: "bg-amber-500/20", badge: "bg-amber-500/10 text-amber-600 border-amber-500/30", ring: "ring-amber-500/20" },
  3: { label: "Fully Verified", limit: "GHS 100,000/day", gradient: "from-emerald-600 to-emerald-500", iconBg: "bg-emerald-500/20", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", ring: "ring-emerald-500/20" },
};

const LEVEL_REQUIREMENTS: Record<number, {
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  gradient: string;
  requirements: { key: string; label: string; description: string; type: "upload" | "email" | "phone" }[];
}> = {
  1: {
    title: "Basic Verification",
    subtitle: "Verify your identity to start transacting",
    icon: User,
    color: "text-blue-500",
    gradient: "from-blue-600 to-blue-500",
    requirements: [
      { key: "email_verified", label: "Email Address", description: "We'll send a one-time verification link", type: "email" },
      { key: "phone_verified", label: "Phone Number", description: "We'll send an OTP to your registered number", type: "phone" },
    ],
  },
  2: {
    title: "ID Verification",
    subtitle: "Unlock up to GHS 50,000 daily",
    icon: Building2,
    color: "text-amber-500",
    gradient: "from-amber-600 to-amber-500",
    requirements: [
      { key: "certificate_of_incorporation", label: "Certificate of Incorporation", description: "Business incorporation certificate (PDF/JPG/PNG)", type: "upload" },
      { key: "ghana_card_front", label: "Ghana Card — Front", description: "Clear photo of the front of your Ghana Card", type: "upload" },
      { key: "ghana_card_back", label: "Ghana Card — Back", description: "Clear photo of the back of your Ghana Card", type: "upload" },
      { key: "business_registration", label: "Business Registration", description: "Certificate of business registration", type: "upload" },
    ],
  },
  3: {
    title: "Full KYC",
    subtitle: "Unlock up to GHS 100,000 daily — max limits",
    icon: MapPin,
    color: "text-emerald-500",
    gradient: "from-emerald-600 to-emerald-500",
    requirements: [
      { key: "business_license", label: "Business License", description: "Current and valid business operating license", type: "upload" },
      { key: "operating_permit", label: "Operating Permit", description: "Permit for your type of business operations", type: "upload" },
      { key: "proof_of_address", label: "Proof of Address", description: "Utility bill or tenancy agreement (last 3 months)", type: "upload" },
    ],
  },
};

// ─── Level Finish Dialog ──────────────────────────────────────────────────────

function LevelFinishDialog({
  level,
  verification,
  onSuccess,
}: {
  level: number;
  verification: BusinessVerification | null;
  onSuccess: () => void;
}) {
  const { profile } = useBusiness();
  const flowKey = `verify-level-${level}`;
  const persisted = useMemo(
    () => {
      const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navigation?.type === "reload") clearFlowState(flowKey);
      return loadFlowState(flowKey, { open: false, emailSent: false, phoneSent: false, emailCode: "", otpCode: "" });
    },
    [flowKey]
  );
  const [open, setOpen] = useState(persisted.open);
  const [uploading, setUploading] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(persisted.emailSent);
  const [phoneSent, setPhoneSent] = useState(persisted.phoneSent);
  const [emailCode, setEmailCode] = useState(persisted.emailCode);
  const [otpCode, setOtpCode] = useState(persisted.otpCode);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPhone, setSendingPhone] = useState(false);

  // Keep the dialog + OTP entry alive across tab switches (user leaves to read SMS)
  useCriticalFlow(flowKey, open);
  useEffect(() => {
    if (open) saveFlowState(flowKey, { open, emailSent, phoneSent, emailCode, otpCode });
    else clearFlowState(flowKey);
  }, [flowKey, open, emailSent, phoneSent, emailCode, otpCode]);

  const sendVerificationCode = async (purpose: "email" | "phone") => {
    const destination = purpose === "email"
      ? (profile as any)?.business_email
      : (profile as any)?.business_phone;
    if (!destination) {
      toast.error(`Add a business ${purpose} in Settings before verifying`);
      return;
    }
    if (purpose === "email") setSendingEmail(true); else setSendingPhone(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-otp", {
        body: { purpose, destination },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Unable to send code");
      if (purpose === "email") setEmailSent(true); else setPhoneSent(true);
      toast.success(`Verification code sent to your ${purpose}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to send code");
    } finally {
      if (purpose === "email") setSendingEmail(false); else setSendingPhone(false);
    }
  };

  const verifyCode = async (purpose: "email" | "phone") => {
    const code = purpose === "email" ? emailCode : otpCode;
    if (!code.trim() || !profile?.id) {
      toast.error("Enter the verification code");
      return;
    }
    if (purpose === "email") setSendingEmail(true); else setSendingPhone(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-verification-otp", {
        body: { purpose, code: code.trim(), business_id: profile.id },
      });
      console.log("[VerificationBadge] verification OTP response", { purpose, data, error });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Invalid code");
      toast.success(`${purpose === "email" ? "Email" : "Phone"} verified`);
      if (purpose === "email") { setEmailCode(""); setEmailSent(false); } else { setOtpCode(""); setPhoneSent(false); }
      onSuccess();
    } catch (error: unknown) {
      console.error("[VerificationBadge] verification OTP request failed", { purpose, error });
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      if (purpose === "email") setSendingEmail(false); else setSendingPhone(false);
    }
  };

  const levelData = LEVEL_REQUIREMENTS[level];
  if (!levelData) return null;

  const isContactVerified = (key: string) => Boolean((verification as unknown as Record<string, unknown> | null | undefined)?.[key]);

  const getDocStatus = (key: string) => {
    if ((key === "email_verified" || key === "phone_verified") && isContactVerified(key)) return "verified";
    const doc = verification?.documents?.[key];
    if (doc?.status === "pending_review") return "reviewing";
    if (doc?.status === "rejected") return "rejected";
    if (doc?.url) return "uploaded";
    return "pending";
  };

  //this is a random comment I have added
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const input = e.target;
    if (!input.files?.[0] || !profile?.id) return;
    const file = input.files[0];

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large — maximum size is 10MB");
      input.value = "";
      return;
    }

    setUploading(key);
    try {
      await mirrorDocumentToISmart(key, file, (await ensureISmartBusinessId(profile)) || undefined);

      const { data: existing } = await supabase.from("business_verifications").select("id, documents").eq("business_id", profile.id).maybeSingle();
      const currentDocs = (existing?.documents as Record<string, any>) || {};
      const updatedDocs = { ...currentDocs, [key]: { file_name: file.name, uploaded_at: new Date().toISOString(), uploaded_to_ismart: true, status: "pending_review" } };

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("business_verifications")
          .update({ documents: updatedDocs, status: "pending" })
          .eq("business_id", profile.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("business_verifications")
          .insert({ business_id: profile.id, documents: updatedDocs, status: "pending" });
        if (insertError) throw insertError;
      }

      toast.success("Document uploaded — under review");
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload document";
      toast.error(message);
    } finally {
      setUploading(null);
      input.value = "";
    }
  };


  const Icon = levelData.icon;

  const statusLabel: Record<string, { text: string; className: string }> = {
    reviewing: { text: "Under Review", className: "bg-amber-500/10 text-amber-600 border border-amber-500/20" },
    rejected: { text: "Rejected", className: "bg-red-500/10 text-red-600 border border-red-500/20" },
    uploaded: { text: "Uploaded", className: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
    pending: { text: "Required", className: "bg-muted text-muted-foreground border border-border" },
    verified: { text: "Verified", className: "bg-green-500/10 text-green-600 border border-green-500/20" },
  };

  // Tell the merchant what is still needed: verifying only the phone (or only the
  // email) leaves the account at level 0, which looked like a failure (QA BUG-02).
  const contactKeys = levelData.requirements.filter((req) => req.type === "email" || req.type === "phone");
  const outstandingContacts = contactKeys.filter((req) => !isContactVerified(req.key));
  const contactHint = contactKeys.length > 0 && outstandingContacts.length > 0 && outstandingContacts.length < contactKeys.length
    ? `${contactKeys.find((req) => isContactVerified(req.key))?.type === "phone" ? "Phone" : "Email"} verified. Verify your ${outstandingContacts.map((req) => req.type).join(" and ")} to complete Level ${level}.`
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-xs px-3 gap-1.5 shrink-0">
          Finish <ArrowRight className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Clean Header */}
        <div className="relative bg-card border-b p-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Level {level}</p>
              <h3 className="text-lg font-bold text-foreground">{levelData.title}</h3>
              <p className="text-muted-foreground text-sm mt-0.5">{levelData.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 -mt-2">
          {contactHint && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">{contactHint}</p>
          )}
          {levelData.requirements.map((req) => {
            const docStatus = getDocStatus(req.key);
            const isUploading = uploading === req.key;
            const status = statusLabel[docStatus];

            return (
              <div key={req.key} className="border rounded-xl p-4 bg-muted/30 space-y-3 hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{req.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{req.description}</p>
                  </div>
                  <span className={cn("shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full", status.className)}>
                    {status.text}
                  </span>
                </div>

                {req.type === "upload" && (
                  <Label className="block cursor-pointer">
                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleUpload(e, req.key)} disabled={isUploading} />
                    <Button variant="outline" size="sm" className="w-full gap-2 border-dashed hover:border-primary hover:bg-primary/5" disabled={isUploading} asChild>
                      <span>
                        {isUploading
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
                          : docStatus === "reviewing" ? <><Upload className="h-3.5 w-3.5" /> Replace Document</>
                          : docStatus === "rejected" ? <><Upload className="h-3.5 w-3.5" /> Re-upload Document</>
                          : <><Upload className="h-3.5 w-3.5" /> Choose File</>
                        }
                      </span>
                    </Button>
                  </Label>
                )}

                {req.type === "email" && !isContactVerified(req.key) && (
                  !emailSent ? (
                    <Button size="sm" className="w-full gap-2" onClick={() => sendVerificationCode("email")} disabled={sendingEmail}>
                      <Mail className="h-3.5 w-3.5" />
                      {sendingEmail ? "Sending..." : "Send Verification Link"}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input placeholder="Enter code from email" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} className="flex-1 h-8 text-sm" />
                      <Button size="sm" className="shrink-0" onClick={() => verifyCode("email")} disabled={sendingEmail}>Verify</Button>
                    </div>
                  )
                )}

                {req.type === "phone" && !isContactVerified(req.key) && (
                  !phoneSent ? (
                    <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => sendVerificationCode("phone")} disabled={sendingPhone}>
                      <Phone className="h-3.5 w-3.5" />
                      {sendingPhone ? "Sending..." : "Send OTP"}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input placeholder="Enter OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="flex-1 h-8 text-sm" />
                      <Button size="sm" className="shrink-0" onClick={() => verifyCode("phone")} disabled={sendingPhone}>Verify</Button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Reviewed within 1–2 business days
          </p>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Verification Dialog Content ────────────────────────────────────────

function VerificationContent({
  level,
  progress,
  steps,
  verification,
  onRefresh,
}: {
  level: number;
  progress: number;
  steps: Array<{ id: string; label: string; description: string; icon: any; completed: boolean; levelNum: number; limit: string }>;
  verification: BusinessVerification | null;
  onRefresh: () => void;
}) {
  const cfg = levelConfig[level] || levelConfig[0];
  const completedCount = steps.filter(s => s.completed).length;

  return (
    <div className="flex flex-col">
      {/* Clean header */}
      <div className="relative bg-card border-b p-6 pr-14">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Verification Status</p>
            <h3 className="text-lg font-bold text-foreground mt-0.5">Level {level}: {cfg.label}</h3>
            <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary font-medium">{cfg.limit}</span>
            </p>
            <div className="mt-4">
              <div className="h-1.5 bg-muted rounded-full">
                <div className="h-1.5 bg-primary rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-muted-foreground text-[10px] mt-1.5">{completedCount} of {steps.length} levels complete</p>
            </div>
          </div>
          {/* Simple progress circle - positioned to avoid close button */}
          <div className="relative w-16 h-16 shrink-0 mt-1">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${progress} ${100 - progress}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground leading-none">{completedCount}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">/{steps.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Steps list */}
      <div className="p-4 space-y-2.5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const stepCfg = levelConfig[step.levelNum] || levelConfig[0];
          return (
            <div key={step.id} className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
              step.completed
                ? "bg-primary/5 border-primary/20"
                : "bg-card border-border hover:border-primary/20"
            )}>
              {/* Step number / check */}
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2",
                step.completed
                  ? "bg-primary border-primary text-white"
                  : "bg-background border-border text-muted-foreground"
              )}>
                {step.completed ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn("font-semibold text-sm", step.completed ? "text-primary" : "text-foreground")}>
                    {step.label}
                  </p>
                  {step.completed && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">Done</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                <p className="text-[10px] text-primary/70 font-medium mt-1 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Unlocks {step.limit}
                </p>
              </div>

              {!step.completed ? (
                <LevelFinishDialog level={step.levelNum} verification={verification} onSuccess={onRefresh} />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Info footer */}
      <div className="mx-4 mb-4 p-3.5 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary" /> Why verify?
        </p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 shrink-0" /> Higher daily transaction limits</li>
          <li className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 shrink-0" /> Access to collections & disbursements</li>
          <li className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 shrink-0" /> Compliant with Ghana GRA & Bank of Ghana</li>
        </ul>
      </div>
    </div>
  );
}

// ─── VerificationBadge (exported) ────────────────────────────────────────────

export function VerificationBadge({ compact = false }: { compact?: boolean }) {
  const { profile } = useBusiness();
  const { getVerificationLevel, getBusinessVerificationLevel, checkEmailPhoneVerified } = useISmartAPI();
  const [verification, setVerification] = useState<BusinessVerification | null>(null);
  const [tier, setTier] = useState<{ name?: string; transactionLimit?: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkingContactAuth, setCheckingContactAuth] = useState(false);
  const [upstream, setUpstream] = useState<number | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    fetchVerification();

    // Live-update the badge when verification flags/level change in the backend
    const channel = supabase
      .channel(`verification-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_verifications", filter: `business_id=eq.${profile.id}` },
        () => fetchVerification()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const fetchVerification = async () => {
    if (!profile?.id) return;

    // Local fallback first
    const { data: local } = await supabase
      .from("business_verifications")
      .select("*")
      .eq("business_id", profile.id)
      .maybeSingle();

    let merged: BusinessVerification | null = (local as BusinessVerification) || null;

    // Overlay with live iSmart verification status.
    // Prefer the business-scoped endpoint (returns tier name + limit) and fall
    // back to the individual customer endpoint.
    let upstreamLevel: number | null = null;
    try {
      const ismartBusinessId =
        resolveISmartBusinessId(profile);

      const ismart: any = ismartBusinessId
        ? await getBusinessVerificationLevel(ismartBusinessId)
        : await getVerificationLevel();

      const parsed = parseUpstreamVerification(ismart);
      if (parsed) {
        upstreamLevel = parsed.level;
        setTier({ name: parsed.tierName, transactionLimit: parsed.transactionLimit });

        merged = {
          ...(merged as any),
          id: merged?.id ?? "ismart",
          // Merchant Core is the source of truth when it returns a level.
          verification_level: effectiveVerificationLevel(merged as any, parsed.level),
          status: parsed.status ?? merged?.status ?? "pending",
          email_verified: Boolean(merged?.email_verified || parsed.flags.email_verified),
          phone_verified: Boolean(merged?.phone_verified || parsed.flags.phone_verified),
          identity_verified: merged?.identity_verified ?? parsed.flags.identity_verified ?? false,
          business_registration_verified:
            merged?.business_registration_verified ??
            parsed.flags.business_registration_verified ??
            false,
          address_verified: merged?.address_verified ?? parsed.flags.address_verified ?? false,
          bank_verified: merged?.bank_verified ?? false,
          documents: merged?.documents ?? null,
        } as BusinessVerification;
      }
    } catch (err) {
      console.warn("[VerificationBadge] iSmart verification level fetch failed", err);
    }

    if (merged) setVerification(merged);
    setUpstream(upstreamLevel);
  };

  const handleDialogChange = async (open: boolean) => {
    if (!open) {
      setDialogOpen(false);
      return;
    }

    if (checkingContactAuth) return;

    setCheckingContactAuth(true);
    try {
      const result = await checkEmailPhoneVerified();
      if (!result?.success) {
        throw new Error(result?.error || "Please authenticate your iSmart account before verifying.");
      }

      const contactVerification = readContactVerification(result.data);
      if (contactVerification?.email && contactVerification?.phone) {
        await fetchVerification();
        toast.success("Your email and phone number are already verified.");
        return;
      }

      setDialogOpen(true);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Please authenticate your iSmart account before verifying.");
    } finally {
      setCheckingContactAuth(false);
    }
  };

  // Use the exact same rules as the KYC page and the backend trigger.
  const steps = levelStepsCompleted(verification as any);
  const step1Done = steps.step1;
  const step2Done = steps.step2;
  const step3Done = steps.step3;
  const level = effectiveVerificationLevel(verification as any, upstream);

  const newLevel = level >= 3 ? 3 : level >= 2 ? 2 : level >= 1 ? 1 : 0;
  const cfg = levelConfig[newLevel] || levelConfig[0];

  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progress = (completedSteps / 3) * 100;

  const verificationSteps = [
    { id: "identity", label: "Level 1: Basic Verification", description: "Verify your email and phone number", icon: User, completed: step1Done, levelNum: 1, limit: "GHS 5,000/day" },
    { id: "business", label: "Level 2: ID Verification", description: "Submit business registration documents", icon: Building2, completed: step2Done, levelNum: 2, limit: "GHS 50,000/day" },
    { id: "address", label: "Level 3: Full KYC", description: "Upload business license and proof of address", icon: MapPin, completed: step3Done, levelNum: 3, limit: "GHS 100,000/day" },

  ];

  const triggerEl = compact ? (
    <button className={cn(
      "group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.03] active:scale-[0.98] shrink-0",
      newLevel === 3 
        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400/50 text-white"
        : newLevel === 2
        ? "bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400/50 text-white"
        : newLevel === 1
        ? "bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400/50 text-white"
        : "bg-gradient-to-r from-red-500 to-red-600 border-red-400/50 text-white"
    )}>
      <div className="relative shrink-0">
        {newLevel === 3 ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : (
          <Shield className="w-3.5 h-3.5" />
        )}
        {newLevel < 3 && (
          <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
          </span>
        )}
      </div>
      <span className="hidden sm:inline tracking-wide">Lvl {level}</span>
      <span className="sm:hidden">{level}</span>
    </button>
  ) : (
    <Badge
      className={cn("cursor-pointer hover:opacity-80 transition-opacity gap-2 px-3 py-1.5 text-xs font-semibold border-2 ring-2 ring-offset-1 ring-offset-background", cfg.badge, cfg.ring)}
      variant="outline"
    >
      {newLevel === 3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
      Verification Level {level}
    </Badge>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{triggerEl}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[92vh] overflow-y-auto gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Business Verification</DialogTitle>
          <DialogDescription>Complete verification to unlock higher transaction limits</DialogDescription>
        </DialogHeader>
        {(tier?.name || tier?.transactionLimit !== undefined) && (
          <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/50 px-3.5 py-2.5">
            <span className="text-xs font-semibold text-foreground">
              {tier?.name ? tier.name : `Level ${level}`}
            </span>
            {tier?.transactionLimit !== undefined && (
              <span className="text-xs text-muted-foreground">
                Limit: GHS {tier.transactionLimit.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        )}
        <VerificationContent
          level={newLevel}
          progress={progress}
          steps={verificationSteps}
          verification={verification}
          onRefresh={fetchVerification}
        />
        {/* Later button at bottom of main dialog */}
        <div className="px-4 pb-4">
          <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground text-sm" onClick={() => setDialogOpen(false)}>
            I'll verify later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

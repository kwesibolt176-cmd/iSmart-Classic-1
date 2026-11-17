import { useState, useEffect } from "react";
import { useCriticalFlow, loadFlowState, saveFlowState, clearFlowState } from "@/lib/critical-flow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { mirrorDocumentToISmart, bulkPushStoredDocuments } from "@/lib/ismart-uploads";
import { resolveISmartBusinessId, ensureISmartBusinessId } from "@/lib/ismart-business";
import { useISmartAPI } from "@/hooks/use-ismart-api";
import { effectiveVerificationLevel, parseUpstreamVerification } from "@/lib/verification-status";
import { MerchantRiskPanel } from "@/components/merchant/MerchantIntegrationPanels";
import { Shield, CheckCircle, XCircle, Clock, Upload, FileText, Building, User, CreditCard, MapPin, RefreshCw, AlertTriangle } from "lucide-react";

interface VerificationData {
  id: string;
  status: string;
  verification_level: number;
  // Level 1: Basic Verification
  email_verified: boolean;
  phone_verified: boolean;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  // Level 2: ID Verification
  certificate_of_incorporation_verified: boolean;
  ghana_card_front_verified: boolean;
  ghana_card_back_verified: boolean;
  business_registration_verified: boolean;
  // Level 3: Full KYC
  business_license_verified: boolean;
  operating_permit_verified: boolean;
  proof_of_address_verified: boolean;
  // Legacy fields for backward compatibility
  identity_verified: boolean;
  address_verified: boolean;
  bank_verified: boolean;
  documents: Record<string, any> | null;
  rejection_reason: string | null;
  verified_at: string | null;
}

const VERIFICATION_LEVELS = {
  1: {
    name: 'Basic Verification',
    description: 'Verify your email and phone number',
    icon: User,
    color: 'bg-blue-500',
    requirements: [
      { key: 'email_verified', label: 'Email Verification', description: 'Enter the code sent to your email' },
      { key: 'phone_verified', label: 'Phone Verification', description: 'Enter OTP sent to your phone' }
    ]
  },
  2: {
    name: 'ID Verification',
    description: 'Upload your business documents',
    icon: Building,
    color: 'bg-purple-500',
    requirements: [
      { key: 'certificate_of_incorporation_verified', label: 'Certificate of Incorporation', description: 'Business incorporation certificate' },
      { key: 'ghana_card_front_verified', label: 'Ghana Card (Front)', description: 'High-quality image of front side' },
      { key: 'ghana_card_back_verified', label: 'Ghana Card (Back)', description: 'High-quality image of back side' },
      { key: 'business_registration_verified', label: 'Business Registration Certificate', description: 'Business registration document' }
    ]
  },
  3: {
    name: 'Full KYC',
    description: 'Complete verification for unrestricted access',
    icon: Shield,
    color: 'bg-green-500',
    requirements: [
      { key: 'business_license_verified', label: 'Business License', description: 'Current business license' },
      { key: 'operating_permit_verified', label: 'Operating Permit', description: 'Business operating permit' },
      { key: 'proof_of_address_verified', label: 'Proof of Address', description: 'Utility bill or tenancy agreement' }
    ]
  }
};

const LEVEL_INFO = [
  { level: 0, name: 'Not Started', limits: 'No transactions', color: 'bg-red-500', outlineColor: 'border-red-500' },
  { level: 1, name: 'Basic Verified', limits: 'Up to GHS 5,000/day', color: 'bg-blue-500', outlineColor: 'border-blue-500' },
  { level: 2, name: 'ID Verified', limits: 'Up to GHS 50,000/day', color: 'bg-yellow-500', outlineColor: 'border-yellow-500' },
  { level: 3, name: 'Fully Verified', limits: 'Up to GHS 100,000/day', color: 'bg-green-500', outlineColor: 'border-green-500' },
];

function readContactVerification(payload: unknown): { email: boolean; phone: boolean } | null {
  if (!payload || typeof payload !== 'object') return null;

  const value = payload as Record<string, unknown>;
  const email = value.email_verified ?? value.emailVerified ?? value.email;
  const phone = value.phone_verified ?? value.phoneVerified ?? value.phone ?? value.phone_number;

  if (typeof email === 'boolean' || typeof phone === 'boolean') {
    return { email: email === true, phone: phone === true };
  }

  for (const nested of Object.values(value)) {
    const result = readContactVerification(nested);
    if (result) return result;
  }

  return null;
}

export const KYC = () => {
  const { profile, user } = useBusiness();
  const {
    getVerificationLevel,
    getBusinessVerificationLevel,
    getBusinessInfo,
    getKYCDocs,
    checkEmailPhoneVerified,
    requestVerifyEmail,
    verifyLoggedInEmail,
    requestVerifyPhoneOTP,
    verifyPhone,
  } = useISmartAPI();
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [upstreamLevel, setUpstreamLevel] = useState<number | null>(null);
  const [upstreamDocumentStatuses, setUpstreamDocumentStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bulkPushing, setBulkPushing] = useState(false);
  
  // Email/Phone verification states (persisted so switching apps to read the SMS
  // doesn't wipe the pending OTP entry)
  const [kycFlow] = useState(() => {
    return loadFlowState('kyc-otp', {
      emailSent: false,
      phoneSent: false,
      otpCode: '',
      emailCode: '',
    });
  });
  const [emailVerificationSent, setEmailVerificationSent] = useState(kycFlow.emailSent);
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(kycFlow.phoneSent);
  const [otpCode, setOtpCode] = useState(kycFlow.otpCode);
  const [emailCode, setEmailCode] = useState(kycFlow.emailCode);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPhone, setSendingPhone] = useState(false);
  const [contactVerification, setContactVerification] = useState<{ email: boolean; phone: boolean } | null>(null);

  const otpPending = emailVerificationSent || phoneVerificationSent;
  useCriticalFlow('kyc-otp', otpPending);
  useEffect(() => {
    if (otpPending) {
      saveFlowState('kyc-otp', {
        emailSent: emailVerificationSent,
        phoneSent: phoneVerificationSent,
        otpCode,
        emailCode,
      });
    } else {
      clearFlowState('kyc-otp');
    }
  }, [otpPending, emailVerificationSent, phoneVerificationSent, otpCode, emailCode]);

  useEffect(() => {
    if (profile?.id) {
      fetchVerification();
      checkContactVerification();
      fetchUpstreamDocumentStatuses();
    }
  }, [profile?.id]);

  const fetchUpstreamDocumentStatuses = async () => {
    const businessId = resolveISmartBusinessId(profile);
    if (!businessId) return;

    try {
      const [businessInfoResponse, kycResponse] = await Promise.all([
        getBusinessInfo(businessId),
        getKYCDocs(),
      ]);
      const statuses: Record<string, string> = {};
      const businessInfo = (businessInfoResponse?.data as any)?.data ?? businessInfoResponse?.data;
      const businessDocuments = Array.isArray(businessInfo?.documents) ? businessInfo.documents : [];
      const businessDocumentKeys: Record<string, string> = {
        COI_DOC: 'certificate_of_incorporation_verified',
        BRC_DOC: 'business_registration_verified',
        BL_DOC: 'business_license_verified',
        OP_DOC: 'operating_permit_verified',
        POA_DOC: 'proof_of_address_verified',
        PROOF_OF_ADDRESS: 'proof_of_address_verified',
      };

      for (const document of businessDocuments) {
        const key = businessDocumentKeys[String(document?.doc_type || '').toUpperCase()];
        if (key) statuses[key] = String(document?.status || 'rejected').toLowerCase();
      }

      const kycData = (kycResponse?.data as any)?.data ?? kycResponse?.data;
      const kycDocuments = Array.isArray(kycData) ? kycData : [];
      const ghanaCard = kycDocuments.find(
        (document: any) => String(document?.document_type || '').toUpperCase() === 'GHANA_CARD',
      );
      if (ghanaCard) {
        const status = String(ghanaCard.status || 'rejected').toLowerCase();
        statuses.ghana_card_front_verified = status;
        statuses.ghana_card_back_verified = status;
      }

      setUpstreamDocumentStatuses(statuses);
    } catch (error) {
      console.warn('[KYC] upstream document status fetch failed:', error);
    }
  };

  const checkContactVerification = async () => {
    try {
      console.log('[KYC] iSmart verification request:', {
        action: 'checkEmailPhoneVerified',
        method: 'GET',
        endpoint: '/auth/check-email-phone-verified',
      });
      const result = await checkEmailPhoneVerified();
      console.log('[KYC] check email/phone verification response:', result);
      setContactVerification(result?.success ? readContactVerification(result.data) : null);
    } catch (error) {
      console.error('[KYC] email/phone verification check failed:', error);
      setContactVerification(null);
    }
  };

  const refreshUpstreamLevel = async () => {
    try {
      const ismartBusinessId =
        resolveISmartBusinessId(profile);
      const res: any = ismartBusinessId
        ? await getBusinessVerificationLevel(ismartBusinessId)
        : await getVerificationLevel();
      const parsed = parseUpstreamVerification(res);
      setUpstreamLevel(parsed?.level ?? null);
    } catch (err) {
      console.warn('[KYC] verification API level fetch failed', err);
      setUpstreamLevel(null);
    }
  };

  const fetchVerification = async () => {
    try {
      const { data, error } = await supabase
        .from('business_verifications')
        .select('*')
        .eq('business_id', profile?.id)
        .maybeSingle();

      if (error) throw error;

      const mapRow = (row: any): VerificationData => ({
        ...row,
        email_verified: row.email_verified ?? false,
        phone_verified: row.phone_verified ?? false,
        email_verified_at: row.email_verified_at ?? null,
        phone_verified_at: row.phone_verified_at ?? null,
        certificate_of_incorporation_verified: row.certificate_of_incorporation_verified ?? false,
        ghana_card_front_verified: row.ghana_card_front_verified ?? false,
        ghana_card_back_verified: row.ghana_card_back_verified ?? false,
        business_registration_verified: row.business_registration_verified ?? false,
        business_license_verified: row.business_license_verified ?? false,
        operating_permit_verified: row.operating_permit_verified ?? false,
        proof_of_address_verified: row.proof_of_address_verified ?? false,
        identity_verified: row.identity_verified ?? false,
        address_verified: row.address_verified ?? false,
        bank_verified: row.bank_verified ?? false,
        documents: (row.documents as Record<string, any>) ?? null,
      });

      if (data) {
        setVerification(mapRow(data));
        void refreshUpstreamLevel();
      } else {
        const { data: newData, error: createError } = await supabase
          .from('business_verifications')
          .insert({ business_id: profile?.id })
          .select()
          .single();
        if (createError) throw createError;
        setVerification(mapRow(newData));
        void refreshUpstreamLevel();
      }
    } catch (error) {
      console.error('Error fetching verification:', error);
      toast.error('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };


  // Email verification functions
  const sendEmailVerification = async () => {
    const destination = (profile as any)?.business_email || (profile as any)?.email;
    if (!destination) {
      toast.error('No business email on file. Please set it in your profile first.');
      return;
    }
    setSendingEmail(true);
    try {
      const response = await requestVerifyEmail();
      console.log('[KYC] iSmart send email verification response:', response);
      if (!response?.success || response.data?.success === false) {
        throw new Error(response?.error || response.data?.error || 'Failed to send code');
      }
      toast.success(`Verification code sent to ${destination}`);
      setEmailVerificationSent(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setSendingEmail(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!emailCode) {
      toast.error('Please enter the verification code');
      return;
    }
    setVerifyingEmail(true);
    try {
      const response = await verifyLoggedInEmail(emailCode);
      console.log('[KYC] iSmart verify email code response:', response);
      if (!response?.success || response.data?.success === false) {
        throw new Error(response?.error || response.data?.error || 'Invalid code');
      }
      toast.success('Email verified successfully');
      await fetchVerification();
      setContactVerification((current) => ({ email: true, phone: current?.phone ?? false }));
      setEmailCode('');
      setEmailVerificationSent(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to verify email');
    } finally {
      setVerifyingEmail(false);
    }
  };

  // Phone verification functions
  const sendPhoneOTP = async () => {
    const destination = (profile as any)?.business_phone || (profile as any)?.phone;
    if (!destination) {
      toast.error('No business phone on file. Please set it in your profile first.');
      return;
    }
    setSendingPhone(true);
    try {
      const response = await requestVerifyPhoneOTP('business_contact');
      console.log('[KYC] iSmart send phone OTP response:', response);
      if (!response?.success || response.data?.success === false) {
        throw new Error(response?.error || response.data?.error || 'Failed to send OTP');
      }
      toast.success(`OTP sent to ${destination}`);
      setPhoneVerificationSent(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setSendingPhone(false);
    }
  };

  const verifyPhoneOTP = async () => {
    if (!otpCode) {
      toast.error('Please enter the OTP');
      return;
    }
    setVerifyingPhone(true);
    try {
      const response = await verifyPhone(otpCode.trim());
      console.log('[KYC] iSmart verify phone OTP response:', response);
      if (!response?.success || response.data?.success === false) {
        throw new Error(response?.error || response.data?.error || 'Invalid OTP');
      }
      toast.success('Phone verified successfully');
      await fetchVerification();
      setContactVerification((current) => ({ email: current?.email ?? false, phone: true }));
      setOtpCode('');
      setPhoneVerificationSent(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to verify phone');
    } finally {
      setVerifyingPhone(false);
    }
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedStep) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File is too large. Maximum size is 10MB.');
      }

      await mirrorDocumentToISmart(selectedStep, file, (await ensureISmartBusinessId(profile)) || undefined);

      // Update verification record
      const currentDocs = verification?.documents || {};
      const updatedDocs = {
        ...currentDocs,
        [selectedStep]: {
          file_name: file.name,
          uploaded_at: new Date().toISOString(),
          uploaded_to_ismart: true,
          status: 'pending_review'
        }
      };

      if (!verification?.id) throw new Error('Verification record not ready. Please refresh and try again.');

      const { error: updateError } = await supabase
        .from('business_verifications')
        .update({ 
          documents: updatedDocs,
          status: 'pending'
        })
        .eq('id', verification.id);

      if (updateError) throw updateError;

      toast.success('Document uploaded successfully');
      setUploadDialogOpen(false);
      fetchVerification();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleBulkPush = async () => {
    const docs = verification?.documents as Record<string, any> | null;
    const count = Object.values(docs || {}).filter((d: any) => d?.path).length;
    if (!count) {
      toast.info('No uploaded documents to push yet');
      return;
    }
    setBulkPushing(true);
    try {
      const businessId = (await ensureISmartBusinessId(profile)) || undefined;
      const result = await bulkPushStoredDocuments(docs, businessId);
      if (result.pushed.length) toast.success(`Pushed ${result.pushed.length} of ${result.total} document(s) to iSmart`);
      if (result.deferred.length) toast.warning(`${result.deferred.length} document(s) queued — iSmart upload limit reached, retry later`);
      if (result.failed.length) toast.error(`${result.failed.length} failed: ${result.failed[0].error}`);
      fetchVerification();
    } catch (error: any) {
      toast.error(error?.message || 'Bulk push failed');
    } finally {
      setBulkPushing(false);
    }
  };

  const getStepStatus = (key: string) => {
    if (!verification) return 'pending';

    const upstreamStatus = upstreamDocumentStatuses[key];
    if (upstreamStatus) {
      if (upstreamStatus === 'verified') return 'verified';
      if (upstreamStatus === 'pending') return 'reviewing';
      return 'rejected';
    }
    
    const isContactKey = key === 'email_verified' || key === 'phone_verified';
    const isVerified = isContactKey && contactVerification
      ? key === 'email_verified' ? contactVerification?.email : contactVerification?.phone
      : verification[key as keyof VerificationData] as boolean;
    if (isVerified) return 'verified';
    
    const doc = verification.documents?.[key];
    if (doc?.status === 'pending_review') return 'reviewing';
    if (doc?.status === 'rejected') return 'rejected';
    
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; className?: string }> = {
      verified: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      reviewing: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      pending: { variant: "outline", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Upload className="h-3 w-3" /> },
    };
    const { variant, icon, className } = config[status] || config.pending;
    return (
      <Badge variant={variant} className={`gap-1 capitalize ${className || ''}`}>
        {icon}
        {status === 'reviewing' ? 'Under Review' : status}
      </Badge>
    );
  };

  // Calculate verification progress based on completed requirements
  const calculateProgress = () => {
    if (!verification) return 0;
    
    let totalRequirements = 0;
    let completedRequirements = 0;
    
    Object.values(VERIFICATION_LEVELS).forEach(level => {
      level.requirements.forEach(req => {
        totalRequirements++;
        if (verification[req.key as keyof VerificationData] as boolean) {
          completedRequirements++;
        }
      });
    });
    
    return totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;
  };

  const verificationProgress = calculateProgress();

  const currentLevel = effectiveVerificationLevel(verification as any, upstreamLevel);
  const levelInfo = LEVEL_INFO[currentLevel];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
        <MerchantRiskPanel />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">KYC Verification</h1>
            <p className="text-muted-foreground mt-1">Complete verification to unlock higher transaction limits</p>
          </div>
          <Button variant="outline" onClick={handleBulkPush} disabled={bulkPushing} className="gap-2 self-start">
            {bulkPushing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {bulkPushing ? 'Pushing documents…' : 'Push all documents to iSmart'}
          </Button>
        </div>

        {/* Unified Status Hero Card */}
        <Card className="overflow-hidden border-0 shadow-lg bg-card">
          {/* Gradient header strip */}
          <div className="relative bg-gradient-to-r from-primary/90 via-primary to-primary/80 p-6 sm:p-8">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-widest">KYC Verification</p>
                  <h2 className="text-2xl font-bold text-white">
                    Level {currentLevel}: {levelInfo.name}
                  </h2>
                  <p className="text-white/80 text-sm mt-0.5">{levelInfo.limits}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-white/70 text-xs uppercase tracking-wider">Progress</p>
                  <p className="text-3xl font-bold text-white">{Math.round(verificationProgress)}%</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                  <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="white" strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={`${verificationProgress} ${100 - verificationProgress}`}
                      strokeDashoffset="0"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Level track */}
          <CardContent className="p-4 sm:p-6">
            <div className="relative flex items-start justify-between gap-2 mt-2">
              {/* Connecting line behind the circles */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-border mx-[calc(12.5%+8px)]" />
              <div
                className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-700 mx-[calc(12.5%+8px)]"
                style={{ width: `${currentLevel === 0 ? 0 : (currentLevel / 3) * 100}%`, maxWidth: "calc(100% - 25%)" }}
              />

              {LEVEL_INFO.map((level) => {
                const isComplete = currentLevel > level.level;
                const isCurrent = currentLevel === level.level;
                
                return (
                  <div key={level.level} className="relative flex flex-col items-center flex-1 gap-2 z-10">
                    {/* Circle node */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                      ${isComplete ? 'bg-primary border-primary text-white shadow-md shadow-primary/30' :
                        isCurrent ? 'bg-background border-primary text-primary shadow-md shadow-primary/20 ring-4 ring-primary/10' :
                        'bg-background border-border text-muted-foreground'}
                    `}>
                      {isComplete ? <CheckCircle className="h-4 w-4" /> : level.level}
                    </div>

                    {/* Label */}
                    <div className="text-center">
                      <p className={`text-xs font-semibold leading-tight ${isCurrent ? 'text-primary' : isComplete ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {level.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                        {level.limits}
                      </p>
                    </div>

                    {/* Current indicator */}
                    {isCurrent && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile limits row */}
            <div className="flex sm:hidden justify-between mt-4 px-1">
              {LEVEL_INFO.map((level) => (
                <div key={level.level} className="flex-1 text-center">
                  <p className="text-[9px] text-muted-foreground leading-tight">{level.limits}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


        {/* Rejection Notice */}
        {verification?.rejection_reason && (
          <Card className="border-destructive">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">Verification Rejected</p>
                <p className="text-sm text-muted-foreground mt-1">{verification.rejection_reason}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Levels */}
        <div className="space-y-6">
          {Object.entries(VERIFICATION_LEVELS).map(([level, levelData]) => {
            const isLevelUnlocked = currentLevel >= parseInt(level);
            const levelInfo = LEVEL_INFO[parseInt(level)];
            const Icon = levelData.icon;
            
            return (
              <Card key={level} className={`border-2 ${levelInfo.outlineColor} ${isLevelUnlocked ? 'bg-primary/5' : ''}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isLevelUnlocked ? 'bg-primary/20' : 'bg-muted'}`}>
                      <Icon className={`h-6 w-6 ${isLevelUnlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        Level {level}: {levelData.name}
                        {isLevelUnlocked && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </CardTitle>
                      <CardDescription>{levelData.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {levelData.requirements.map((requirement) => {
                      const status = getStepStatus(requirement.key);
                      const isEmailVerification = requirement.key === 'email_verified';
                      const isPhoneVerification = requirement.key === 'phone_verified';
                      const hasUpstreamDocument = Boolean(upstreamDocumentStatuses[requirement.key]);
                      
                      return (
                        <div key={requirement.key} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{requirement.label}</h4>
                              {getStatusBadge(status)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{requirement.description}</p>
                          </div>
                          
                          {/* Email Verification UI */}
                          {isEmailVerification && status !== 'verified' && (
                            <div className="flex gap-2 items-center">
                              <Input
                                placeholder="Enter code"
                                value={emailCode}
                                onChange={(e) => setEmailCode(e.target.value)}
                                className="w-24"
                              />
                              {!emailVerificationSent ? (
                                <Button size="sm" onClick={sendEmailVerification} disabled={sendingEmail}>
                                  {sendingEmail ? 'Sending...' : 'Send Code'}
                                </Button>
                              ) : (
                                <>
                                  <Button size="sm" onClick={verifyEmailCode} disabled={verifyingEmail || sendingEmail}>
                                    {verifyingEmail ? 'Verifying...' : 'Verify'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEmailCode('');
                                      sendEmailVerification();
                                    }}
                                    disabled={sendingEmail || verifyingEmail}
                                  >
                                    Resend
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Phone Verification UI */}
                          {isPhoneVerification && status !== 'verified' && (
                            <div className="flex gap-2 items-center">
                              <Input
                                placeholder="Enter OTP"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                className="w-24"
                              />
                              {!phoneVerificationSent ? (
                                <Button size="sm" onClick={sendPhoneOTP} disabled={sendingPhone}>
                                  {sendingPhone ? 'Sending...' : 'Send OTP'}
                                </Button>
                              ) : (
                                <>
                                  <Button size="sm" onClick={verifyPhoneOTP} disabled={verifyingPhone || sendingPhone}>
                                    {verifyingPhone ? 'Verifying...' : 'Verify'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setOtpCode('');
                                      sendPhoneOTP();
                                    }}
                                    disabled={sendingPhone || verifyingPhone}
                                  >
                                    Resend
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Document Upload for other requirements */}
                          {!isEmailVerification && !isPhoneVerification && status !== 'verified' &&
                            (!hasUpstreamDocument || status === 'rejected') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStep(requirement.key);
                                setUploadDialogOpen(true);
                              }}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground border-primary"
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              {status === 'rejected' ? 'Re-upload' : 'Upload'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                {selectedStep && (() => {
                  for (const level of Object.values(VERIFICATION_LEVELS)) {
                    const req = level.requirements.find(r => r.key === selectedStep);
                    if (req) return req.description;
                  }
                  return 'Upload your document';
                })()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  Upload PDF, JPG, or PNG (max 5MB)
                </p>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button variant="outline" disabled={uploading} asChild>
                    <span>
                      {uploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        'Choose File'
                      )}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default KYC;

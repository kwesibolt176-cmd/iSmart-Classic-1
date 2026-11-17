import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Use2FACheckResult {
  requires2FA: boolean;
  is2FAVerified: boolean;
  loading: boolean;
  verify2FA: () => void;
  set2FAVerified: (verified: boolean) => void;
}

export const use2FACheck = (): Use2FACheckResult => {
  const [requires2FA, setRequires2FA] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is super admin
      const { data: isSuperAdmin } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'super_admin' 
      });

      if (!isSuperAdmin) {
        setRequires2FA(false);
        setLoading(false);
        return;
      }

      // Check if 2FA is enabled for this user
      const { data: has2FA } = await supabase.rpc('has_2fa_enabled', { 
        _user_id: user.id 
      });

      setRequires2FA(has2FA || false);

      // Check if already verified in this session
      const verified = sessionStorage.getItem('2fa_verified') === 'true';
      const verifiedAt = sessionStorage.getItem('2fa_verified_at');
      
      // 2FA verification expires after 12 hours
      if (verified && verifiedAt) {
        const verifiedTime = parseInt(verifiedAt);
        const twelveHoursMs = 12 * 60 * 60 * 1000;
        if (Date.now() - verifiedTime < twelveHoursMs) {
          setIs2FAVerified(true);
        } else {
          sessionStorage.removeItem('2fa_verified');
          sessionStorage.removeItem('2fa_verified_at');
        }
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = () => {
    // This is called when user needs to show 2FA dialog
    setIs2FAVerified(false);
  };

  const set2FAVerified = (verified: boolean) => {
    setIs2FAVerified(verified);
    if (verified) {
      sessionStorage.setItem('2fa_verified', 'true');
      sessionStorage.setItem('2fa_verified_at', Date.now().toString());
    } else {
      sessionStorage.removeItem('2fa_verified');
      sessionStorage.removeItem('2fa_verified_at');
    }
  };

  return { requires2FA, is2FAVerified, loading, verify2FA, set2FAVerified };
};

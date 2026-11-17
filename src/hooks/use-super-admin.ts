import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'super_admin' });

        if (error) throw error;
        setIsSuperAdmin(data || false);
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, []);

  return { isSuperAdmin, loading };
};

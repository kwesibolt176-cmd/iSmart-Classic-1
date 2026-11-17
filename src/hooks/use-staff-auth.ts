import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export interface StaffPermissions {
  products: boolean;
  orders: boolean;
  customers: boolean;
  kitchen: boolean;
  tables: boolean;
  reservations: boolean;
  settings: boolean;
  reports: boolean;
  staff_management: boolean;
}

export interface StaffSession {
  isStaff: boolean;
  isOwner: boolean;
  staffId: string | null;
  businessUserId: string | null;
  permissions: StaffPermissions;
  staffName: string | null;
  roleName: string | null;
  accessStatus?: 'active' | 'suspended' | 'revoked';
}

const defaultPermissions: StaffPermissions = {
  products: true,
  orders: true,
  customers: true,
  kitchen: true,
  tables: true,
  reservations: true,
  settings: true,
  reports: true,
  staff_management: true,
};

const staffDefaultPermissions: StaffPermissions = {
  products: false,
  orders: false,
  customers: false,
  kitchen: false,
  tables: false,
  reservations: false,
  settings: false,
  reports: false,
  staff_management: false,
};

export const useStaffAuth = () => {
  const [session, setSession] = useState<StaffSession>({
    isStaff: false,
    isOwner: true,
    staffId: null,
    businessUserId: null,
    permissions: defaultPermissions,
    staffName: null,
    roleName: null,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkStaffStatus = async (authUser: User | null) => {
      if (!authUser) {
        setSession({
          isStaff: false,
          isOwner: false,
          staffId: null,
          businessUserId: null,
          permissions: staffDefaultPermissions,
          staffName: null,
          roleName: null,
          accessStatus: undefined,
        });
        setLoading(false);
        return;
      }

      // Check if user is a business owner (has a business profile)
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id, user_id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (businessProfile) {
        // User is a business owner
        setSession({
          isStaff: false,
          isOwner: true,
          staffId: null,
          businessUserId: authUser.id,
          permissions: defaultPermissions,
          staffName: null,
          roleName: 'Owner',
          accessStatus: 'active',
        });
        setLoading(false);
        return;
      }

      // Check if user is a staff member
      const { data: staffRecord } = await supabase
        .from('staff')
        .select(`
          id,
          name,
          user_id,
          role_id,
          access_status,
          staff_roles (
            name,
            permissions
          )
        `)
        .eq('auth_user_id', authUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (staffRecord) {
        // Check if staff access is revoked or suspended
        if (staffRecord.access_status === 'revoked' || staffRecord.access_status === 'suspended') {
          setSession({
            isStaff: true,
            isOwner: false,
            staffId: staffRecord.id,
            businessUserId: staffRecord.user_id,
            permissions: staffDefaultPermissions, // No permissions when revoked/suspended
            staffName: staffRecord.name,
            roleName: (staffRecord.staff_roles as any)?.name || 'Staff',
            accessStatus: staffRecord.access_status,
          });
          setLoading(false);
          return;
        }

        const rolePermissions = (staffRecord.staff_roles as any)?.permissions || staffDefaultPermissions;
        setSession({
          isStaff: true,
          isOwner: false,
          staffId: staffRecord.id,
          businessUserId: staffRecord.user_id,
          permissions: rolePermissions as StaffPermissions,
          staffName: staffRecord.name,
          roleName: (staffRecord.staff_roles as any)?.name || 'Staff',
          accessStatus: 'active',
        });
      } else {
        // User has neither business profile nor staff record
        setSession({
          isStaff: false,
          isOwner: false,
          staffId: null,
          businessUserId: null,
          permissions: staffDefaultPermissions,
          staffName: null,
          roleName: null,
          accessStatus: undefined,
        });
      }
      setLoading(false);
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, authSession) => {
        setUser(authSession?.user ?? null);
        setTimeout(() => {
          checkStaffStatus(authSession?.user ?? null);
        }, 0);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session: authSession } }) => {
      setUser(authSession?.user ?? null);
      checkStaffStatus(authSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermission = (permission: keyof StaffPermissions): boolean => {
    return session.permissions[permission];
  };

  return {
    ...session,
    loading,
    user,
    hasPermission,
  };
};

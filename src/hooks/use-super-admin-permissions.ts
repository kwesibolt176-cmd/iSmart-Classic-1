import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SuperAdminPermissions {
  manage_users: boolean;
  manage_subscriptions: boolean;
  manage_roles: boolean;
  view_analytics: boolean;
  manage_features: boolean;
  system_settings: boolean;
  view_audit_logs: boolean;
  impersonate_users: boolean;
  manage_credits: boolean;
  send_announcements: boolean;
  manage_integrations: boolean;
  database_access: boolean;
}

const ALL_PERMISSIONS: (keyof SuperAdminPermissions)[] = [
  'manage_users',
  'manage_subscriptions',
  'manage_roles',
  'view_analytics',
  'manage_features',
  'system_settings',
  'view_audit_logs',
  'impersonate_users',
  'manage_credits',
  'send_announcements',
  'manage_integrations',
  'database_access',
];

export const useSuperAdminPermissions = () => {
  const [permissions, setPermissions] = useState<SuperAdminPermissions>({
    manage_users: false,
    manage_subscriptions: false,
    manage_roles: false,
    view_analytics: false,
    manage_features: false,
    system_settings: false,
    view_audit_logs: false,
    impersonate_users: false,
    manage_credits: false,
    send_announcements: false,
    manage_integrations: false,
    database_access: false,
  });
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Check if user is super admin
        const { data: hasRole } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'super_admin',
        });

        if (!hasRole) {
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        setIsSuperAdmin(true);

        // Fetch all permissions for this user
        const { data: permData, error } = await supabase
          .from('super_admin_permissions')
          .select('permission_key')
          .eq('user_id', user.id);

        if (error) throw error;

        // Build permissions object
        const userPerms: SuperAdminPermissions = {
          manage_users: false,
          manage_subscriptions: false,
          manage_roles: false,
          view_analytics: false,
          manage_features: false,
          system_settings: false,
          view_audit_logs: false,
          impersonate_users: false,
          manage_credits: false,
          send_announcements: false,
          manage_integrations: false,
          database_access: false,
        };

        // If no specific permissions set, grant all (backwards compatibility)
        if (!permData || permData.length === 0) {
          ALL_PERMISSIONS.forEach(key => {
            userPerms[key] = true;
          });
        } else {
          permData.forEach(perm => {
            if (perm.permission_key in userPerms) {
              userPerms[perm.permission_key as keyof SuperAdminPermissions] = true;
            }
          });
        }

        setPermissions(userPerms);
      } catch (error) {
        console.error('Error fetching super admin permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = useCallback((permission: keyof SuperAdminPermissions): boolean => {
    // Super admins with no specific permissions configured have all access
    return isSuperAdmin && permissions[permission];
  }, [isSuperAdmin, permissions]);

  const hasAnyPermission = useCallback((perms: (keyof SuperAdminPermissions)[]): boolean => {
    return perms.some(p => hasPermission(p));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((perms: (keyof SuperAdminPermissions)[]): boolean => {
    return perms.every(p => hasPermission(p));
  }, [hasPermission]);

  return {
    permissions,
    loading,
    isSuperAdmin,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};

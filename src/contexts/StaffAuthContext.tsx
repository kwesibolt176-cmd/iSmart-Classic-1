import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useStaffAuth, StaffSession, StaffPermissions } from '@/hooks/use-staff-auth';
import { User } from '@supabase/supabase-js';

export interface ActiveStaffSession {
  staffId: string;
  staffName: string;
  position: string;
  isAdmin: boolean;
}

interface StaffAuthContextType extends StaffSession {
  loading: boolean;
  user: User | null;
  hasPermission: (permission: keyof StaffPermissions) => boolean;
  activeStaff: ActiveStaffSession | null;
  setActiveStaff: (staff: ActiveStaffSession | null) => void;
  clearActiveStaff: () => void;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export const StaffAuthProvider = ({ children }: { children: ReactNode }) => {
  const staffAuth = useStaffAuth();
  const [activeStaff, setActiveStaffState] = useState<ActiveStaffSession | null>(() => {
    // Restore from sessionStorage if available
    const stored = sessionStorage.getItem('activeStaff');
    return stored ? JSON.parse(stored) : null;
  });

  const setActiveStaff = useCallback((staff: ActiveStaffSession | null) => {
    setActiveStaffState(staff);
    if (staff) {
      sessionStorage.setItem('activeStaff', JSON.stringify(staff));
    } else {
      sessionStorage.removeItem('activeStaff');
    }
  }, []);

  const clearActiveStaff = useCallback(() => {
    setActiveStaffState(null);
    sessionStorage.removeItem('activeStaff');
  }, []);

  return (
    <StaffAuthContext.Provider value={{ 
      ...staffAuth, 
      activeStaff, 
      setActiveStaff,
      clearActiveStaff 
    }}>
      {children}
    </StaffAuthContext.Provider>
  );
};

export const useStaffAuthContext = () => {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error('useStaffAuthContext must be used within a StaffAuthProvider');
  }
  return context;
};

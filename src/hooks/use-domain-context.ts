import { useState, useEffect } from 'react';

export type DomainContext = 'admin' | 'app';

export const useDomainContext = (): DomainContext => {
  const [domainContext, setDomainContext] = useState<DomainContext>(() => {
    try {
      return getDomainContext();
    } catch (error) {
      console.error('Error determining domain context:', error);
      return 'app'; // Safe fallback
    }
  });

  useEffect(() => {
    try {
      setDomainContext(getDomainContext());
    } catch (error) {
      console.error('Error determining domain context:', error);
      setDomainContext('app');
    }
  }, []);

  return domainContext;
};

function getDomainContext(): DomainContext {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const searchParams = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search) 
    : new URLSearchParams();
  const contextParam = searchParams.get('context');
  
  // Allow query param override for development/testing
  if (contextParam === 'admin') return 'admin';
  if (contextParam === 'app') return 'app';

  // Explicit super-admin entry point for environments that share one hostname.
  if (pathname === '/super-admin' || pathname.startsWith('/super-admin/')) {
    return 'admin';
  }
  
  // control.getdowo.online → super admin
  if (hostname.startsWith('control.')) {
    return 'admin';
  }
  
  // Everything else → main app (getdowo.online, www, localhost, preview)
  return 'app';
}

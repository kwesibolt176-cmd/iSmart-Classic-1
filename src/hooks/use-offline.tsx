import { useState, useEffect } from 'react';
import { syncAllOfflineData } from '@/lib/offline-sync';
import { hasPendingOfflineData } from '@/lib/offline-storage';
import { toast } from 'sonner';

/**
 * Hook to detect online/offline status and sync data
 */
export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Update pending count
  const updatePendingCount = () => {
    if (hasPendingOfflineData()) {
      const count = 1; // Simplified - could calculate actual count
      setPendingCount(count);
    } else {
      setPendingCount(0);
    }
  };

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      console.log('Connection restored');
      setIsOnline(true);
      
      // Check if there's pending data to sync
      if (hasPendingOfflineData()) {
        toast.info('Connection restored. Syncing offline data...');
        setIsSyncing(true);
        
        try {
          await syncAllOfflineData();
          updatePendingCount();
        } catch (error) {
          console.error('Sync error:', error);
          toast.error('Failed to sync some offline data');
        } finally {
          setIsSyncing(false);
        }
      } else {
        toast.success('Connection restored');
      }
    };

    const handleOffline = () => {
      console.log('Connection lost');
      setIsOnline(false);
      toast.warning('No internet connection. Working in offline mode.');
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending count
    updatePendingCount();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    updatePendingCount,
  };
};

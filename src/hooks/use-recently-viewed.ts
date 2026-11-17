import { useState, useEffect, useCallback } from "react";

interface RecentlyViewedItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  viewedAt: Date;
}

const RECENTLY_VIEWED_KEY = "storefront_recently_viewed";
const MAX_ITEMS = 10;

export const useRecentlyViewed = (storeId?: string) => {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const storageKey = storeId ? `${RECENTLY_VIEWED_KEY}_${storeId}` : RECENTLY_VIEWED_KEY;

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentlyViewed(parsed.map((item: RecentlyViewedItem) => ({
          ...item,
          viewedAt: new Date(item.viewedAt)
        })));
      } catch (e) {
        console.error("Error parsing recently viewed:", e);
      }
    }
  }, [storageKey]);

  // Persist to localStorage
  const persistItems = useCallback((items: RecentlyViewedItem[]) => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [storageKey]);

  const addRecentlyViewed = useCallback((item: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    setRecentlyViewed(prev => {
      // Remove if already exists (to move to front)
      const filtered = prev.filter(i => i.id !== item.id);
      // Add to front with timestamp
      const updated = [{ ...item, viewedAt: new Date() }, ...filtered].slice(0, MAX_ITEMS);
      persistItems(updated);
      return updated;
    });
  }, [persistItems]);

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    recentlyViewed,
    addRecentlyViewed,
    clearRecentlyViewed,
  };
};

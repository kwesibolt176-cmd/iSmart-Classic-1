import { useState, useEffect, useCallback } from "react";

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  addedAt: Date;
}

const WISHLIST_KEY = "storefront_wishlist";

export const useWishlist = (storeId?: string) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const storageKey = storeId ? `${WISHLIST_KEY}_${storeId}` : WISHLIST_KEY;

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setWishlist(parsed.map((item: WishlistItem) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        })));
      } catch (e) {
        console.error("Error parsing wishlist:", e);
      }
    }
  }, [storageKey]);

  // Persist wishlist to localStorage
  const persistWishlist = useCallback((items: WishlistItem[]) => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [storageKey]);

  const addToWishlist = useCallback((item: Omit<WishlistItem, 'addedAt'>) => {
    setWishlist(prev => {
      if (prev.some(i => i.id === item.id)) return prev;
      const updated = [...prev, { ...item, addedAt: new Date() }];
      persistWishlist(updated);
      return updated;
    });
  }, [persistWishlist]);

  const removeFromWishlist = useCallback((itemId: string) => {
    setWishlist(prev => {
      const updated = prev.filter(i => i.id !== itemId);
      persistWishlist(updated);
      return updated;
    });
  }, [persistWishlist]);

  const isInWishlist = useCallback((itemId: string) => {
    return wishlist.some(i => i.id === itemId);
  }, [wishlist]);

  const toggleWishlist = useCallback((item: Omit<WishlistItem, 'addedAt'>) => {
    if (isInWishlist(item.id)) {
      removeFromWishlist(item.id);
      return false;
    } else {
      addToWishlist(item);
      return true;
    }
  }, [isInWishlist, removeFromWishlist, addToWishlist]);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    wishlist,
    wishlistCount: wishlist.length,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    clearWishlist,
  };
};

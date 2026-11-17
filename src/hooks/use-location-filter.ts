import { useLocation } from "@/contexts/LocationContext";

/**
 * Hook to get the current location ID for filtering queries
 * Returns null if no location is selected
 */
export const useLocationFilter = () => {
  const { currentLocation } = useLocation();
  return currentLocation?.id || null;
};

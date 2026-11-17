import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./BusinessContext";
import { toast } from "sonner";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Transient browser/network failures (aborted requests during navigation, offline blips). */
const isTransientNetworkError = (error: unknown) => {
  const message = (error as any)?.message?.toString().toLowerCase() ?? "";
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("aborted") ||
    message.includes("signal is aborted")
  );
};


interface Location {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface LocationContextType {
  locations: Location[];
  currentLocation: Location | null;
  loading: boolean;
  setCurrentLocation: (location: Location) => void;
  refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useBusiness();
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const fetchLocations = async () => {
    if (!user) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const query = () =>
      supabase
        .from("locations")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name");

    try {
      let data: Location[] | null = null;
      let lastError: unknown = null;

      // Retry transient network failures (requests aborted during navigation/token refresh)
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await query();
          if (result.error) throw result.error;
          data = (result.data as Location[]) || [];
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (!isTransientNetworkError(error)) break;
          await sleep(400 * (attempt + 1));
        }
      }

      if (lastError) throw lastError;

      setLocations(data || []);

      // Set current location from localStorage or default
      const savedLocationId = localStorage.getItem("currentLocationId");
      if (savedLocationId) {
        const savedLocation = data?.find((loc) => loc.id === savedLocationId);
        if (savedLocation) {
          setCurrentLocationState(savedLocation);
          return;
        }
      }

      // If no saved location, use default or first location
      const defaultLocation = data?.find((loc) => loc.is_default);
      if (defaultLocation) {
        setCurrentLocationState(defaultLocation);
        localStorage.setItem("currentLocationId", defaultLocation.id);
      } else if (data && data.length > 0) {
        setCurrentLocationState(data[0]);
        localStorage.setItem("currentLocationId", data[0].id);
      }
    } catch (error) {
      // Don't alarm the user for transient network blips — the next focus/refetch recovers
      if (isTransientNetworkError(error)) {
        console.warn("Locations fetch skipped (network unavailable), will retry later");
      } else {
        console.error("Error fetching locations:", error);
        toast.error("Failed to load locations");
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };


  useEffect(() => {
    if (user?.id) {
      fetchLocations();
    }
  }, [user?.id]);

  const setCurrentLocation = (location: Location) => {
    setCurrentLocationState(location);
    localStorage.setItem("currentLocationId", location.id);
    toast.success(`Switched to ${location.name}`);
  };

  const refreshLocations = async () => {
    await fetchLocations();
  };

  return (
    <LocationContext.Provider
      value={{
        locations,
        currentLocation,
        loading,
        setCurrentLocation,
        refreshLocations,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
};

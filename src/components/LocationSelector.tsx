import { Check, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/contexts/LocationContext";

export const LocationSelector = () => {
  const { locations, currentLocation, setCurrentLocation, loading } = useLocation();

  if (loading || !currentLocation) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/5">
        <MapPin className="h-4 w-4 text-white/50 shrink-0" />
        <span className="text-sm text-white/50">Loading...</span>
      </div>
    );
  }

  if (locations.length === 0) {
    return null;
  }

  if (locations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/5">
        <MapPin className="h-4 w-4 text-white shrink-0" />
        <span className="text-sm font-semibold text-white truncate">{currentLocation.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <MapPin className="h-4 w-4 text-white shrink-0" />
          <span className="text-sm font-semibold text-white truncate flex-1 text-left">{currentLocation.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {locations.map((location) => (
          <DropdownMenuItem
            key={location.id}
            onClick={() => setCurrentLocation(location)}
            className="cursor-pointer"
          >
            <Check
              className={`mr-2 h-4 w-4 ${
                currentLocation.id === location.id ? "opacity-100" : "opacity-0"
              }`}
            />
            <div className="flex flex-col">
              <span className="font-medium">{location.name}</span>
              {location.address && (
                <span className="text-xs text-muted-foreground">{location.address}</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

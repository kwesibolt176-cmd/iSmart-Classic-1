import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpdateNotificationProps {
  updateAvailable: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateNotification = ({
  updateAvailable,
  onUpdate,
  onDismiss,
}: UpdateNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      // Slight delay to show notification smoothly
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [updateAvailable]);

  const handleUpdate = useCallback(() => {
    setIsUpdating(true);
    // Give user visual feedback before reload
    setTimeout(() => {
      onUpdate();
    }, 300);
  }, [onUpdate]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-[100]",
        "bg-primary text-primary-foreground",
        "rounded-lg shadow-lg px-4 py-3",
        "flex items-center gap-3",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        "max-w-[90vw] sm:max-w-md"
      )}
    >
      <RefreshCw className={cn("h-5 w-5 flex-shrink-0", isUpdating && "animate-spin")} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Update available</p>
        <p className="text-xs opacity-90 truncate">
          A new version is ready. Update when convenient.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUpdate}
          disabled={isUpdating}
          className="text-xs h-8"
        >
          {isUpdating ? "Updating..." : "Update Now"}
        </Button>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-primary-foreground/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

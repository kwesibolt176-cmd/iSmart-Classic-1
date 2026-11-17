import { useOffline } from "@/hooks/use-offline";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Wifi, RefreshCw, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount } = useOffline();

  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className={cn(
          "py-2 px-4 text-sm font-medium shadow-lg",
          isSyncing && "animate-pulse"
        )}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Syncing data...
          </>
        ) : isOnline ? (
          pendingCount > 0 ? (
            <>
              <CloudOff className="w-4 h-4 mr-2" />
              {pendingCount} pending sync
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 mr-2" />
              Online
            </>
          )
        ) : (
          <>
            <WifiOff className="w-4 h-4 mr-2" />
            Offline Mode
          </>
        )}
      </Badge>
    </div>
  );
};

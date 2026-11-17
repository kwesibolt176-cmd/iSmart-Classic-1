import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface KitchenOrderTimerProps {
  createdAt: string;
  status: string;
}

export const KitchenOrderTimer = ({ createdAt, status }: KitchenOrderTimerProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = new Date(createdAt).getTime();
    
    const updateElapsed = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - startTime) / 1000));
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [createdAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Urgency levels based on time elapsed
  const getUrgencyClass = () => {
    if (status === "ready") return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
    if (elapsed < 300) return "bg-muted text-muted-foreground border-border"; // < 5 min
    if (elapsed < 600) return "bg-amber-500/20 text-amber-600 border-amber-500/30"; // 5-10 min
    return "bg-destructive/20 text-destructive border-destructive/30 animate-pulse"; // > 10 min
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border",
        getUrgencyClass()
      )}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{formatTime(elapsed)}</span>
    </div>
  );
};

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "gradient";
  change?: string;
}

export const StatsCard = ({ title, value, icon: Icon, change }: Omit<StatsCardProps, 'variant'>) => {
  return (
    <div className="group rounded-xl p-6 border border-border bg-card hover:border-primary/20 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-end mb-4 min-h-[24px]">
        {change && (
          <div className="px-2 py-1 rounded-md bg-green-500/10 text-green-600 text-[10px] font-bold uppercase tracking-wider">
            {change}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{title}</p>
        <p className="text-xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
};

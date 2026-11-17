import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "@/contexts/LocationContext";
import { MapPin } from "lucide-react";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";

interface PageHeaderProps {
  title: string;
  description?: string | ReactNode;
  rightContent?: ReactNode;
  sticky?: boolean;
  className?: string;
  showSeparator?: boolean;
  showLocation?: boolean;
}

export const PageHeader = ({
  title,
  description,
  rightContent,
  sticky = true,
  className,
  showSeparator = true,
  showLocation = true,
}: PageHeaderProps) => {
  const { currentLocation, locations } = useLocation();
  const shouldShowLocation = showLocation && currentLocation && locations.length > 0;

  return (
    <div
      className={cn(
        "z-20 w-full transition-all duration-300",
        sticky && "sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border/50",
        className
      )}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-500 min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
                {title}
              </h1>
              {shouldShowLocation && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-primary/90 border border-primary shadow-md shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-white shrink-0" />
                  <span className="text-xs font-bold text-white whitespace-nowrap">{currentLocation.name}</span>
                </div>
              )}
            </div>
            {description && (
              <div className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
                {description}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500 shrink-0">
            <NotificationsDropdown />
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
};

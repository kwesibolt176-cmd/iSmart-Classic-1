import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onFocus, onWheel, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-base shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onFocus={(e) => {
          // Auto-select numeric values on focus so users can immediately
          // overwrite pre-filled figures (e.g. 0, 50) without manual deletion.
          if (type === "number") {
            requestAnimationFrame(() => {
              try {
                e.target.select();
              } catch {
                /* some input types (date/time) don't support select */
              }
            });
          }
          onFocus?.(e);
        }}
        onWheel={(e) => {
          // Prevent accidental value changes when scrolling over number inputs.
          if (type === "number" && document.activeElement === e.currentTarget) {
            e.currentTarget.blur();
          }
          onWheel?.(e);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

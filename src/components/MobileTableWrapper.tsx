import { ReactNode } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface MobileTableWrapperProps {
  children: ReactNode;
}

export const MobileTableWrapper = ({ children }: MobileTableWrapperProps) => {
  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div className="min-w-[800px]">
          {children}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useState } from "react";

interface MobileSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const MobileSidebar = ({ activeSection, onSectionChange }: MobileSidebarProps) => {
  const [open, setOpen] = useState(false);

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background/90"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[280px]">
        <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
      </SheetContent>
    </Sheet>
  );
};

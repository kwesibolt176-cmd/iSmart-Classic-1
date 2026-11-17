import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Delete, X, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PinVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correctPin: string;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const PinVerificationDialog = ({
  open,
  onOpenChange,
  correctPin,
  onSuccess,
  title = "Verify PIN",
  description = "Enter your 4-digit admin PIN to show balances",
}: PinVerificationDialogProps) => {
  const [pin, setPin] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const { toast } = useToast();

  // Keyboard support
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle number keys (0-9)
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberClick(e.key);
      }
      // Handle backspace
      else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
      // Handle delete or escape to clear
      else if (e.key === 'Delete' || e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, pin]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onSuccess();
          setPin("");
          setTimeout(() => onOpenChange(false), 100);
        } else {
          setIsShaking(true);
          toast({
            title: "Incorrect PIN",
            description: "Please try again",
            variant: "destructive",
          });
          setTimeout(() => {
            setIsShaking(false);
            setPin("");
          }, 500);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[320px] sm:max-w-[400px] p-6 rounded-3xl">
        <DialogHeader className="space-y-3 pb-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-center text-xl font-bold">{title}</DialogTitle>
            <DialogDescription className="text-center text-sm">
              {description}
            </DialogDescription>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Type on your keyboard or click the numbers below
            </p>
          </div>
        </DialogHeader>

        {/* PIN Dots */}
        <div className="relative group">
          <div className={cn(
            "flex justify-center gap-4 py-6 transition-transform",
            isShaking && "animate-shake"
          )}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-10 h-10 rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center text-lg font-bold",
                  i < pin.length
                    ? "bg-primary text-primary-foreground scale-105 shadow-primary/20"
                    : "bg-muted/50 border-2 border-dashed border-border text-muted-foreground"
                )}
              >
                {i < pin.length ? (showPin ? pin[i] : "•") : ""}
              </div>
            ))}
          </div>
          
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="absolute -right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
            title={showPin ? "Hide PIN" : "Show PIN"}
          >
            {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="outline"
              className={cn(
                "h-14 text-xl font-bold rounded-2xl border-border/50 transition-all active:scale-95",
                "hover:bg-primary/5 hover:border-primary/20"
              )}
              onClick={() => handleNumberClick(num.toString())}
            >
              {num}
            </Button>
          ))}
          <Button
            variant="outline"
            className="h-14 rounded-2xl border-border/50 hover:bg-destructive/5 hover:text-destructive active:scale-95"
            onClick={handleClear}
          >
            <X className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            className="h-14 text-xl font-bold rounded-2xl border-border/50 hover:bg-primary/5 active:scale-95"
            onClick={() => handleNumberClick("0")}
          >
            0
          </Button>
          <Button
            variant="outline"
            className="h-14 rounded-2xl border-border/50 hover:bg-muted/80 active:scale-95"
            onClick={handleBackspace}
          >
            <Delete className="w-5 h-5" />
          </Button>
        </div>

        <style>{`
          @keyframes dialog-shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          .animate-shake {
            animation: dialog-shake 0.5s ease-in-out;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

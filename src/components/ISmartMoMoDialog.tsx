import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Smartphone } from "lucide-react";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { formatPhoneNumber } from "@/lib/utils";

interface ISmartMoMoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerPhone: string;
  onPhoneChange: (phone: string) => void;
  onConfirm: (provider: "MTN" | "TELECEL") => void;
  isProcessing: boolean;
  amount: number;
  formatCurrency: (amount: number) => string;
}

export const ISmartMoMoDialog = ({
  open,
  onOpenChange,
  customerPhone,
  onPhoneChange,
  onConfirm,
  isProcessing,
  amount,
  formatCurrency,
}: ISmartMoMoDialogProps) => {
  const [provider, setProvider] = useState<"MTN" | "TELECEL">("MTN");

  const handleConfirm = () => {
    onConfirm(provider);
  };

  // Auto-detect provider from phone number
  const detectProvider = (phone: string) => {
    const cleanPhone = formatPhoneNumber(phone, 'international');
    // MTN prefixes: 23324, 23354, 23355, 23359
    if (cleanPhone.startsWith("23324") || cleanPhone.startsWith("23354") || 
        cleanPhone.startsWith("23355") || cleanPhone.startsWith("23359")) {
      return "MTN";
    }
    // Telecel prefixes: 23320, 23350
    if (cleanPhone.startsWith("23320") || cleanPhone.startsWith("23350")) {
      return "TELECEL";
    }
    return null;
  };

  const handlePhoneChange = (value: string) => {
    onPhoneChange(value);
    const detected = detectProvider(value);
    if (detected) {
      setProvider(detected);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Mobile Money Payment
          </DialogTitle>
          <DialogDescription>
            Enter the customer's mobile money number to receive a payment prompt of{" "}
            <strong>{formatCurrency(amount)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="momo-phone">Phone Number</Label>
            <PhoneInput
              id="momo-phone"
              value={customerPhone}
              onChange={handlePhoneChange}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-3">
            <Label>Network Provider</Label>
            <RadioGroup
              value={provider}
              onValueChange={(v) => setProvider(v as "MTN" | "TELECEL")}
              className="grid grid-cols-2 gap-4"
              disabled={isProcessing}
            >
              <div>
                <RadioGroupItem value="MTN" id="mtn" className="peer sr-only" />
                <Label
                  htmlFor="mtn"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-2xl font-bold text-yellow-500">MTN</span>
                  <span className="text-xs text-muted-foreground mt-1">Mobile Money</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="TELECEL" id="telecel" className="peer sr-only" />
                <Label
                  htmlFor="telecel"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-2xl font-bold text-red-500">Telecel</span>
                  <span className="text-xs text-muted-foreground mt-1">Cash</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!customerPhone || customerPhone.length < 10 || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Prompt...
              </>
            ) : (
              "Send Payment Prompt"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

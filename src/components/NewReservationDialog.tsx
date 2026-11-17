import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { createReservationConfirmationAction } from "@/lib/pending-actions";
import { Coins, Percent } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

interface NewReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReservationAdded?: () => void;
}

export const NewReservationDialog = ({ open, onOpenChange, onReservationAdded }: NewReservationDialogProps) => {
  const { user } = useBusiness();
  const { toast } = useToast();
  const { currencySymbol } = useCurrency();
  const [formData, setFormData] = useState({
    guestName: "",
    phone: "",
    email: "",
    date: "",
    time: "",
    guests: "",
    notes: "",
  });
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositType, setDepositType] = useState<"fixed" | "percentage">("fixed");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPercentage, setDepositPercentage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const depositData = requireDeposit
      ? {
          deposit_type: depositType,
          deposit_amount: depositType === "fixed" ? parseFloat(depositAmount) || 0 : 0,
          deposit_percentage: depositType === "percentage" ? parseFloat(depositPercentage) || 0 : 0,
          deposit_status: "pending" as const,
        }
      : {
          deposit_type: null,
          deposit_amount: 0,
          deposit_percentage: 0,
          deposit_status: "not_required" as const,
        };

    const { data: newReservation, error } = await supabase
      .from("reservations")
      .insert({
        user_id: user.id,
        customer_name: formData.guestName,
        customer_phone: formData.phone,
        customer_email: formData.email || null,
        reservation_date: formData.date,
        reservation_time: formData.time,
        party_size: parseInt(formData.guests),
        notes: formData.notes || null,
        status: "confirmed",
        ...depositData,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Create pending action for confirmation notification
    if (newReservation) {
      const depositInfo = requireDeposit
        ? `\n\nDeposit required: ${depositType === "fixed" ? `${currencySymbol}${depositAmount}` : `${depositPercentage}%`}`
        : "";
      
      try {
        await createReservationConfirmationAction(
          formData.email || null,
          formData.phone || null,
          `<p>Reservation confirmed for ${formData.guestName}</p>${depositInfo ? `<p>${depositInfo}</p>` : ""}`,
          `Your reservation for ${formData.guests} guests on ${formData.date} at ${formData.time} has been confirmed.${depositInfo}`,
          'high'
        );
      } catch (error) {
        console.error('Error creating confirmation notification:', error);
      }
    }

    toast({
      title: "Reservation confirmed",
      description: `Reservation for ${formData.guestName} has been queued.${requireDeposit ? " Deposit payment pending." : ""}`,
    });
    
    onReservationAdded?.();
    onOpenChange(false);
    setFormData({ guestName: "", phone: "", email: "", date: "", time: "", guests: "", notes: "" });
    setRequireDeposit(false);
    setDepositType("fixed");
    setDepositAmount("");
    setDepositPercentage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
          <DialogDescription>Create a new reservation for your business.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="guestName">Guest Name</Label>
            <Input
              id="guestName"
              placeholder="John Doe"
              value={formData.guestName}
              onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <PhoneInput
                id="phone"
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guests">Number of Guests</Label>
            <Input
              id="guests"
              type="number"
              min="1"
              placeholder="4"
              value={formData.guests}
              onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Special Requests (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requests or dietary restrictions..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Deposit Section */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="requireDeposit" className="font-medium">Require Deposit</Label>
                <p className="text-xs text-muted-foreground">Collect a deposit to secure the reservation</p>
              </div>
              <Switch
                id="requireDeposit"
                checked={requireDeposit}
                onCheckedChange={setRequireDeposit}
              />
            </div>

            {requireDeposit && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Deposit Type</Label>
                  <Select value={depositType} onValueChange={(v: "fixed" | "percentage") => setDepositType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4" />
                          Fixed Amount
                        </div>
                      </SelectItem>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4" />
                          Percentage
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {depositType === "fixed" ? (
                  <div className="space-y-2">
                    <Label htmlFor="depositAmount">Deposit Amount ({currencySymbol})</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="50.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      required={requireDeposit}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="depositPercentage">Deposit Percentage (%)</Label>
                    <Input
                      id="depositPercentage"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="25"
                      value={depositPercentage}
                      onChange={(e) => setDepositPercentage(e.target.value)}
                      required={requireDeposit}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Reservation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
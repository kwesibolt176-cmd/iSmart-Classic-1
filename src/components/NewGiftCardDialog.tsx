import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";

interface NewGiftCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NewGiftCardDialog = ({ open, onOpenChange, onSuccess }: NewGiftCardDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [requireOtp, setRequireOtp] = useState(true);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const { user } = useBusiness();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new Error("Amount must be greater than zero");
      if (expiryDate && new Date(expiryDate) <= new Date()) throw new Error("Expiry date must be in the future");

      const { error } = await supabase.rpc("issue_gift_card" as never, {
        p_amount: parsedAmount,
        p_recipient_name: recipientName || null,
        p_recipient_email: recipientEmail || null,
        p_recipient_phone: recipientPhone || null,
        p_require_otp: requireOtp && !!(recipientEmail || recipientPhone),
        p_expiry_date: expiryDate ? new Date(`${expiryDate}T23:59:59`).toISOString() : null,
        p_notes: notes || null,
      } as never);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Gift card created successfully",
      });

      // Reset form
      setAmount("");
      setRecipientName("");
      setRecipientEmail("");
      setRecipientPhone("");
      setRequireOtp(true);
      setExpiryDate("");
      setNotes("");
      
      onSuccess();
    } catch (error) {
      console.error("Error creating gift card:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create gift card",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Gift Card</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">Recipient Name</Label>
            <Input
              id="recipientName"
              placeholder="John Doe"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientEmail">Recipient Email</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="john@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientPhone">Recipient Phone</Label>
            <Input
              id="recipientPhone"
              type="tel"
              placeholder="+233..."
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="requireOtp" className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Require OTP verification
              </Label>
              <p className="text-xs text-muted-foreground">
                Recipient must enter a one-time code (sent to their email/phone) before redeeming.
              </p>
            </div>
            <Switch id="requireOtp" checked={requireOtp} onCheckedChange={setRequireOtp} />
          </div>


          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this gift card"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Gift Card"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

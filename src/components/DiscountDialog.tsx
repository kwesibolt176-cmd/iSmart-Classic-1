import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Percent, Tag } from "lucide-react";

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyDiscount: (discount: { type: string; value: number; reason: string }) => void;
}

export const DiscountDialog = ({ open, onOpenChange, onApplyDiscount }: DiscountDialogProps) => {
  const [discountType, setDiscountType] = useState("percentage");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyDiscount({
      type: discountType,
      value: parseFloat(value),
      reason,
    });
    onOpenChange(false);
    setValue("");
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
          <DialogDescription>
            Apply a percentage or fixed amount discount to this order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Discount Type</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Percentage
                  </div>
                </SelectItem>
                <SelectItem value="fixed">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Fixed Amount
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">
              {discountType === "percentage" ? "Percentage (%)" : "Amount (GH₵)"}
            </Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={discountType === "percentage" ? "10" : "5.00"}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Regular customer, Birthday"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Apply Discount</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
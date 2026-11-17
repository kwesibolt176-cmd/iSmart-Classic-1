import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";

interface PaymentPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceTotal: number;
  onPlanCreated: (plan: PaymentPlan) => void;
}

export interface PaymentPlan {
  numberOfInstallments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  firstPaymentDate: Date;
}

export const PaymentPlanDialog = ({ open, onOpenChange, invoiceTotal, onPlanCreated }: PaymentPlanDialogProps) => {
  const [numberOfInstallments, setNumberOfInstallments] = useState("3");
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [firstPaymentDate, setFirstPaymentDate] = useState<Date>();
  const { format: formatCurrency } = useCurrency();

  const installmentAmount = invoiceTotal / parseInt(numberOfInstallments || "1");

  const handleCreate = () => {
    if (!firstPaymentDate) return;
    
    onPlanCreated({
      numberOfInstallments: parseInt(numberOfInstallments),
      frequency,
      firstPaymentDate
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
          <DialogDescription>
            Set up an installment plan for this invoice. Total: {formatCurrency(invoiceTotal)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="installments">Number of Installments</Label>
            <Input
              id="installments"
              type="number"
              min="2"
              max="12"
              value={numberOfInstallments}
              onChange={(e) => setNumberOfInstallments(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {formatCurrency(installmentAmount)} per installment
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Payment Frequency</Label>
            <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>First Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {firstPaymentDate ? format(firstPaymentDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={firstPaymentDate}
                  onSelect={setFirstPaymentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!firstPaymentDate || !numberOfInstallments}>
            Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
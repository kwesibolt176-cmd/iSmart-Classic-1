import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Staff {
  id: string;
  name: string;
}

interface NewShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff[];
  onShiftAdded: () => void;
}

const NewShiftDialog = ({ open, onOpenChange, staff, onShiftAdded }: NewShiftDialogProps) => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: "",
    shift_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: 30,
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.staff_id) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('employee_shifts')
      .insert({
        user_id: user.id,
        staff_id: formData.staff_id,
        location_id: currentLocation?.id || null,
        shift_date: formData.shift_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        break_minutes: formData.break_minutes,
        notes: formData.notes || null,
        status: 'scheduled'
      });

    if (error) {
      console.error('Error creating shift:', error);
      toast({ title: "Failed to create shift", variant: "destructive" });
    } else {
      toast({ title: "Shift created successfully" });
      onShiftAdded();
      onOpenChange(false);
      setFormData({
        staff_id: "",
        shift_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: "09:00",
        end_time: "17:00",
        break_minutes: 30,
        notes: ""
      });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="staff">Staff Member</Label>
            <Select value={formData.staff_id} onValueChange={(v) => setFormData({ ...formData, staff_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="shift_date">Date</Label>
            <Input
              id="shift_date"
              type="date"
              value={formData.shift_date}
              onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="break_minutes">Break (minutes)</Label>
            <Input
              id="break_minutes"
              type="number"
              min="0"
              value={formData.break_minutes}
              onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.staff_id}>
              {isLoading ? "Creating..." : "Create Shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewShiftDialog;

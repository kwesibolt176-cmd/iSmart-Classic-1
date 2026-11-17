import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";

interface Staff {
  id: string;
  name: string;
}

interface StaffSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
}

export const StaffSelector = ({ value, onValueChange }: StaffSelectorProps) => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStaff();
    }
  }, [user?.id, currentLocation?.id]);

  const fetchStaff = async () => {
    try {
      let query = supabase
        .from('staff')
        .select('id, name')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('name');

      if (currentLocation) {
        query = query.eq('location_id', currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || staff.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="staff">Staff Member (Optional)</Label>
      <Select value={value || "none"} onValueChange={(val) => onValueChange(val === "none" ? null : val)}>
        <SelectTrigger id="staff">
          <SelectValue placeholder="Select staff member" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {staff.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes } from "date-fns";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeEntry {
  id: string;
  staffName: string;
  clockIn: string;
  clockOut?: string;
  hours?: number;
}

interface StaffMember {
  id: string;
  name: string;
}

export const TimeTrackingCard = () => {
  const { toast } = useToast();
  const { user } = useBusiness();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTimeEntries();
      fetchStaffMembers();
    }
  }, [user]);

  const fetchStaffMembers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('staff')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');
    
    if (!error && data) {
      setStaffMembers(data);
    }
  };

  const fetchTimeEntries = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          clock_in,
          clock_out,
          break_minutes,
          staff:staff_id (name)
        `)
        .eq('user_id', user.id)
        .gte('clock_in', `${today}T00:00:00`)
        .lte('clock_in', `${today}T23:59:59`)
        .order('clock_in', { ascending: false });

      if (error) throw error;

      const formattedEntries: TimeEntry[] = (data || []).map((entry: any) => {
        const clockIn = new Date(entry.clock_in);
        const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
        const breakMins = entry.break_minutes || 0;
        
        let hours: number | undefined;
        if (clockOut) {
          const totalMinutes = differenceInMinutes(clockOut, clockIn) - breakMins;
          hours = Math.round((totalMinutes / 60) * 10) / 10;
        }

        return {
          id: entry.id,
          staffName: entry.staff?.name || 'Unknown',
          clockIn: format(clockIn, 'h:mm a'),
          clockOut: clockOut ? format(clockOut, 'h:mm a') : undefined,
          hours
        };
      });

      setEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!user || !selectedStaffId) {
      toast({
        title: "Select Staff Member",
        description: "Please select a staff member to clock in.",
        variant: "destructive",
      });
      return;
    }

    setClockingIn(true);
    try {
      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          staff_id: selectedStaffId,
          clock_in: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Clocked In",
        description: "Staff member has been clocked in.",
      });
      fetchTimeEntries();
      setSelectedStaffId("");
    } catch (error) {
      console.error('Error clocking in:', error);
      toast({
        title: "Error",
        description: "Failed to clock in.",
        variant: "destructive",
      });
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !selectedStaffId) {
      toast({
        title: "Select Staff Member",
        description: "Please select a staff member to clock out.",
        variant: "destructive",
      });
      return;
    }

    setClockingOut(true);
    try {
      // Find active entry for this staff
      const today = new Date().toISOString().split('T')[0];
      const { data: activeEntry, error: findError } = await supabase
        .from('time_entries')
        .select('id')
        .eq('staff_id', selectedStaffId)
        .is('clock_out', null)
        .gte('clock_in', `${today}T00:00:00`)
        .single();

      if (findError || !activeEntry) {
        toast({
          title: "No Active Entry",
          description: "This staff member is not clocked in.",
          variant: "destructive",
        });
        setClockingOut(false);
        return;
      }

      const { error } = await supabase
        .from('time_entries')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', activeEntry.id);

      if (error) throw error;

      toast({
        title: "Clocked Out",
        description: "Staff member has been clocked out.",
      });
      fetchTimeEntries();
      setSelectedStaffId("");
    } catch (error) {
      console.error('Error clocking out:', error);
      toast({
        title: "Error",
        description: "Failed to clock out.",
        variant: "destructive",
      });
    } finally {
      setClockingOut(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger>
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staffMembers.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button onClick={handleClockIn} className="w-full gap-2" size="sm" disabled={clockingIn || !selectedStaffId}>
            {clockingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Clock In
          </Button>
          <Button onClick={handleClockOut} variant="outline" className="w-full gap-2" size="sm" disabled={clockingOut || !selectedStaffId}>
            {clockingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Clock Out
          </Button>
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <h4 className="font-semibold text-xs sm:text-sm text-foreground">Today's Shifts</h4>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No time entries today</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm truncate">{entry.staffName}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.clockIn} - {entry.clockOut || "Active"}
                  </p>
                </div>
                {entry.hours && (
                  <div className="text-right ml-2">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">{entry.hours}h</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

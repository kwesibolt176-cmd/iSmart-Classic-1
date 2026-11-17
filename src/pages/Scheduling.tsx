import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from "date-fns";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, Users } from "lucide-react";
import NewShiftDialog from "@/components/NewShiftDialog";
import { PageHeader } from "@/components/ui/PageHeader";

interface Shift {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes: string | null;
  status: string;
  staff?: {
    name: string;
  };
}

interface Staff {
  id: string;
  name: string;
}

const Scheduling = () => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [shiftsLoading, setShiftsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchShifts();
      fetchStaff();
    }
  }, [user?.id, weekStart, currentLocation]);

  const fetchShifts = async () => {
    if (!user) return;
    setShiftsLoading(true);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    let query = supabase
      .from('employee_shifts')
      .select(`*, staff:staff_id(name)`)
      .eq('user_id', user.id)
      .gte('shift_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('shift_date', format(weekEnd, 'yyyy-MM-dd'))
      .order('shift_date')
      .order('start_time');

    if (currentLocation?.id) {
      query = query.eq('location_id', currentLocation.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching shifts:', error);
      toast({ title: "Error loading shifts", variant: "destructive" });
    } else {
      setShifts(data || []);
    }
    setShiftsLoading(false);
  };

  const fetchStaff = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('staff')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!error && data) {
      setStaff(data);
    }
  };

  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 })
  });

  const getShiftsForDay = (date: Date) => {
    return shifts.filter(shift => shift.shift_date === format(date, 'yyyy-MM-dd'));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-[hsl(217_91%_60%)]';
      case 'completed': return 'bg-[hsl(217_91%_60%)]';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Employee Scheduling"
        description="Manage staff shifts and schedules"
        rightContent={
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Shift
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff</p>
                  <p className="text-2xl font-bold text-foreground">{staff.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-[hsl(217_91%_60%)]/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[hsl(217_91%_60%)]/10 rounded-xl">
                  <CalendarIcon className="h-6 w-6 text-[hsl(217_91%_60%)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Week</p>
                  <p className="text-2xl font-bold text-foreground">{shifts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-[hsl(217_91%_60%)]/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[hsl(217_91%_60%)]/10 rounded-xl">
                  <Clock className="h-6 w-6 text-[hsl(217_91%_60%)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</p>
                  <p className="text-2xl font-bold text-foreground">
                    {shifts.reduce((acc, shift) => {
                      const start = new Date(`2000-01-01T${shift.start_time}`);
                      const end = new Date(`2000-01-01T${shift.end_time}`);
                      const hours = (end.getTime() - start.getTime()) / 3600000 - (shift.break_minutes / 60);
                      return acc + hours;
                    }, 0).toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-yellow-500/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                  <List className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today</p>
                  <p className="text-2xl font-bold text-foreground">{getShiftsForDay(new Date()).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Week Schedule</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium text-center flex-1 sm:flex-none sm:min-w-[180px]">
                {format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {shiftsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading shifts...</div>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2">
                <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[600px]">
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="min-h-[150px] sm:min-h-[200px]">
                      <div className={`text-center p-1.5 sm:p-2 rounded-t-lg ${
                        format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <p className="text-[10px] sm:text-xs font-medium">{format(day, 'EEE')}</p>
                        <p className="text-sm sm:text-lg font-bold">{format(day, 'd')}</p>
                      </div>
                      <div className="border border-t-0 rounded-b-lg p-1 space-y-1 min-h-[110px] sm:min-h-[160px]">
                        {getShiftsForDay(day).map((shift) => (
                          <div
                            key={shift.id}
                            className={`p-1.5 sm:p-2 rounded text-[10px] sm:text-xs text-white ${getStatusColor(shift.status)}`}
                          >
                            <p className="font-medium truncate">{shift.staff?.name}</p>
                            <p className="hidden sm:block">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</p>
                            <p className="sm:hidden">{shift.start_time.slice(0, 5)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewShiftDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        staff={staff}
        onShiftAdded={fetchShifts}
      />
    </div>
  );
};

export default Scheduling;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, TrendingUp, Loader2, Calendar, Clock, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmployeeStats {
  staff_id: string;
  staff_name: string;
  total_sales: number;
  order_count: number;
  avg_order_value: number;
  rank: number;
}

interface TimeStats {
  staff_id: string;
  staff_name: string;
  hours_worked: number;
  shifts_count: number;
  rank: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Award className="w-6 h-6 text-amber-600" />;
    default:
      return <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{rank}</div>;
  }
};

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/30";
    case 2:
      return "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30";
    case 3:
      return "bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30";
    default:
      return "bg-muted/30 border-border";
  }
};

type TimePeriod = 'today' | 'week' | 'month';

export const EmployeeLeaderboard = () => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const { formatCurrency } = useCurrency();
  const [employees, setEmployees] = useState<EmployeeStats[]>([]);
  const [timeStats, setTimeStats] = useState<TimeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [user, currentLocation, timePeriod]);

  const getDateRange = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    const start = new Date(now);
    
    switch (timePeriod) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return { start, end };
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      const { start, end } = getDateRange();

      // Fetch sales data
      let salesQuery = supabase
        .from('transactions')
        .select('staff_id, amount, staff:staff_id(name)')
        .eq('user_id', user!.id)
        .gte('transaction_date', start.toISOString())
        .lte('transaction_date', end.toISOString())
        .eq('status', 'completed')
        .not('staff_id', 'is', null);

      if (currentLocation) {
        salesQuery = salesQuery.eq('location_id', currentLocation.id);
      }

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) throw salesError;

      const salesByStaff = salesData?.reduce((acc: Record<string, EmployeeStats>, txn: any) => {
        if (!txn.staff_id || !txn.staff) return acc;
        
        const staffId = txn.staff_id;
        if (!acc[staffId]) {
          acc[staffId] = {
            staff_id: staffId,
            staff_name: txn.staff.name,
            total_sales: 0,
            order_count: 0,
            avg_order_value: 0,
            rank: 0,
          };
        }
        acc[staffId].total_sales += Number(txn.amount);
        acc[staffId].order_count += 1;
        return acc;
      }, {});

      const salesArray = Object.values(salesByStaff || {})
        .map(emp => ({
          ...emp,
          avg_order_value: emp.order_count > 0 ? emp.total_sales / emp.order_count : 0,
        }))
        .sort((a, b) => b.total_sales - a.total_sales)
        .map((emp, index) => ({ ...emp, rank: index + 1 }));

      setEmployees(salesArray);

      // Fetch time tracking data
      const { data: timeData, error: timeError } = await supabase
        .from('time_entries')
        .select('staff_id, clock_in, clock_out, break_minutes, staff:staff_id(name)')
        .eq('user_id', user!.id)
        .gte('clock_in', start.toISOString())
        .lte('clock_in', end.toISOString())
        .not('clock_out', 'is', null) as any;

      if (timeError) throw timeError;

      const timeByStaff = timeData?.reduce((acc: Record<string, TimeStats>, entry: any) => {
        if (!entry.staff_id || !entry.staff) return acc;
        
        const staffId = entry.staff_id;
        if (!acc[staffId]) {
          acc[staffId] = {
            staff_id: staffId,
            staff_name: entry.staff.name,
            hours_worked: 0,
            shifts_count: 0,
            rank: 0,
          };
        }
        
        const clockIn = new Date(entry.clock_in);
        const clockOut = new Date(entry.clock_out);
        const breakMins = entry.break_minutes || 0;
        const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) - (breakMins / 60);
        
        acc[staffId].hours_worked += Math.max(0, hoursWorked);
        acc[staffId].shifts_count += 1;
        return acc;
      }, {});

      const timeArray = (Object.values(timeByStaff || {}) as TimeStats[])
        .sort((a, b) => b.hours_worked - a.hours_worked)
        .map((emp, index) => ({ ...emp, rank: index + 1 }));

      setTimeStats(timeArray);

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxSales = employees[0]?.total_sales || 1;
  const maxHours = timeStats[0]?.hours_worked || 1;

  // Calculate team stats
  const totalTeamSales = employees.reduce((sum, e) => sum + e.total_sales, 0);
  const totalTeamOrders = employees.reduce((sum, e) => sum + e.order_count, 0);
  const avgTeamOrderValue = totalTeamOrders > 0 ? totalTeamSales / totalTeamOrders : 0;
  const totalHoursWorked = timeStats.reduce((sum, t) => sum + t.hours_worked, 0);

  const periodLabel = timePeriod === 'today' ? "Today's" : timePeriod === 'week' ? "This Week's" : "This Month's";

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Staff Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Team Sales</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">{formatCurrency(totalTeamSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total Orders</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">{totalTeamOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Avg Order</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">{formatCurrency(avgTeamOrderValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Hours Worked</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">{totalHoursWorked.toFixed(1)}h</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Staff Performance
            </CardTitle>
            <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">{periodLabel} top performers</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Sales</span>
              </TabsTrigger>
              <TabsTrigger value="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Hours</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
              {employees.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No sales data available for {timePeriod === 'today' ? 'today' : `this ${timePeriod}`}
                </p>
              ) : (
                <div className="space-y-3">
                  {employees.map((employee) => {
                    const progressPercentage = (employee.total_sales / maxSales) * 100;
                    
                    return (
                      <div
                        key={employee.staff_id}
                        className={cn(
                          "relative p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02]",
                          getRankBadge(employee.rank)
                        )}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-shrink-0">
                            {getRankIcon(employee.rank)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {employee.staff_name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{employee.order_count} orders</span>
                              <span>•</span>
                              <span>Avg: {formatCurrency(employee.avg_order_value)}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-lg text-foreground">
                              {formatCurrency(employee.total_sales)}
                            </p>
                            {employee.rank <= 3 && (
                              <div className="flex items-center gap-1 text-xs text-green-500">
                                <TrendingUp className="w-3 h-3" />
                                <span>Top {employee.rank}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500 ease-out",
                              employee.rank === 1 
                                ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                                : employee.rank === 2
                                ? "bg-gradient-to-r from-gray-400 to-gray-500"
                                : employee.rank === 3
                                ? "bg-gradient-to-r from-amber-600 to-amber-700"
                                : "bg-gradient-to-r from-primary to-primary/80"
                            )}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="time">
              {timeStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No time tracking data available for {timePeriod === 'today' ? 'today' : `this ${timePeriod}`}
                </p>
              ) : (
                <div className="space-y-3">
                  {timeStats.map((staff) => {
                    const progressPercentage = (staff.hours_worked / maxHours) * 100;
                    
                    return (
                      <div
                        key={staff.staff_id}
                        className={cn(
                          "relative p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02]",
                          getRankBadge(staff.rank)
                        )}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-shrink-0">
                            {getRankIcon(staff.rank)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {staff.staff_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {staff.shifts_count} shifts completed
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-lg text-foreground">
                              {staff.hours_worked.toFixed(1)}h
                            </p>
                            {staff.rank <= 3 && (
                              <div className="flex items-center gap-1 text-xs text-blue-500">
                                <Calendar className="w-3 h-3" />
                                <span>Top {staff.rank}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-blue-600"
                            )}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

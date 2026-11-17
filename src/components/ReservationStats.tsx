import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reservation } from "@/pages/Reservations";
import { Users, CalendarCheck, Clock, XCircle, TrendingUp } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

interface ReservationStatsProps {
  reservations: Reservation[];
}

export const ReservationStats = ({ reservations }: ReservationStatsProps) => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const todayReservations = reservations.filter((r) => isToday(parseISO(r.date)));
  const tomorrowReservations = reservations.filter((r) => isTomorrow(parseISO(r.date)));
  const thisWeekReservations = reservations.filter((r) =>
    isWithinInterval(parseISO(r.date), { start: weekStart, end: weekEnd })
  );

  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
  const cancelledCount = reservations.filter((r) => r.status === "cancelled").length;
  const completedCount = reservations.filter((r) => r.status === "completed").length;

  const totalGuests = reservations.reduce((sum, r) => sum + r.guests, 0);
  const avgPartySize = reservations.length > 0 ? (totalGuests / reservations.length).toFixed(1) : 0;

  const noShowRate = completedCount + cancelledCount > 0
    ? ((cancelledCount / (completedCount + cancelledCount)) * 100).toFixed(1)
    : 0;

  // Peak times analysis
  const timeSlots: { [key: string]: number } = {};
  reservations.forEach((r) => {
    const hour = r.time.split(":")[0];
    timeSlots[hour] = (timeSlots[hour] || 0) + 1;
  });
  const peakHour = Object.entries(timeSlots).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    {
      label: "Today",
      value: todayReservations.length,
      sublabel: `${todayReservations.reduce((sum, r) => sum + r.guests, 0)} guests`,
      icon: CalendarCheck,
      color: "text-primary",
    },
    {
      label: "Tomorrow",
      value: tomorrowReservations.length,
      sublabel: `${tomorrowReservations.reduce((sum, r) => sum + r.guests, 0)} guests`,
      icon: Clock,
      color: "text-[hsl(217_91%_60%)]",
    },
    {
      label: "This Week",
      value: thisWeekReservations.length,
      sublabel: `${thisWeekReservations.reduce((sum, r) => sum + r.guests, 0)} total guests`,
      icon: Users,
      color: "text-emerald-500",
    },
    {
      label: "Cancellation Rate",
      value: `${noShowRate}%`,
      sublabel: `${cancelledCount} cancelled`,
      icon: XCircle,
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sublabel}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Party Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{avgPartySize}</p>
            <p className="text-xs text-muted-foreground">guests per reservation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Peak Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {peakHour ? `${peakHour[0]}:00` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">
              {peakHour ? `${peakHour[1]} reservations` : "No data yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reservations.length > 0
                ? `${((confirmedCount / reservations.length) * 100).toFixed(0)}%`
                : "0%"}
            </p>
            <p className="text-xs text-muted-foreground">{confirmedCount} confirmed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reservation } from "@/pages/Reservations";
import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface ReservationCalendarProps {
  reservations: Reservation[];
  onDateSelect: (date: Date) => void;
}

export const ReservationCalendar = ({ reservations, onDateSelect }: ReservationCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const getReservationsForDate = (date: Date) => {
    return reservations.filter((r) => isSameDay(parseISO(r.date), date));
  };

  const selectedDateReservations = selectedDate 
    ? getReservationsForDate(selectedDate) 
    : [];

  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) onDateSelect(date);
  };

  // Get dates that have reservations for highlighting
  const reservationDates = reservations.map((r) => parseISO(r.date));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            className="rounded-md border pointer-events-auto"
            modifiers={{
              hasReservation: reservationDates,
            }}
            modifiersStyles={{
              hasReservation: {
                fontWeight: "bold",
                textDecoration: "underline",
                color: "hsl(var(--primary))",
              },
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateReservations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No reservations for this date</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedDateReservations
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{reservation.guestName}</p>
                      <p className="text-sm text-muted-foreground">
                        {reservation.time} • {reservation.guests} guests
                      </p>
                    </div>
                    <Badge
                      variant={
                        reservation.status === "confirmed"
                          ? "default"
                          : reservation.status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {reservation.status}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

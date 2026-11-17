import { Calendar, Clock, Users, Phone, Mail, MapPin, FileText, CreditCard } from "lucide-react";
import { Reservation, ReservationStatus, DepositStatus } from "@/pages/Reservations";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ReservationDetails } from "@/components/ReservationDetails";
import { Badge } from "@/components/ui/badge";

interface ReservationCardProps {
  reservation: Reservation;
  onStatusChange?: () => void;
}

const statusConfig: Record<ReservationStatus, { bg: string; text: string; label: string }> = {
  confirmed: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-500",
    label: "Confirmed",
  },
  pending: {
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-500",
    label: "Pending",
  },
  cancelled: {
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-500",
    label: "Cancelled",
  },
  completed: {
    bg: "bg-muted/50 border-border",
    text: "text-muted-foreground",
    label: "Completed",
  },
};

export const ReservationCard = ({ reservation, onStatusChange }: ReservationCardProps) => {
  const config = statusConfig[reservation.status];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className={cn(
            "bg-card rounded-xl border-2 p-6 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 text-left hover:border-primary/30",
            config.bg
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">{reservation.guestName}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{reservation.guests} guests</span>
              </div>
            </div>
            <span
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold",
                config.text,
                "bg-background/50"
              )}
            >
              {config.label}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formatDate(reservation.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{reservation.time}</span>
            </div>
            {reservation.tableNumber && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>Table {reservation.tableNumber}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{reservation.phone}</span>
            </div>
          </div>

          {reservation.depositStatus && reservation.depositStatus !== "not_required" && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Deposit</span>
                </div>
                <Badge 
                  variant={reservation.depositStatus === "paid" ? "default" : reservation.depositStatus === "pending" ? "secondary" : "outline"}
                  className={cn(
                    reservation.depositStatus === "paid" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                    reservation.depositStatus === "pending" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                    reservation.depositStatus === "refunded" && "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  )}
                >
                  {reservation.depositStatus === "paid" ? "Paid" : reservation.depositStatus === "pending" ? "Pending" : "Refunded"}
                </Badge>
              </div>
            </div>
          )}

          {reservation.notes && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4 mt-0.5" />
                <span className="line-clamp-2">{reservation.notes}</span>
              </div>
            </div>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{reservation.guestName}</SheetTitle>
          <SheetDescription>Reservation details and actions</SheetDescription>
        </SheetHeader>
        <ReservationDetails reservation={reservation} onStatusChange={onStatusChange} />
      </SheetContent>
    </Sheet>
  );
};

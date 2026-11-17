import { useState, useEffect } from "react";
import { ReservationCard } from "@/components/ReservationCard";
import { ReservationFilters } from "@/components/ReservationFilters";
import { ReservationCalendar } from "@/components/ReservationCalendar";
import { ReservationStats } from "@/components/ReservationStats";
import { TableMapView } from "@/components/TableMapView";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, Calendar, BarChart3, Map } from "lucide-react";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { WaitlistManager } from "@/components/WaitlistManager";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { PageHeader } from "@/components/ui/PageHeader";

export type ReservationStatus = "confirmed" | "pending" | "cancelled" | "completed";

export type DepositStatus = "not_required" | "pending" | "paid" | "refunded";

export interface Reservation {
  id: string;
  guestName: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guests: number;
  tableNumber?: number;
  status: ReservationStatus;
  notes?: string;
  depositType?: "fixed" | "percentage" | null;
  depositAmount?: number;
  depositPercentage?: number;
  depositStatus?: DepositStatus;
  depositPaidAmount?: number;
  depositPaidAt?: string;
  depositPaymentMethod?: string;
  depositPaymentLink?: string;
}

export const Reservations = () => {
  const { user } = useBusiness();
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | "all">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    if (user) {
      fetchReservations();
    }
  }, [user?.id]);

  const fetchReservations = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("user_id", user.id)
      .order("reservation_date", { ascending: true });

    if (!error && data) {
      setReservations(data.map(r => ({
        id: r.id,
        guestName: r.customer_name,
        phone: r.customer_phone || "",
        email: r.customer_email || undefined,
        date: r.reservation_date,
        time: r.reservation_time,
        guests: r.party_size,
        tableNumber: undefined,
        status: r.status as ReservationStatus,
        notes: r.notes || undefined,
        depositType: r.deposit_type as "fixed" | "percentage" | null,
        depositAmount: r.deposit_amount || 0,
        depositPercentage: r.deposit_percentage || 0,
        depositStatus: (r.deposit_status || "not_required") as DepositStatus,
        depositPaidAmount: r.deposit_paid_amount || 0,
        depositPaidAt: r.deposit_paid_at || undefined,
        depositPaymentMethod: r.deposit_payment_method || undefined,
        depositPaymentLink: r.deposit_payment_link || undefined,
      })));
    }
    setLoading(false);
  };

  const handleReservationAdded = () => {
    fetchReservations();
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (filterStatus === "all") return true;
    return reservation.status === filterStatus;
  });

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    pending: reservations.filter((r) => r.status === "pending").length,
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading reservations...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Reservations"
        description={`${stats.confirmed} confirmed ${stats.pending} pending ${stats.total} total`}
        rightContent={
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Reservation</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card/50 border border-border/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="list" className="gap-2 min-h-[40px] data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 font-semibold">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2 min-h-[40px] data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 font-semibold">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="tables" className="gap-2 min-h-[40px] data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 font-semibold">
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Tables</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 min-h-[40px] data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 font-semibold">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <ReservationFilters filterStatus={filterStatus} onFilterChange={setFilterStatus} />
            
            <div className="grid grid-cols-1 2xl:grid-cols-4 gap-6">
              <div className="2xl:col-span-1">
                <WaitlistManager />
              </div>
              <div className="2xl:col-span-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {filteredReservations.map((reservation) => (
                    <ReservationCard key={reservation.id} reservation={reservation} onStatusChange={fetchReservations} />
                  ))}
                </div>

                {filteredReservations.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground text-lg">No reservations found</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <ReservationCalendar 
              reservations={reservations} 
              onDateSelect={setSelectedDate}
            />
          </TabsContent>

          <TabsContent value="tables">
            <TableMapView 
              reservations={reservations} 
              selectedDate={selectedDate}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <ReservationStats reservations={reservations} />
          </TabsContent>
        </Tabs>
      </div>

      <NewReservationDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onReservationAdded={handleReservationAdded}
      />
    </div>
  );
};

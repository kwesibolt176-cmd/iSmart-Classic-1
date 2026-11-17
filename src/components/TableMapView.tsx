import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reservation } from "@/pages/Reservations";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, parseISO } from "date-fns";

interface Table {
  id: string;
  table_number: number;
  capacity: number;
  status: string;
  section?: string;
}

interface TableMapViewProps {
  reservations: Reservation[];
  selectedDate: Date;
}

export const TableMapView = ({ reservations, selectedDate }: TableMapViewProps) => {
  const { user } = useBusiness();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  useEffect(() => {
    if (user) fetchTables();
  }, [user]);

  const fetchTables = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("user_id", user.id)
      .order("table_number", { ascending: true });

    if (!error && data) {
      setTables(data);
    }
    setLoading(false);
  };

  // Filter reservations for selected date
  const dateReservations = reservations.filter(
    (r) => format(parseISO(r.date), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
  );

  // Group tables by section
  const sections = tables.reduce((acc, table) => {
    const section = table.section || "Main";
    if (!acc[section]) acc[section] = [];
    acc[section].push(table);
    return acc;
  }, {} as Record<string, Table[]>);

  const getTableStatus = (table: Table) => {
    const hasReservation = dateReservations.some((r) => r.tableNumber === table.table_number);
    if (hasReservation) return "reserved";
    return table.status;
  };

  const getTableReservation = (table: Table) => {
    return dateReservations.find((r) => r.tableNumber === table.table_number);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No tables configured. Add tables in the Tables page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {Object.entries(sections).map(([sectionName, sectionTables]) => (
          <Card key={sectionName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{sectionName} Section</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {sectionTables.map((table) => {
                  const status = getTableStatus(table);
                  const reservation = getTableReservation(table);
                  
                  return (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      className={cn(
                        "relative aspect-square rounded-xl border-2 p-2 flex flex-col items-center justify-center transition-all hover:scale-105",
                        status === "available" && "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800",
                        status === "occupied" && "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
                        status === "reserved" && "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
                        selectedTable?.id === table.id && "ring-2 ring-primary"
                      )}
                    >
                      <span className="text-lg font-bold">{table.table_number}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {table.capacity}
                      </div>
                      {reservation && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-200 dark:bg-emerald-800" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-200 dark:bg-amber-800" />
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-200 dark:bg-blue-800" />
            <span>Reserved</span>
          </div>
        </div>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {selectedTable ? `Table ${selectedTable.table_number}` : "Select a Table"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTable ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="font-medium">{selectedTable.capacity} guests</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        getTableStatus(selectedTable) === "available"
                          ? "outline"
                          : getTableStatus(selectedTable) === "reserved"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {getTableStatus(selectedTable)}
                    </Badge>
                  </div>
                </div>

                {getTableReservation(selectedTable) && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Today's Reservation</p>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="font-medium">{getTableReservation(selectedTable)?.guestName}</p>
                      <p className="text-sm text-muted-foreground">
                        {getTableReservation(selectedTable)?.time} • {getTableReservation(selectedTable)?.guests} guests
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Click a table to view details
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

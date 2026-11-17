import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { Users } from "lucide-react";

interface Table {
  id: string;
  table_number: number;
  capacity: number;
  section: string | null;
  status: string;
}

interface TableSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
}

export const TableSelector = ({ value, onValueChange }: TableSelectorProps) => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTables();
    }
  }, [user, currentLocation]);

  const fetchTables = async () => {
    try {
      let query = supabase
        .from("restaurant_tables")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "available") // Only show available tables
        .order("table_number");

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Table (Optional)</Label>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  if (tables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="table" className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        Table (Optional)
      </Label>
      <Select value={value || "none"} onValueChange={(val) => onValueChange(val === "none" ? null : val)}>
        <SelectTrigger id="table">
          <SelectValue placeholder="Select table" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Table</SelectItem>
          {tables.map((table) => (
            <SelectItem key={table.id} value={table.id}>
              Table #{table.table_number}
              {table.section && ` (${table.section})`}
              {" • "}
              {table.capacity} seats
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

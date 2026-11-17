import { ReservationStatus } from "@/pages/Reservations";
import { Button } from "@/components/ui/button";

interface ReservationFiltersProps {
  filterStatus: ReservationStatus | "all";
  onFilterChange: (status: ReservationStatus | "all") => void;
}

const filters: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
];

export const ReservationFilters = ({ filterStatus, onFilterChange }: ReservationFiltersProps) => {
  return (
    <div className="flex gap-1 sm:gap-2 bg-card border border-border rounded-xl p-1 overflow-x-auto">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          variant={filterStatus === filter.value ? "default" : "ghost"}
          size="sm"
          className="transition-all whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4"
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};

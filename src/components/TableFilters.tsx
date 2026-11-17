import { TableStatus } from "@/pages/Tables";
import { Button } from "@/components/ui/button";

interface TableFiltersProps {
  filterStatus: TableStatus | "all";
  onFilterChange: (status: TableStatus | "all") => void;
}

const filters: { value: TableStatus | "all"; label: string }[] = [
  { value: "all", label: "All Tables" },
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
];

export const TableFilters = ({ filterStatus, onFilterChange }: TableFiltersProps) => {
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
          <span className="hidden sm:inline">{filter.label}</span>
          <span className="sm:hidden">{filter.value === "all" ? "All" : filter.label}</span>
        </Button>
      ))}
    </div>
  );
};

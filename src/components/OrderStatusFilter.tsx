import { OrderStatus } from "@/pages/Orders";
import { Button } from "@/components/ui/button";

interface OrderStatusFilterProps {
  filterStatus: OrderStatus | "all";
  onFilterChange: (status: OrderStatus | "all") => void;
}

const filters: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
];

export const OrderStatusFilter = ({ filterStatus, onFilterChange }: OrderStatusFilterProps) => {
  return (
    <div className="flex gap-2 bg-muted/50 border-2 border-border rounded-xl p-1.5 overflow-x-auto shadow-inner">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          variant={filterStatus === filter.value ? "default" : "ghost"}
          size="sm"
          className="whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 h-9"
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};

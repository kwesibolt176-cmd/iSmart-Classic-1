import { useState } from "react";
import { Search, Calendar, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrderFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  orderType: string;
  onOrderTypeChange: (value: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onClearFilters: () => void;
}

export const OrderFilters = ({
  searchQuery,
  onSearchChange,
  orderType,
  onOrderTypeChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
}: OrderFiltersProps) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  
  const hasActiveFilters = searchQuery || orderType !== "all" || dateRange.from || dateRange.to;
  const activeFilterCount = [
    searchQuery,
    orderType !== "all" ? orderType : null,
    dateRange.from || dateRange.to,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search order number..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-card/50 border-border/50"
        />
      </div>

      {/* Order Type */}
      <Select value={orderType} onValueChange={onOrderTypeChange}>
        <SelectTrigger className="w-full sm:w-[150px] bg-card/50 border-border/50">
          <SelectValue placeholder="Order Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="dine_in">Dine In</SelectItem>
          <SelectItem value="pickup">Pickup</SelectItem>
          <SelectItem value="delivery">Delivery</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range */}
      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full sm:w-auto justify-start text-left bg-card/50 border-border/50",
              (dateRange.from || dateRange.to) && "text-primary border-primary/50"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {dateRange.from ? (
              dateRange.to ? (
                <span className="truncate">
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                </span>
              ) : (
                format(dateRange.from, "MMM d, yyyy")
              )
            ) : (
              "Date Range"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              onDateRangeChange({ from: range?.from, to: range?.to });
              if (range?.to) setIsDateOpen(false);
            }}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Clear
          <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>
  );
};

import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { SortOption } from "@/hooks/use-product-discovery";

interface ProductDiscoveryBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalProducts: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export const ProductDiscoveryBar = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  totalProducts,
  filteredCount,
  hasActiveFilters,
  onResetFilters,
}: ProductDiscoveryBarProps) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange("")}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="name-asc">Name: A to Z</SelectItem>
            <SelectItem value="name-desc">Name: Z to A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => onCategoryChange("all")}
            >
              All Products
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Results Count & Clear Filters */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredCount} of {totalProducts} products
        </span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="gap-1 h-7 text-xs"
          >
            <X className="w-3 h-3" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};

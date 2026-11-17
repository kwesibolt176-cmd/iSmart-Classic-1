import { useState, useMemo } from "react";

export type SortOption = "newest" | "price-low" | "price-high" | "name-asc" | "name-desc";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  quantity: number;
  slug: string | null;
  category_name?: string;
  created_at?: string;
}

interface UseProductDiscoveryProps {
  products: Product[];
}

export const useProductDiscovery = ({ products }: UseProductDiscoveryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Extract unique categories from products
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach((p) => {
      if (p.category_name) {
        categorySet.add(p.category_name);
      }
    });
    return Array.from(categorySet).sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category_name === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
      default:
        // Keep original order (assumed newest first from API)
        break;
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("newest");
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    categories,
    filteredProducts,
    resetFilters,
    hasActiveFilters: searchQuery !== "" || selectedCategory !== "all" || sortBy !== "newest",
  };
};

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Building2,
  User,
  ShoppingBag,
  FileText,
  CreditCard,
  X,
  Loader2,
} from "lucide-react";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface SearchResult {
  id: string;
  type: "business" | "user" | "order" | "invoice" | "subscription";
  title: string;
  subtitle: string;
  metadata?: Record<string, string>;
}

const typeConfig = {
  business: { icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
  user: { icon: User, color: "text-purple-500", bg: "bg-purple-500/10" },
  order: { icon: ShoppingBag, color: "text-green-500", bg: "bg-green-500/10" },
  invoice: { icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
  subscription: { icon: CreditCard, color: "text-indigo-500", bg: "bg-indigo-500/10" },
};

interface GlobalSearchPanelProps {
  onNavigate?: (tab: string, id?: string) => void;
}

export const GlobalSearchPanel = ({ onNavigate }: GlobalSearchPanelProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search businesses
      const { data: businesses } = await supabase
        .from("business_profiles")
        .select("id, business_name, business_email, industry")
        .or(`business_name.ilike.%${searchQuery}%,business_email.ilike.%${searchQuery}%`)
        .limit(5);

      businesses?.forEach((b) => {
        searchResults.push({
          id: b.id,
          type: "business",
          title: b.business_name,
          subtitle: b.business_email || "No email",
          metadata: { industry: b.industry },
        });
      });

      // Search orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, total, status, customer_phone")
        .or(`order_number.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`)
        .limit(5);

      orders?.forEach((o) => {
        searchResults.push({
          id: o.id,
          type: "order",
          title: o.order_number || `Order ${o.id.slice(0, 8)}`,
          subtitle: `GH₵${o.total?.toFixed(2) || "0.00"} - ${o.status}`,
          metadata: { status: o.status },
        });
      });

      // Search invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, customer_name, total, status")
        .or(`invoice_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%`)
        .limit(5);

      invoices?.forEach((i) => {
        searchResults.push({
          id: i.id,
          type: "invoice",
          title: i.invoice_number,
          subtitle: `${i.customer_name} - GH₵${i.total?.toFixed(2) || "0.00"}`,
          metadata: { status: i.status },
        });
      });

      // Search subscriptions (join with subscription_plans to get plan name)
      const { data: subs } = await supabase
        .from("user_subscriptions")
        .select("id, status, plan_id, subscription_plans(name)")
        .eq("status", searchQuery.toLowerCase() === "active" || searchQuery.toLowerCase() === "trialing" ? searchQuery.toLowerCase() : "active")
        .limit(5);

      subs?.forEach((s: any) => {
        searchResults.push({
          id: s.id,
          type: "subscription",
          title: s.subscription_plans?.name || "Subscription",
          subtitle: s.status,
          metadata: { status: s.status },
        });
      });

      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (onNavigate) {
      const tabMap: Record<string, string> = {
        business: "businesses",
        user: "users",
        order: "orders",
        invoice: "invoices",
        subscription: "subscriptions",
      };
      onNavigate(tabMap[result.type], result.id);
    }
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search businesses, orders, invoices... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-10 bg-muted/50"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {results.map((result) => {
                const config = typeConfig[result.type];
                const Icon = config.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                  >
                    <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{result.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0">
                      {result.type}
                    </Badge>
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
};

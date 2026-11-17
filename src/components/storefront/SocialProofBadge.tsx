import { Badge } from "@/components/ui/badge";
import { Users, Flame, TrendingUp, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeType = 'popular' | 'trending' | 'bestseller' | 'new' | 'limited' | 'viewed';

interface SocialProofBadgeProps {
  type: BadgeType;
  value?: number;
  className?: string;
}

const badgeConfig: Record<BadgeType, { icon: React.ReactNode; label: string; colors: string }> = {
  popular: {
    icon: <Users className="w-3 h-3" />,
    label: 'Popular',
    colors: 'bg-blue-500/10 text-blue-600 border-blue-200'
  },
  trending: {
    icon: <TrendingUp className="w-3 h-3" />,
    label: 'Trending',
    colors: 'bg-purple-500/10 text-purple-600 border-purple-200'
  },
  bestseller: {
    icon: <Flame className="w-3 h-3" />,
    label: 'Best Seller',
    colors: 'bg-orange-500/10 text-orange-600 border-orange-200'
  },
  new: {
    icon: <Star className="w-3 h-3" />,
    label: 'New',
    colors: 'bg-green-500/10 text-green-600 border-green-200'
  },
  limited: {
    icon: <Clock className="w-3 h-3" />,
    label: 'Limited',
    colors: 'bg-red-500/10 text-red-600 border-red-200'
  },
  viewed: {
    icon: <Users className="w-3 h-3" />,
    label: 'people viewing',
    colors: 'bg-amber-500/10 text-amber-600 border-amber-200'
  }
};

export const SocialProofBadge = ({ type, value, className }: SocialProofBadgeProps) => {
  const config = badgeConfig[type];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1 text-xs font-medium animate-in fade-in duration-300",
        config.colors,
        className
      )}
    >
      {config.icon}
      {type === 'viewed' && value ? `${value} ${config.label}` : config.label}
    </Badge>
  );
};

// Helper to determine badge type based on product data
export const getProductBadgeType = (product: {
  created_at?: string;
  stock_quantity?: number | null;
  sales_count?: number;
}): BadgeType | null => {
  // New products (within last 7 days)
  if (product.created_at) {
    const createdDate = new Date(product.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (createdDate > weekAgo) return 'new';
  }

  // Low stock
  if (product.stock_quantity !== null && product.stock_quantity > 0 && product.stock_quantity <= 5) {
    return 'limited';
  }

  // Best sellers
  if (product.sales_count && product.sales_count > 50) {
    return 'bestseller';
  }

  // Popular
  if (product.sales_count && product.sales_count > 20) {
    return 'popular';
  }

  return null;
};

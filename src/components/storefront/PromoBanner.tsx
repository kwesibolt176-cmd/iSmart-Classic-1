import { useState, useEffect } from "react";
import { X, Tag, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";

interface PromoCodeData {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  message: string | null;
  variant: string;
  expires_at: string | null;
}

interface PromoBannerProps {
  userId: string;
}

export const PromoBanner = ({ userId }: PromoBannerProps) => {
  const [promo, setPromo] = useState<PromoCodeData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const { format: formatCurrency } = useCurrency();

  useEffect(() => {
    fetchActivePromo();
  }, [userId]);

  const fetchActivePromo = async () => {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("id, code, discount_type, discount_value, message, variant, expires_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("show_on_storefront", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setPromo(data);
      }
    } catch (error) {
      console.error("Error fetching promo:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !promo || !isVisible) return null;

  const getVariantStyles = () => {
    switch (promo.variant) {
      case 'flash':
        return 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white';
      case 'seasonal':
        return 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white';
      default:
        return 'bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground';
    }
  };

  const formatTimeLeft = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  };

  const discount = promo.discount_type === "percentage" 
    ? `${promo.discount_value}%` 
    : formatCurrency(promo.discount_value);

  const timeLeft = promo.expires_at ? formatTimeLeft(promo.expires_at) : null;

  return (
    <div className={`relative overflow-hidden ${getVariantStyles()}`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3),transparent_50%)]" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {promo.variant === 'flash' && (
            <Badge variant="outline" className="bg-white/20 border-white/30 text-white animate-pulse">
              <Sparkles className="w-3 h-3 mr-1" />
              Flash Sale
            </Badge>
          )}
          
          <div className="flex items-center gap-2 text-sm md:text-base font-medium">
            <Tag className="w-4 h-4" />
            <span>Use code</span>
            <code className="px-2 py-0.5 bg-white/20 rounded font-bold tracking-wider">
              {promo.code}
            </code>
            <span>for</span>
            <span className="font-bold text-lg">{discount}</span>
            {promo.message && <span>{promo.message}</span>}
          </div>

          {timeLeft && (
            <Badge variant="outline" className="bg-white/20 border-white/30 text-inherit">
              <Clock className="w-3 h-3 mr-1" />
              {timeLeft}
            </Badge>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-inherit hover:bg-white/20"
        onClick={() => setIsVisible(false)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

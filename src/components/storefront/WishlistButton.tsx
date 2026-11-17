import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  isInWishlist: boolean;
  onToggle: () => void;
  size?: "sm" | "default" | "icon";
  className?: string;
}

export const WishlistButton = ({
  isInWishlist,
  onToggle,
  size = "icon",
  className
}: WishlistButtonProps) => {
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "transition-all duration-300",
        isInWishlist && "text-red-500 hover:text-red-600",
        className
      )}
    >
      <Heart 
        className={cn(
          "w-5 h-5 transition-all",
          isInWishlist && "fill-current scale-110"
        )} 
      />
    </Button>
  );
};

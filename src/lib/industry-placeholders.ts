import { 
  UtensilsCrossed, 
  Package, 
  Scissors, 
  Sparkles, 
  Car, 
  Wrench,
  ShoppingCart,
  Coffee,
  Cake,
  Wine,
  Leaf,
  Shirt,
  Gift,
  Heart,
  Dumbbell,
  Home,
  PawPrint,
  Briefcase,
  Truck,
  LucideIcon
} from "lucide-react";

export interface PlaceholderConfig {
  icon: LucideIcon;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
}

export const getIndustryPlaceholder = (industry: string | undefined): PlaceholderConfig => {
  switch (industry) {
    // Food & Beverage
    case 'restaurant':
    case 'full_service_restaurant':
    case 'quick_service':
    case 'franchise':
    case 'bar_brewery':
      return { 
        icon: UtensilsCrossed, 
        emoji: '🍽️',
        gradientFrom: 'from-orange-500/10',
        gradientTo: 'to-red-500/10',
        iconColor: 'text-orange-500/50'
      };
    case 'food_truck':
      return { 
        icon: Truck, 
        emoji: '🚚',
        gradientFrom: 'from-orange-500/10',
        gradientTo: 'to-yellow-500/10',
        iconColor: 'text-orange-500/50'
      };
    case 'bakery':
      return { 
        icon: Cake, 
        emoji: '🧁',
        gradientFrom: 'from-pink-500/10',
        gradientTo: 'to-rose-500/10',
        iconColor: 'text-pink-500/50'
      };
    case 'coffee_shop':
      return { 
        icon: Coffee, 
        emoji: '☕',
        gradientFrom: 'from-amber-500/10',
        gradientTo: 'to-brown-500/10',
        iconColor: 'text-amber-700/50'
      };
    case 'catering':
      return { 
        icon: UtensilsCrossed, 
        emoji: '🍴',
        gradientFrom: 'from-orange-500/10',
        gradientTo: 'to-amber-500/10',
        iconColor: 'text-orange-500/50'
      };
    case 'bar':
    case 'wine_liquor':
      return { 
        icon: Wine, 
        emoji: '🍷',
        gradientFrom: 'from-purple-500/10',
        gradientTo: 'to-red-500/10',
        iconColor: 'text-purple-500/50'
      };

    // Retail
    case 'retail':
    case 'grocery':
      return { 
        icon: ShoppingCart, 
        emoji: '🛒',
        gradientFrom: 'from-blue-500/10',
        gradientTo: 'to-indigo-500/10',
        iconColor: 'text-blue-500/50'
      };
    case 'clothing':
      return { 
        icon: Shirt, 
        emoji: '👕',
        gradientFrom: 'from-indigo-500/10',
        gradientTo: 'to-purple-500/10',
        iconColor: 'text-indigo-500/50'
      };
    case 'home_gift':
      return { 
        icon: Gift, 
        emoji: '🎁',
        gradientFrom: 'from-pink-500/10',
        gradientTo: 'to-purple-500/10',
        iconColor: 'text-pink-500/50'
      };
    case 'garden':
      return { 
        icon: Leaf, 
        emoji: '🌿',
        gradientFrom: 'from-green-500/10',
        gradientTo: 'to-emerald-500/10',
        iconColor: 'text-green-500/50'
      };

    // Beauty
    case 'salon':
    case 'barbershop':
    case 'hair_salon':
    case 'nail_salon':
    case 'tattoo_piercing':
      return { 
        icon: Scissors, 
        emoji: '✂️',
        gradientFrom: 'from-purple-500/10',
        gradientTo: 'to-pink-500/10',
        iconColor: 'text-purple-500/50'
      };
    case 'beauty_salon':
      return { 
        icon: Sparkles, 
        emoji: '💄',
        gradientFrom: 'from-pink-500/10',
        gradientTo: 'to-rose-500/10',
        iconColor: 'text-pink-500/50'
      };

    // Health & Wellness
    case 'spa':
    case 'med_spa':
    case 'day_spa':
      return { 
        icon: Sparkles, 
        emoji: '🧖',
        gradientFrom: 'from-teal-500/10',
        gradientTo: 'to-cyan-500/10',
        iconColor: 'text-teal-500/50'
      };
    case 'fitness':
      return { 
        icon: Dumbbell, 
        emoji: '💪',
        gradientFrom: 'from-red-500/10',
        gradientTo: 'to-orange-500/10',
        iconColor: 'text-red-500/50'
      };
    case 'healthcare':
    case 'cbd':
      return { 
        icon: Heart, 
        emoji: '❤️',
        gradientFrom: 'from-red-500/10',
        gradientTo: 'to-pink-500/10',
        iconColor: 'text-red-500/50'
      };

    // Home & Commercial Services
    case 'cleaning':
    case 'contractors':
    case 'landscaping':
      return { 
        icon: Home, 
        emoji: '🏠',
        gradientFrom: 'from-green-500/10',
        gradientTo: 'to-emerald-500/10',
        iconColor: 'text-green-500/50'
      };

    // Services
    case 'automotive':
    case 'transportation':
      return { 
        icon: Car, 
        emoji: '🚗',
        gradientFrom: 'from-slate-500/10',
        gradientTo: 'to-gray-500/10',
        iconColor: 'text-slate-500/50'
      };
    case 'pet_services':
      return { 
        icon: PawPrint, 
        emoji: '🐾',
        gradientFrom: 'from-amber-500/10',
        gradientTo: 'to-orange-500/10',
        iconColor: 'text-amber-500/50'
      };
    case 'professional_services':
    case 'nonprofits':
      return { 
        icon: Briefcase, 
        emoji: '💼',
        gradientFrom: 'from-blue-500/10',
        gradientTo: 'to-indigo-500/10',
        iconColor: 'text-blue-500/50'
      };
    case 'recreation':
      return { 
        icon: Sparkles, 
        emoji: '🎮',
        gradientFrom: 'from-violet-500/10',
        gradientTo: 'to-purple-500/10',
        iconColor: 'text-violet-500/50'
      };

    default:
      return { 
        icon: Package, 
        emoji: '📦',
        gradientFrom: 'from-primary/10',
        gradientTo: 'to-secondary/10',
        iconColor: 'text-muted-foreground'
      };
  }
};

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UtensilsCrossed, ShoppingBag, Bike, Store, Scissors, Calendar, 
  Wrench, Car, Dumbbell, Home, PawPrint, Briefcase, LucideIcon
} from "lucide-react";

export type OrderType = "dine-in" | "takeout" | "delivery";

interface OrderTypeSelectorProps {
  value: OrderType;
  onValueChange: (value: OrderType) => void;
  industry?: string;
}

// Food & beverage related industries that have dine-in option
const foodIndustries = [
  "restaurant", "bakery", "bar_brewery", "catering", "coffee_shop", 
  "food_truck", "franchise", "full_service_restaurant", "quick_service"
];

// Get industry-specific icons and labels for order types
const getOrderTypeConfig = (industry: string): { 
  dineIn: { label: string; icon: LucideIcon };
  pickup: { label: string; icon: LucideIcon };
  delivery: { label: string; icon: LucideIcon };
} => {
  switch (industry) {
    // Food & Beverage
    case 'restaurant':
    case 'full_service_restaurant':
    case 'quick_service':
    case 'bakery':
    case 'coffee_shop':
    case 'food_truck':
    case 'franchise':
    case 'bar_brewery':
    case 'catering':
      return {
        dineIn: { label: "Dine In", icon: UtensilsCrossed },
        pickup: { label: "Takeout", icon: ShoppingBag },
        delivery: { label: "Delivery", icon: Bike },
      };
    
    // Beauty & Wellness
    case 'salon':
    case 'barbershop':
    case 'hair_salon':
    case 'nail_salon':
    case 'beauty_salon':
    case 'tattoo_piercing':
      return {
        dineIn: { label: "Walk-in", icon: Scissors },
        pickup: { label: "Appointment", icon: Calendar },
        delivery: { label: "Mobile", icon: Car },
      };
    
    // Spa & Fitness
    case 'spa':
    case 'med_spa':
    case 'day_spa':
    case 'fitness':
    case 'healthcare':
    case 'cbd':
      return {
        dineIn: { label: "In-Person", icon: Dumbbell },
        pickup: { label: "Appointment", icon: Calendar },
        delivery: { label: "Home Visit", icon: Home },
      };
    
    // Automotive & Transport
    case 'automotive':
    case 'transportation':
      return {
        dineIn: { label: "Drop-off", icon: Car },
        pickup: { label: "Scheduled", icon: Calendar },
        delivery: { label: "Mobile", icon: Wrench },
      };
    
    // Home Services
    case 'cleaning':
    case 'contractors':
    case 'landscaping':
      return {
        dineIn: { label: "On-site", icon: Home },
        pickup: { label: "Scheduled", icon: Calendar },
        delivery: { label: "Emergency", icon: Wrench },
      };
    
    // Pet Services
    case 'pet_services':
      return {
        dineIn: { label: "Drop-off", icon: PawPrint },
        pickup: { label: "Appointment", icon: Calendar },
        delivery: { label: "Home Visit", icon: Home },
      };
    
    // Professional Services
    case 'services':
    case 'professional_services':
    case 'nonprofit':
      return {
        dineIn: { label: "In-Office", icon: Briefcase },
        pickup: { label: "Appointment", icon: Calendar },
        delivery: { label: "Remote", icon: Home },
      };
    
    // Recreation
    case 'recreation':
      return {
        dineIn: { label: "Walk-in", icon: Store },
        pickup: { label: "Booking", icon: Calendar },
        delivery: { label: "Delivery", icon: Bike },
      };
    
    // Default Retail
    default:
      return {
        dineIn: { label: "In-Store", icon: Store },
        pickup: { label: "Pickup", icon: Store },
        delivery: { label: "Delivery", icon: Bike },
      };
  }
};

export const OrderTypeSelector = ({ value, onValueChange, industry = "retail" }: OrderTypeSelectorProps) => {
  // Food & beverage industries show: Dine In, Pickup (Takeout), Delivery
  // Other businesses show: Pickup, Delivery
  const isRestaurant = foodIndustries.includes(industry);
  const config = getOrderTypeConfig(industry);

  const options = isRestaurant
    ? [
        { value: "dine-in" as OrderType, label: config.dineIn.label, icon: config.dineIn.icon },
        { value: "takeout" as OrderType, label: config.pickup.label, icon: config.pickup.icon },
        { value: "delivery" as OrderType, label: config.delivery.label, icon: config.delivery.icon },
      ]
    : [
        { value: "takeout" as OrderType, label: config.pickup.label, icon: config.pickup.icon },
        { value: "delivery" as OrderType, label: config.delivery.label, icon: config.delivery.icon },
      ];

  // Ensure valid value for current industry
  const effectiveValue = isRestaurant 
    ? value 
    : (value === "dine-in" ? "takeout" : value);

  return (
    <Tabs value={effectiveValue} onValueChange={onValueChange as any} className="w-full">
      <TabsList className={`grid w-full ${isRestaurant ? 'grid-cols-3' : 'grid-cols-2'} h-12 bg-muted/50 p-1`}>
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className="gap-2 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20"
          >
            <option.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{option.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
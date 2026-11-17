import { OrderStatus } from "@/pages/Orders";
import { cn } from "@/lib/utils";
import { 
  Clock, ChefHat, CheckCircle, Utensils, Package, 
  Calendar, Scissors, Sparkles, Wrench, Car, 
  ClipboardCheck, Truck, ShoppingBag, UserCheck,
  Timer, CheckCheck
} from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { 
  isFoodIndustry, 
  isBeautyIndustry, 
  isWellnessIndustry, 
  isAutomotiveIndustry, 
  isHomeServiceIndustry,
  isRetailIndustry,
  getOrderStatusLabels 
} from "@/lib/industry-config";

interface OrderTimelineProps {
  status: OrderStatus;
  createdAt: string;
}

// Industry-specific status configurations
const getStatusSteps = (industry?: string): { 
  status: OrderStatus; 
  label: string; 
  icon: React.ComponentType<{ className?: string }> 
}[] => {
  // Food & Beverage
  if (isFoodIndustry(industry)) {
    return [
      { status: "pending", label: "New", icon: Clock },
      { status: "processing", label: "Processing", icon: ChefHat },
      { status: "ready", label: "Ready", icon: Package },
      { status: "served", label: "Served", icon: Utensils },
      { status: "completed", label: "Completed", icon: CheckCircle },
    ];
  }
  
  // Beauty Services
  if (isBeautyIndustry(industry)) {
    return [
      { status: "pending", label: "Scheduled", icon: Calendar },
      { status: "processing", label: "In Progress", icon: Scissors },
      { status: "ready", label: "Finishing", icon: Sparkles },
      { status: "served", label: "Done", icon: CheckCheck },
      { status: "completed", label: "Completed", icon: CheckCircle },
    ];
  }
  
  // Wellness Services
  if (isWellnessIndustry(industry)) {
    return [
      { status: "pending", label: "Scheduled", icon: Calendar },
      { status: "processing", label: "In Session", icon: Timer },
      { status: "ready", label: "Finishing", icon: Sparkles },
      { status: "served", label: "Done", icon: CheckCheck },
      { status: "completed", label: "Completed", icon: CheckCircle },
    ];
  }
  
  // Automotive Services
  if (isAutomotiveIndustry(industry)) {
    return [
      { status: "pending", label: "Pending", icon: ClipboardCheck },
      { status: "processing", label: "In Progress", icon: Wrench },
      { status: "ready", label: "Completed", icon: Car },
      { status: "served", label: "Delivered", icon: CheckCheck },
      { status: "completed", label: "Closed", icon: CheckCircle },
    ];
  }
  
  // Home Services
  if (isHomeServiceIndustry(industry)) {
    return [
      { status: "pending", label: "Pending", icon: ClipboardCheck },
      { status: "processing", label: "In Progress", icon: Wrench },
      { status: "ready", label: "Completed", icon: CheckCheck },
      { status: "served", label: "Delivered", icon: Truck },
      { status: "completed", label: "Closed", icon: CheckCircle },
    ];
  }
  
  // Retail
  if (isRetailIndustry(industry)) {
    return [
      { status: "pending", label: "Pending", icon: Clock },
      { status: "processing", label: "Processing", icon: Package },
      { status: "ready", label: "Ready", icon: ShoppingBag },
      { status: "served", label: "Picked Up", icon: UserCheck },
      { status: "completed", label: "Completed", icon: CheckCircle },
    ];
  }
  
  // Default
  return [
    { status: "pending", label: "Pending", icon: Clock },
    { status: "processing", label: "Processing", icon: Package },
    { status: "ready", label: "Ready", icon: CheckCheck },
    { status: "served", label: "Delivered", icon: Truck },
    { status: "completed", label: "Completed", icon: CheckCircle },
  ];
};

const getStatusIndex = (status: OrderStatus, steps: any[]): number => {
  return steps.findIndex((step) => step.status === status);
};

export const OrderTimeline = ({ status, createdAt }: OrderTimelineProps) => {
  const { profile } = useBusiness();
  const statusSteps = getStatusSteps(profile?.industry);
  const currentIndex = getStatusIndex(status, statusSteps);

  return (
    <div className="flex items-center justify-between w-full py-2">
      {statusSteps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLastStep = index === statusSteps.length - 1;

        return (
          <div key={step.status} className="flex flex-col items-center flex-1 relative">
            <div className="relative flex items-center w-full">
              {/* Left connecting line */}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute left-0 h-0.5 -translate-y-1/2 top-1/2 z-0",
                    "w-[calc(50%-16px)]", // Stop before the icon (16px = half of icon width)
                    index <= currentIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              
              {/* Right connecting line */}
              {!isLastStep && (
                <div
                  className={cn(
                    "absolute right-0 h-0.5 -translate-y-1/2 top-1/2 z-0",
                    "w-[calc(50%-16px)]", // Stop before the next icon
                    // Only show as completed if current step is completed AND we're not at completed status
                    // or if we're past this step but not completed yet
                    index < currentIndex && status !== "completed" ? "bg-primary" : 
                    index < currentIndex && status === "completed" ? "bg-primary" :
                    "bg-border"
                  )}
                />
              )}
              
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-200 bg-background",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border bg-background text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            
            {/* Label */}
            <span
              className={cn(
                "mt-2 text-xs font-medium text-center",
                isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

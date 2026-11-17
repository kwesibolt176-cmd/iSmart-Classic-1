import {
  LayoutDashboard, Users, Settings, ShoppingBag, ChefHat, CreditCard,
  UserCog, Package, Calendar, LogOut, RefreshCw, Store, Crown, Mail,
  FileText, Gift, Shield, Truck, CalendarClock, ChevronDown, ChevronLeft,
  ChevronRight, Calculator, BarChart3, HelpCircle, Scissors, Car, Wrench,
  Dumbbell, Sparkles, Heart, UtensilsCrossed, LucideIcon, Receipt,
  Wallet, ArrowDownLeft, Send, Smartphone, ArrowDownToLine, Repeat, X,
  User, MapPin, ShieldCheck, LayoutGrid, Megaphone, QrCode, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/contexts/BusinessContext";
import { signOutMerchantPortal } from "@/lib/merchant-session";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { LocationSelector } from "@/components/LocationSelector";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStaffAuthContext } from "@/contexts/StaffAuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isSuperAdmin?: boolean;
  domainContext?: 'admin' | 'app' | 'landing' | 'docs';
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon?: any;
  enabled: boolean;
  isHeader?: boolean;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: any;
  items: MenuItem[];
}

const getIndustryLabels = (industry: string) => {
  const labels: Record<string, Record<string, string>> = {
    // Food & Beverage
    restaurant: { tables: "Tables", reservations: "Reservations", kitchen: "Kitchen" },
    full_service_restaurant: { tables: "Tables", reservations: "Reservations", kitchen: "Kitchen" },
    quick_service: { tables: "Counter", reservations: "Pre-orders", kitchen: "Kitchen" },
    bakery: { tables: "Tables", reservations: "Reservations", kitchen: "Kitchen" },
    coffee_shop: { tables: "Tables", reservations: "Reservations", kitchen: "Kitchen" },
    food_truck: { tables: "Queue", reservations: "Pre-orders", kitchen: "Kitchen" },
    bar_brewery: { tables: "Tables", reservations: "Reservations", kitchen: "Bar" },
    catering: { tables: "Events", reservations: "Bookings", kitchen: "Prep" },
    franchise: { tables: "Tables", reservations: "Reservations", kitchen: "Kitchen" },

    // Retail
    retail: { tables: "Counters", reservations: "Appointments", kitchen: "Preparation" },
    clothing: { tables: "Fitting Rooms", reservations: "Appointments", kitchen: "Inventory" },
    clothing_retail: { tables: "Fitting Rooms", reservations: "Appointments", kitchen: "Inventory" },
    grocery: { tables: "Checkout", reservations: "Pre-orders", kitchen: "Stock" },
    home_gift: { tables: "Display", reservations: "Appointments", kitchen: "Stock" },
    wine_liquor: { tables: "Tasting", reservations: "Events", kitchen: "Stock" },
    garden: { tables: "Display", reservations: "Appointments", kitchen: "Stock" },
    garden_retail: { tables: "Display", reservations: "Appointments", kitchen: "Stock" },

    // Beauty
    salon: { tables: "Stations", reservations: "Appointments", kitchen: "Services" },
    barbershop: { tables: "Chairs", reservations: "Appointments", kitchen: "Services" },
    hair_salon: { tables: "Stations", reservations: "Appointments", kitchen: "Services" },
    nail_salon: { tables: "Stations", reservations: "Appointments", kitchen: "Services" },
    beauty_salon: { tables: "Stations", reservations: "Appointments", kitchen: "Services" },
    tattoo_piercing: { tables: "Stations", reservations: "Appointments", kitchen: "Services" },

    // Health & Wellness
    spa: { tables: "Rooms", reservations: "Appointments", kitchen: "Treatments" },
    med_spa: { tables: "Rooms", reservations: "Appointments", kitchen: "Treatments" },
    day_spa: { tables: "Rooms", reservations: "Appointments", kitchen: "Treatments" },
    fitness: { tables: "Equipment", reservations: "Bookings", kitchen: "Classes" },
    healthcare: { tables: "Rooms", reservations: "Appointments", kitchen: "Treatment" },
    cbd: { tables: "Display", reservations: "Consultations", kitchen: "Products" },

    // Home & Commercial
    cleaning: { tables: "Teams", reservations: "Jobs", kitchen: "Tasks" },
    contractors: { tables: "Crews", reservations: "Jobs", kitchen: "Projects" },
    landscaping: { tables: "Crews", reservations: "Jobs", kitchen: "Projects" },

    // Services
    automotive: { tables: "Bays", reservations: "Bookings", kitchen: "Service" },
    transportation: { tables: "Vehicles", reservations: "Bookings", kitchen: "Dispatch" },
    pet_services: { tables: "Stations", reservations: "Appointments", kitchen: "Services" },
    professional_services: { tables: "Rooms", reservations: "Appointments", kitchen: "Tasks" },
    services: { tables: "Workstations", reservations: "Bookings", kitchen: "Processing" },
    nonprofit: { tables: "Areas", reservations: "Events", kitchen: "Programs" },
    recreation: { tables: "Courts", reservations: "Bookings", kitchen: "Activities" },
  };
  return labels[industry] || labels.services;
};

const getIndustryIcons = (industry: string): { operations: LucideIcon; tables: LucideIcon; kitchen: LucideIcon; reservations: LucideIcon } => {
  const icons: Record<string, { operations: LucideIcon; tables: LucideIcon; kitchen: LucideIcon; reservations: LucideIcon }> = {
    // Food & Beverage
    restaurant: { operations: UtensilsCrossed, tables: Users, kitchen: ChefHat, reservations: Calendar },
    full_service_restaurant: { operations: UtensilsCrossed, tables: Users, kitchen: ChefHat, reservations: Calendar },
    quick_service: { operations: UtensilsCrossed, tables: CreditCard, kitchen: ChefHat, reservations: Calendar },
    bakery: { operations: UtensilsCrossed, tables: Users, kitchen: ChefHat, reservations: Calendar },
    coffee_shop: { operations: UtensilsCrossed, tables: Users, kitchen: ChefHat, reservations: Calendar },
    food_truck: { operations: UtensilsCrossed, tables: Users, kitchen: ChefHat, reservations: Calendar },
    bar_brewery: { operations: UtensilsCrossed, tables: Users, kitchen: ChefHat, reservations: Calendar },
    catering: { operations: UtensilsCrossed, tables: CalendarClock, kitchen: ChefHat, reservations: Calendar },
    franchise: { operations: UtensilsCrossed, tables: Users, kitchen: ChefHat, reservations: Calendar },

    // Retail
    retail: { operations: Package, tables: CreditCard, kitchen: Package, reservations: Calendar },
    clothing: { operations: Package, tables: Users, kitchen: Package, reservations: Calendar },
    clothing_retail: { operations: Package, tables: Users, kitchen: Package, reservations: Calendar },
    grocery: { operations: Package, tables: CreditCard, kitchen: Package, reservations: Calendar },
    home_gift: { operations: Package, tables: Package, kitchen: Package, reservations: Calendar },
    wine_liquor: { operations: Package, tables: Users, kitchen: Package, reservations: Calendar },
    garden: { operations: Package, tables: Package, kitchen: Package, reservations: Calendar },
    garden_retail: { operations: Package, tables: Package, kitchen: Package, reservations: Calendar },

    // Beauty
    salon: { operations: Scissors, tables: Scissors, kitchen: Sparkles, reservations: Calendar },
    barbershop: { operations: Scissors, tables: Scissors, kitchen: Sparkles, reservations: Calendar },
    hair_salon: { operations: Scissors, tables: Scissors, kitchen: Sparkles, reservations: Calendar },
    nail_salon: { operations: Sparkles, tables: Scissors, kitchen: Sparkles, reservations: Calendar },
    beauty_salon: { operations: Sparkles, tables: Scissors, kitchen: Sparkles, reservations: Calendar },
    tattoo_piercing: { operations: Scissors, tables: Scissors, kitchen: Sparkles, reservations: Calendar },

    // Health & Wellness
    spa: { operations: Sparkles, tables: Heart, kitchen: Sparkles, reservations: Calendar },
    med_spa: { operations: Heart, tables: Heart, kitchen: Sparkles, reservations: Calendar },
    day_spa: { operations: Sparkles, tables: Heart, kitchen: Sparkles, reservations: Calendar },
    fitness: { operations: Dumbbell, tables: Dumbbell, kitchen: Users, reservations: Calendar },
    healthcare: { operations: Heart, tables: Heart, kitchen: Sparkles, reservations: Calendar },
    cbd: { operations: Heart, tables: Package, kitchen: Package, reservations: Calendar },

    // Home & Commercial
    cleaning: { operations: Wrench, tables: Users, kitchen: Wrench, reservations: Calendar },
    contractors: { operations: Wrench, tables: Users, kitchen: Wrench, reservations: Calendar },
    landscaping: { operations: Wrench, tables: Users, kitchen: Wrench, reservations: Calendar },

    // Services
    automotive: { operations: Car, tables: Wrench, kitchen: Wrench, reservations: Calendar },
    transportation: { operations: Car, tables: Car, kitchen: Users, reservations: Calendar },
    pet_services: { operations: Heart, tables: Heart, kitchen: Sparkles, reservations: Calendar },
    professional_services: { operations: Wrench, tables: Users, kitchen: Wrench, reservations: Calendar },
    services: { operations: Wrench, tables: Users, kitchen: Wrench, reservations: Calendar },
    nonprofit: { operations: Users, tables: Users, kitchen: Users, reservations: Calendar },
    recreation: { operations: Sparkles, tables: Users, kitchen: Sparkles, reservations: Calendar },
  };
  const defaultIcons = { operations: ChefHat, tables: Users, kitchen: ChefHat, reservations: Calendar };
  return icons[industry] || defaultIcons;
};
export const Sidebar = ({ activeSection, onSectionChange, isSuperAdmin = false, domainContext = 'app', collapsed: controlledCollapsed, onCollapsedChange }: SidebarProps) => {
  const { profile, features, user } = useBusiness();
  const { hasPermission } = useStaffAuthContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [mobileSubMenu, setMobileSubMenu] = useState<string | null>(null);
  const leaveTimeoutRef = useState<NodeJS.Timeout | null>(null)[0];
  const timeoutId = useState<any>(null); // Quick hack to store timeout

  // Using a ref for consistent timeout management
  const timeoutRef = useState<{ id: any }>({ id: null })[0];

  const handleMouseLeave = () => {
    if (isMobile) return;
    timeoutRef.id = setTimeout(() => {
      setActiveGroup(null);
    }, 1000);
  };

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (timeoutRef.id) {
      clearTimeout(timeoutRef.id);
      timeoutRef.id = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.id) clearTimeout(timeoutRef.id);
    };
  }, []);

  // Use controlled state if provided, otherwise use internal state
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const setCollapsed = (val: boolean) => {
    if (onCollapsedChange) onCollapsedChange(val);
    else setInternalCollapsed(val);
    if (val) setActiveGroup(null); // Close sub-panel if primary collapses
  };

  useEffect(() => {
    // Track which group the active section belongs to for future UX enhancements
    // menuGroups is defined below — this effect runs after render so it's safe
  }, [activeSection]);

  if (!profile || !features) return null;

  const industryLabels = getIndustryLabels(profile.industry);
  const industryIcons = getIndustryIcons(profile.industry);

  // If on admin domain, only show admin section
  if (domainContext === 'admin') {
    return (
      <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <span className="text-xl font-bold text-foreground">Admin Panel</span>
        </div>
        <nav className="flex-1 p-4">
          <button
            onClick={() => onSectionChange("admin")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <Shield className="w-5 h-5" />
            <span>Platform Admin</span>
          </button>
        </nav>
      </aside>
    );
  }

  // Primary items (always visible at top)
  const primaryItems: MenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
    { id: "products", label: "Products", icon: Package, enabled: true },
    { id: "orders", label: "Orders", icon: ShoppingBag, enabled: true },
    { id: "payment", label: "Payment", icon: CreditCard, enabled: true },
  ];

  // Grouped items
  const menuGroups: MenuGroup[] = [
    {
      id: "operations",
      label: "Operations",
      icon: industryIcons.operations,
      items: [
        { id: "tables", label: industryLabels.tables, icon: industryIcons.tables, enabled: features.tables_enabled },
        { id: "kitchen", label: industryLabels.kitchen, icon: industryIcons.kitchen, enabled: features.kitchen_enabled },
        { id: "reservation", label: industryLabels.reservations, icon: industryIcons.reservations, enabled: features.reservations_enabled },
        { id: "branches", label: "Branches", icon: Building2, enabled: true },
        { id: "deliveries", label: "Deliveries", icon: Truck, enabled: true },
      ].filter(i => i.enabled),
    },
    {
      id: "finance",
      label: "Finance",
      icon: Calculator,
      items: [
        { id: "wallet", label: "Wallet", icon: Wallet, enabled: true },
        { id: "collections", label: "Collections", icon: ArrowDownLeft, enabled: true },
        { id: "recurring-payments", label: "Recurring", icon: Repeat, enabled: true },
        { id: "disbursements", label: "Disbursements", icon: Send, enabled: true },
        { id: "utilities", label: "Utilities", icon: Smartphone, enabled: true },
        { id: "settlements", label: "Settlements", icon: ArrowDownToLine, enabled: true },
        { id: "invoices", label: "Invoices", icon: FileText, enabled: true },
        { id: "refunds", label: "Refunds", icon: RefreshCw, enabled: true },
        { id: "accounting", label: "Accounting", icon: Calculator, enabled: features.accounting_enabled },
        { id: "tax-reports", label: "Tax Reports", icon: Receipt, enabled: true },
      ].filter(i => i.enabled),
    },
    {
      id: "team",
      label: "Team",
      icon: UserCog,
      items: [
        { id: "staff", label: "Staff", icon: UserCog, enabled: features.staff_enabled },
        { id: "scheduling", label: "Scheduling", icon: CalendarClock, enabled: features.staff_enabled },
      ].filter(i => i.enabled),
    },
    {
      id: "customers",
      label: "Customers",
      icon: Users,
      items: [
        { id: "customers", label: "Customer List", icon: Users, enabled: features.customers_enabled },
        { id: "loyalty", label: "Loyalty", icon: Gift, enabled: features.customers_enabled },
        { id: "gift-cards", label: "Gift Cards", icon: Gift, enabled: true },
      ].filter(i => i.enabled),
    },
    {
      id: "marketing",
      label: "Marketing",
      icon: Mail,
      items: [
        { id: "campaigns", label: "Campaigns", icon: Mail, enabled: true },
        { id: "social-store", label: "Social Store", icon: Store, enabled: true },
      ].filter(i => i.enabled),
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Truck,
      items: [
        { id: "suppliers", label: "Suppliers", icon: Truck, enabled: features.inventory_enabled },
      ].filter(i => i.enabled),
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      items: [
        { id: "h-business", label: "Business Setup", enabled: true, isHeader: true },
        { id: "settings-profile", label: "Profile", icon: User, enabled: true },
        { id: "settings-business", label: "Business Info", icon: Store, enabled: true },
        { id: "settings-locations", label: "Locations", icon: MapPin, enabled: true },
        { id: "settings-credits", label: "Credits", icon: Wallet, enabled: true },
        { id: "settings-kyc", label: "KYC Verification", icon: ShieldCheck, enabled: true },

        { id: "h-ops", label: "Operations", enabled: true, isHeader: true },
        { id: "settings-pos", label: "POS Config", icon: CreditCard, enabled: true },
        { id: "settings-categories", label: "Categories", icon: LayoutGrid, enabled: true },
        { id: "settings-branch-inventory", label: "Branch Stock", icon: Package, enabled: true },
        { id: "settings-tax", label: "Tax Settings", icon: Receipt, enabled: true },
        { id: "settings-features", label: "Features", icon: Sparkles, enabled: true },
        { id: "settings-reminders", label: "Invoice Reminders", icon: Mail, enabled: true },

        { id: "h-staff", label: "Team & Security", enabled: true, isHeader: true },
        { id: "settings-security", label: "Security (PIN)", icon: Shield, enabled: true },
        { id: "settings-roles", label: "Staff Roles", icon: UserCog, enabled: true },
        { id: "settings-announcements", label: "Announcements", icon: Megaphone, enabled: true },

        ...(profile?.industry === "restaurant" ? [
          { id: "h-hospitality", label: "Hospitality", enabled: true, isHeader: true },
          { id: "settings-qr-ordering", label: "QR Ordering", icon: QrCode, enabled: true },
          { id: "settings-qr-orders", label: "QR Orders", icon: ShoppingBag, enabled: true },
        ] : []),
      ],
    },
  ].filter(g => g.items.length > 0);

  // Bottom items - gate by permissions for staff
  const bottomItems: MenuItem[] = [
    { id: "reports", label: "Reports", icon: BarChart3, enabled: features.reports_enabled && hasPermission('reports') },
    { id: "support", label: "Support", icon: HelpCircle, enabled: true },
    { id: "subscription", label: "Subscription", icon: Crown, enabled: hasPermission('settings') },
  ].filter(i => i.enabled);

  const handleLogout = async () => {
    await signOutMerchantPortal();
    navigate("/auth");
  };

  const activeGroupItem = activeGroup ? menuGroups.find(g => g.id === activeGroup) : null;

  const renderMenuItem = (item: MenuItem, isSubMenu = false) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;

    if (item.isHeader) {
      if (collapsed && !isSubMenu) return null;
      return (
        <div key={item.id} className="px-4 pt-4 pb-2 text-[10px] font-black text-white uppercase tracking-[0.2em] opacity-40">
          {item.label}
        </div>
      );
    }

    if (collapsed && !isSubMenu) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                onSectionChange(item.id);
                setActiveGroup(null);
              }}
              className={cn(
                "relative w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 group",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <div className="absolute right-0 w-1.5 h-6 bg-white rounded-l-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          onSectionChange(item.id);
          if (isMobile) {
            // No need to close the sidebar here as MobileSidebar.tsx handles it
          } else {
            if (!isSubMenu) setActiveGroup(null);
          }
        }}
        className={cn(
          "relative w-full flex items-center gap-3.5 px-4 py-2 rounded-lg transition-all duration-200 text-sm group overflow-hidden",
          isActive
            ? isSubMenu
              ? "bg-white/15 text-white font-black border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              : "bg-white/10 text-white font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            : isSubMenu
              ? "text-white/50 hover:text-white hover:bg-white/5"
              : "text-white/60 hover:bg-white/5 hover:text-white"
        )}
      >
        <div className={cn(
          "w-1 h-5 absolute left-0 bg-white transition-transform duration-300 rounded-r-full",
          isActive ? "scale-y-100" : "scale-y-0"
        )} />
        <Icon className={cn(
          "w-4 h-4 transition-all duration-200",
          isActive ? "text-white scale-110 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" : "text-white/50 group-hover:text-white"
        )} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const renderGroupTrigger = (group: MenuGroup) => {
    const isPanelOpen = activeGroup === group.id;
    const hasActiveItem = group.items.some(item => item.id === activeSection);
    const Icon = group.icon;

    if (collapsed) {
      return (
        <Tooltip key={group.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                setCollapsed(false);
                setActiveGroup(group.id);
              }}
              className={cn(
                "relative w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 group",
                hasActiveItem || isPanelOpen
                  ? "bg-primary/30 text-white"
                  : "text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-5 h-5" />
              {hasActiveItem && (
                <div className="absolute left-0 w-1 h-5 bg-primary/60 rounded-r-full" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{group.label}</TooltipContent>
        </Tooltip>
      );
    }

    const trigger = (
      <button
        key={group.id}
        onClick={() => {
          if (isMobile) {
            setMobileSubMenu(group.id);
          } else {
            setActiveGroup(isPanelOpen ? null : group.id);
          }
        }}
        className={cn(
          "flex items-center justify-between px-4 py-2 rounded-lg transition-all duration-200 text-sm group w-full",
          isPanelOpen ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "text-white/60 hover:bg-white/5 hover:text-white"
        )}
      >
        <div className="flex items-center gap-3.5">
          <Icon className={cn(
            "w-4 h-4 transition-all duration-200",
            (hasActiveItem || isPanelOpen) ? "text-white scale-110 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" : "text-white/50 group-hover:text-white"
          )} />
          <span className={cn(
            "font-black transition-colors duration-200 uppercase tracking-tight text-[11px]",
            (hasActiveItem || isPanelOpen) ? "text-white" : "text-white/60 group-hover:text-white"
          )}>{group.label}</span>
        </div>
        <ChevronRight className={cn(
          "w-4 h-4 transition-transform duration-200 text-white/30 group-hover:text-white",
          isPanelOpen && !isMobile && "rotate-90 text-white"
        )} />
      </button>
    );

    return trigger;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "h-full sticky top-0 flex flex-row group/sidebar-container z-30 min-h-screen",
          isMobile && "relative w-[280px]"
        )}
      >
        {/* ── Main Panel ── */}
        <aside className={cn(
          "h-full bg-sidebar border-r border-sidebar-border/50 flex flex-col transition-all duration-500 ease-in-out shadow-2xl relative shrink-0 overflow-hidden min-h-screen",
          collapsed ? "w-20" : isMobile ? "w-full" : "w-64"
        )}>
          {/* Header */}
          <div className={cn(
            "p-4 border-b border-sidebar-border bg-sidebar sticky top-0 z-10",
            collapsed && "px-2"
          )}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => setCollapsed(false)}>
                  {profile.logo_url ? (
                    <img src={profile.logo_url} alt={profile.business_name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-lg">{profile.business_name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 group cursor-pointer min-w-0 flex-1" onClick={() => setCollapsed(true)}>
                    <div className="relative shrink-0">
                      {profile.logo_url ? (
                        <img src={profile.logo_url} alt={profile.business_name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center border border-white/10">
                          <span className="text-primary-foreground font-bold text-xl">{profile.business_name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-sidebar" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-base font-bold text-white leading-tight break-words line-clamp-2">{profile.business_name}</span>
                      <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider">Enterprise Plan</span>
                    </div>
                  </div>
                </div>
                <LocationSelector />
              </div>
            )}
          </div>

          {/* Nav Area */}
          <nav className="flex-1 p-2.5 overflow-y-auto flex flex-col custom-scrollbar bg-sidebar relative">
            {isMobile && mobileSubMenu ? (
              <div className="animate-in slide-in-from-right duration-300 space-y-4">
                <button
                  onClick={() => setMobileSubMenu(null)}
                  className="flex items-center gap-2 px-4 py-2 text-white/40 hover:text-white transition-colors mb-4 group"
                >
                  <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Menu</span>
                </button>
                
                {menuGroups.find(g => g.id === mobileSubMenu)?.items.map(item => renderMenuItem(item, true))}
              </div>
            ) : (
              <div className={cn("space-y-4 flex flex-col justify-between h-full", isMobile && mobileSubMenu ? "hidden" : "flex")}>
                <div className="space-y-4">
                  <div className="space-y-1">
                    {!collapsed && <p className="px-4 mb-1.5 text-[10px] font-black text-white uppercase tracking-[0.2em]">Core</p>}
                    {primaryItems.map(item => renderMenuItem(item))}
                  </div>
                  <div className="space-y-1 pt-4 border-t border-white/5">
                    {!collapsed && <p className="px-4 mb-1.5 text-[10px] font-black text-white uppercase tracking-[0.2em]">Business</p>}
                    {menuGroups.map(group => renderGroupTrigger(group))}
                  </div>
                </div>

                <div className="space-y-1 pt-4 border-t border-white/5 mt-auto">
                  {!collapsed && <p className="px-4 mb-1.5 text-[10px] font-black text-white uppercase tracking-[0.2em]">Platform</p>}
                  {bottomItems.map(item => renderMenuItem(item))}
                </div>
              </div>
            )}
          </nav>

          {/* Logout Area */}
          <div className="p-4 border-t border-white/10 bg-sidebar shrink-0">
            <button
              onClick={() => handleLogout()}
              className={cn(
                "flex items-center gap-3.5 w-full p-3 rounded-lg transition-all duration-200 text-sm font-bold group",
                collapsed
                  ? "justify-center text-white/40 hover:text-red-400 hover:bg-red-500/20"
                  : "text-white/50 hover:bg-red-500/20 hover:text-red-400 hover:border hover:border-red-500/30 border border-transparent"
              )}
            >
              <LogOut className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform duration-200" />
              {!collapsed && <span>Log Out</span>}
            </button>
          </div>
        </aside>

        {/* ── Secondary Panel (Sliding) ── */}
        {!isMobile && (
          <div className={cn(
            "h-full transition-all duration-300 ease-in-out z-20 bg-sidebar border-r border-sidebar-border overflow-hidden flex-shrink-0",
            "relative",
            activeGroupItem
              ? "w-64 opacity-100 translate-x-0"
              : "w-0 opacity-0 -translate-x-full pointer-events-none"
          )}>
            {/* Inner content wrapper with fixed width to prevent reflow during slide */}
            <div className="h-full flex flex-col shrink-0 w-64">
              {activeGroupItem && (
                <>
                  {/* Sub Header */}
                  <div className="p-6 h-[85px] flex items-center justify-between border-b border-sidebar-border bg-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20 text-primary">
                        <activeGroupItem.icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-white uppercase tracking-tight">
                        {activeGroupItem.label}
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveGroup(null)}
                      className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Sub Navigation */}
                  <div className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar bg-sidebar">
                    {activeGroupItem.items.map(subItem => renderMenuItem(subItem, true))}
                  </div>

                  {/* Panel Badge */}
                  <div className="p-4 mt-auto">
                    <div className="bg-white/5 border border-sidebar-border p-4 rounded-lg">
                      <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Quick View</p>
                      <p className="text-[13px] text-white/60 font-medium leading-relaxed">
                        Manage your {activeGroupItem.label.toLowerCase()} efficiently.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};



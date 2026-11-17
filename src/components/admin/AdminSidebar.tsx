import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  BarChart3,
  CreditCard,
  FileText,
  Shield,
  Settings,
  Activity,
  RotateCcw,
  Flag,
  Ticket,
  Gift,
  Megaphone,
  UserCog,
  Monitor,
  AlertTriangle,
  Users,
  Package,
  Mail,
  MessageCircle,
  Key,
  Database,
  Download,
  MessageSquare,
  Webhook,
  UserPlus,
  Store,
  Menu,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Sparkles,
  Truck,
  TrendingUp,
  Bell,
  Zap,
  Clock,
  ShieldCheck,
  FileCheck2,
  ArrowDownToLine,
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  group?: string;
}

const navItems: NavItem[] = [
  // Dashboard
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, group: "Dashboard" },
  
  // User & Business Management
  { id: "businesses", label: "Businesses", icon: Building2, group: "Management" },
  { id: "verifications", label: "KYC Reviews", icon: FileCheck2, group: "Management" },
  { id: "users", label: "Users", icon: Users, group: "Management" },
  { id: "staff", label: "Staff", icon: UserPlus, group: "Management" },
  
  // Operations
  { id: "orders", label: "Orders", icon: ClipboardList, group: "Operations" },
  { id: "inventory", label: "Inventory", icon: Package, group: "Operations" },
  { id: "invoices", label: "Invoices", icon: FileText, group: "Operations" },
  { id: "delivery", label: "Delivery Partners", icon: Truck, group: "Operations" },
  { id: "pendingactions", label: "Pending Actions", icon: Activity, group: "Operations" },
  
  // Finance & Revenue
  { id: "wallets", label: "Wallet Overview", icon: CreditCard, group: "Finance" },
  { id: "transactions", label: "Transactions", icon: Activity, group: "Finance" },
  { id: "settlements", label: "Settlements", icon: ArrowDownToLine, group: "Finance" },
  { id: "utilities", label: "Utility Payments", icon: Zap, group: "Finance" },
  { id: "utilityProviders", label: "Utility Providers", icon: Zap, group: "Finance" },
  { id: "providers", label: "Payment Providers", icon: Landmark, group: "Finance" },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard, group: "Finance" },
  { id: "trials", label: "Trial Tracking", icon: Clock, group: "Finance" },
  { id: "billing", label: "Billing", icon: TrendingUp, group: "Finance" },
  { id: "revenue", label: "Revenue Analytics", icon: BarChart3, group: "Finance" },
  { id: "refunds", label: "Refunds", icon: RotateCcw, group: "Finance" },
  { id: "creditpackages", label: "Credit Packages", icon: Gift, group: "Finance" },
  { id: "credits", label: "Promo Credits", icon: Zap, group: "Finance" },
  
  // Engagement & Marketing
  { id: "campaigns", label: "Campaigns", icon: Mail, group: "Engagement" },
  { id: "feature-campaigns", label: "Feature Announcements", icon: Sparkles, group: "Engagement" },
  { id: "socialstores", label: "Social Stores", icon: Store, group: "Engagement" },
  { id: "announcements", label: "In-App Announcements", icon: Megaphone, group: "Engagement" },
  
  // Communications
  { id: "communications", label: "Settings", icon: MessageCircle, group: "Communications" },
  { id: "templates", label: "Templates", icon: FileText, group: "Communications" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Communications" },
  
  // Support
  { id: "support", label: "Tickets", icon: Ticket, group: "Support" },
  { id: "chat", label: "Live Chat", icon: MessageSquare, group: "Support" },
  { id: "sla", label: "SLA Tracking", icon: Activity, group: "Support" },
  
  // Security & Compliance
  { id: "superadmins", label: "Super Admins", icon: Shield, group: "Security" },
  { id: "2fa", label: "Two-Factor Auth", icon: ShieldCheck, group: "Security" },
  { id: "roles", label: "Platform Roles", icon: Users, group: "Security" },
  { id: "fraud", label: "Fraud Detection", icon: AlertTriangle, group: "Security" },
  { id: "impersonate", label: "Impersonation", icon: UserCog, group: "Security" },
  { id: "audit", label: "Audit Logs", icon: FileText, group: "Security" },
  
  // System & Infrastructure
  { id: "flags", label: "Feature Flags", icon: Flag, group: "System" },
  { id: "monitoring", label: "System Health", icon: Monitor, group: "System" },
  
  { id: "accountvalidation", label: "Account Validation", icon: ShieldCheck, group: "System" },
  { id: "integrations", label: "Integrations", icon: Key, group: "System" },
  { id: "aisecrets", label: "Platform Secrets", icon: Key, group: "System" },
  { id: "api", label: "API Management", icon: Key, group: "System" },
  { id: "webhooks", label: "Webhooks", icon: Webhook, group: "System" },
  { id: "database", label: "Database", icon: Database, group: "System" },
  { id: "exports", label: "Data Exports", icon: Download, group: "System" },
  { id: "settings", label: "System Settings", icon: Settings, group: "System" },
];

const groups = [
  "Dashboard",
  "Management", 
  "Operations",
  "Finance",
  "Engagement",
  "Communications",
  "Support",
  "Security",
  "System",
];

export const AdminSidebar = ({
  activeTab,
  onTabChange,
  collapsed,
  onCollapsedChange,
}: AdminSidebarProps) => {
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    const button = (
      <button
        onClick={() => onTabChange(item.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.id}>{button}</div>;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-border/50 flex items-center",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div>
            <h2 className="font-bold text-lg text-foreground">Control Panel</h2>
            <p className="text-xs text-muted-foreground">Platform Administration</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(!collapsed)}
          className="shrink-0 hidden lg:flex"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-4">
          {groups.map((group) => {
            const groupItems = navItems.filter((item) => item.group === group);
            if (groupItems.length === 0) return null;

            return (
              <div key={group}>
                {!collapsed && (
                  <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group}
                  </p>
                )}
                <div className="space-y-1">
                  {groupItems.map(renderNavItem)}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-md"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px]">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-card border-r border-border/50 transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

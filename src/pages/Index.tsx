import { useState, useEffect, useMemo, useRef, lazy, Suspense, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search } from "lucide-react";
import { signOutMerchantPortal } from "@/lib/merchant-session";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import { useDomainContext } from "@/hooks/use-domain-context";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation as useBusinessLocation } from "@/contexts/LocationContext";
import { useIdleTimer } from "@/hooks/use-idle-timer";
import { PinLockScreen } from "@/components/PinLockScreen";
import { ActiveStaffSession } from "@/contexts/StaffAuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useDashboardData } from "@/hooks/use-dashboard-data";

// Lazy load all section components for better performance
const Dashboard = lazy(() => import("@/components/Dashboard").then(m => ({ default: m.Dashboard })));
const Products = lazy(() => import("@/pages/Products").then(m => ({ default: m.Products })));
const Tables = lazy(() => import("@/pages/Tables").then(m => ({ default: m.Tables })));
const Orders = lazy(() => import("@/pages/Orders").then(m => ({ default: m.Orders })));
const Payment = lazy(() => import("@/pages/Payment").then(m => ({ default: m.Payment })));
const Kitchen = lazy(() => import("@/pages/Kitchen").then(m => ({ default: m.Kitchen })));
const Reservations = lazy(() => import("@/pages/Reservations").then(m => ({ default: m.Reservations })));
const Refunds = lazy(() => import("@/pages/Refunds").then(m => ({ default: m.Refunds })));
const Staff = lazy(() => import("@/pages/Staff").then(m => ({ default: m.Staff })));
const Chat = lazy(() => import("@/pages/Chat").then(m => ({ default: m.Chat })));
const Accounting = lazy(() => import("@/pages/Accounting").then(m => ({ default: m.Accounting })));
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })));
const Customers = lazy(() => import("@/pages/Customers").then(m => ({ default: m.Customers })));
const Campaigns = lazy(() => import("@/pages/Campaigns").then(m => ({ default: m.Campaigns })));
const Invoices = lazy(() => import("@/pages/Invoices"));
const SocialStore = lazy(() => import("@/pages/SocialStore").then(m => ({ default: m.SocialStore })));
const Subscription = lazy(() => import("@/pages/Subscription").then(m => ({ default: m.Subscription })));
const Reports = lazy(() => import("@/pages/Reports").then(m => ({ default: m.Reports })));
const Loyalty = lazy(() => import("@/pages/Loyalty").then(m => ({ default: m.Loyalty })));
const GiftCards = lazy(() => import("@/pages/GiftCards").then(m => ({ default: m.GiftCards })));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin").then(m => ({ default: m.SuperAdmin })));
const Scheduling = lazy(() => import("@/pages/Scheduling"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const Support = lazy(() => import("@/pages/Support"));
const PendingActionsManager = lazy(() => import("@/components/PendingActionsManager").then(m => ({ default: m.PendingActionsManager })));
const BranchInventoryManager = lazy(() => import("@/components/BranchInventoryManager").then(m => ({ default: m.BranchInventoryManager })));
const QROrders = lazy(() => import("@/pages/QROrders"));
const Deliveries = lazy(() => import("@/pages/Deliveries"));
const LiveDeliverySession = lazy(() => import("@/components/delivery/LiveDeliverySession").then(m => ({ default: m.LiveDeliverySession })));
const TaxReports = lazy(() => import("@/pages/TaxReports").then(m => ({ default: m.TaxReports })));

// Fintech pages
const Wallet = lazy(() => import("@/pages/Wallet"));
const Collections = lazy(() => import("@/pages/Collections"));
const Disbursements = lazy(() => import("@/pages/Disbursements"));
const Utilities = lazy(() => import("@/pages/Utilities"));
const Settlements = lazy(() => import("@/pages/Settlements"));
const RecurringPayments = lazy(() => import("@/pages/RecurringPayments"));

// Section loading fallback
const SectionLoader = memo(() => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-8">
    <LoadingSpinner size="large" />
  </div>
));
SectionLoader.displayName = "SectionLoader";

const Index = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, profile, loading, profileChecked } = useBusiness();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const domainContext = useDomainContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { currentLocation } = useBusinessLocation();

  // Pre-fetch all dashboard data so it's ready before spinner ends
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData(
    user?.id,
    currentLocation?.id
  );

  // Ensure a valid idle timeout (fallback to 30 mins if invalid or 0)
  const idleTimeout = useMemo(() => {
    const stored = localStorage.getItem("pos_idle_timeout");
    const parsed = stored ? parseInt(stored) : 1800000;
    return isNaN(parsed) || parsed <= 0 ? 1800000 : parsed;
  }, []);

  const { isIdle, unlock } = useIdleTimer(idleTimeout);

  // Once the app has been shown for this user, background auth/profile refreshes
  // must not swap it for the full-screen loader (QA BUG-01 / BUG-10).
  const appShownForUserRef = useRef<string | null>(null);

  const handleSectionChange = (section: string) => {
    if (section !== activeSection) {
      setActiveSection(section);
    }
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Sync selected section from URL query string
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionParam = params.get("section");
    if (sectionParam) {
      setActiveSection(sectionParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (loading || !profileChecked || superAdminLoading) return;

    if (!user) {
      console.log("[Auth] No user found, redirecting to login");
      navigate("/auth");
      return;
    }

    if (domainContext === 'admin') {
      if (isSuperAdmin) {
        setActiveSection('admin');
      } else {
        console.log("[Auth] Not super admin, redirecting to auth");
        navigate("/auth");
      }
      return;
    }

    // Check if we're offline and have cached profile data
    const cachedProfile = localStorage.getItem('cached_business_profile');
    const isOffline = !navigator.onLine;
    
    if (!profile) {
      if (isOffline && cachedProfile) {
        // If offline but we have cached profile, don't redirect
        console.log("[Auth] Offline mode: Using cached profile data");
        try {
          const parsedProfile = JSON.parse(cachedProfile);
          // You could set this in context if needed, but for now just don't redirect
          return;
        } catch (error) {
          console.error("[Auth] Failed to parse cached profile:", error);
        }
      }
      
      // Only redirect to onboarding if we're online or have no cached data
      if (!isOffline) {
        console.log("[Auth] No business profile, redirecting to onboarding");
        navigate("/onboarding");
      } else {
        console.log("[Auth] Offline mode: Staying on current page despite missing profile");
      }
    } else {
      // Cache the profile when we have it
      localStorage.setItem('cached_business_profile', JSON.stringify(profile));
    }
  }, [user, profile, loading, profileChecked, navigate, domainContext, isSuperAdmin, superAdminLoading]);

  const appAlreadyShown = Boolean(user && profile && appShownForUserRef.current === user.id);
  if ((loading || !profileChecked || superAdminLoading || dashboardLoading) && !appAlreadyShown) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  if (!user) return null;
  if (domainContext !== 'admin' && !profile) {
    // Check if we're offline and have cached profile data
    const cachedProfile = localStorage.getItem('cached_business_profile');
    const isOffline = !navigator.onLine;
    
    if (isOffline && cachedProfile) {
      // Allow the app to continue in offline mode with cached data
      console.log("[Auth] Offline mode: Continuing with cached profile");
    } else if (!isOffline) {
      // Only return null (which would trigger redirect) if we're online
      return null;
    }
    // If offline without cache, still show the app but with limited functionality
  }

  if (profile) appShownForUserRef.current = user.id;

  // Only show PIN lock screen if admin PIN is set, otherwise log out on idle
  if (isIdle) {
    // Check if admin PIN is configured
    const adminPinConfigured = profile?.admin_pin && profile.admin_pin !== '';
    if (adminPinConfigured) {
      return <PinLockScreen onUnlock={() => unlock()} />;
    } else {
      // No PIN configured - log out
      console.log("[Session] Idle state detected without PIN, logging out...");
      signOutMerchantPortal().finally(() => {
        window.location.href = '/auth';
      });
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <LoadingSpinner size="large" message="Session expired. Logging out..." />
        </div>
      );
    }
  }

  // Render active section with lazy loading
  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onSectionChange={setActiveSection} prefetchedData={dashboardData} />;
      case "products":
        return <Products />;
      case "products-inventory":
        return <Products initialTab="inventory" />;
      case "tables":
        return <Tables onSectionChange={setActiveSection} />;
      case "orders":
        return <Orders />;
      case "payment":
        return <Payment />;
      case "kitchen":
        return <Kitchen />;
      case "reservation":
        return <Reservations />;
      case "refunds":
        return <Refunds />;
      case "invoices":
        return <Invoices />;
      case "staff":
        return <Staff />;
      case "scheduling":
        return <Scheduling />;
      case "customers":
        return <Customers onNavigate={setActiveSection} />;
      case "campaigns":
        return <Campaigns />;
      case "loyalty":
        return <Loyalty />;
      case "gift-cards":
        return <GiftCards />;
      case "suppliers":
        return <Suppliers />;
      case "social-store":
        return <SocialStore />;
      case "qr-orders":
        return <QROrders />;
      case "deliveries":
        return <Deliveries />;
      case "branches":
        return (
          <div className="container mx-auto p-6">
            <BranchInventoryManager />
          </div>
        );
      case "subscription":
        return <Subscription />;
      case "chat":
        return <Chat />;
      case "reports":
        return <Reports />;
      case "tax-reports":
        return <TaxReports />;
      case "wallet-topup":
      case "wallet":
        return <Wallet autoOpenTopup={activeSection === "wallet-topup"} />;
      case "collections":
        return <Collections />;
      case "disbursements":
        return <Disbursements />;
      case "utilities":
        return <Utilities />;
      case "settlements":
        return <Settlements />;
      case "recurring-payments":
        return <RecurringPayments />;
      case "accounting":
        return <Accounting />;
      case "pending-actions":
        return (
          <div className="container mx-auto p-6">
            <PendingActionsManager />
          </div>
        );
      case "admin":
        return <SuperAdmin />;
      case "support":
        return <Support />;
      case "settings":
        return <Settings />;
      default:
        if (activeSection.startsWith("settings-")) {
          const tab = activeSection.split("settings-")[1];
          return <Settings activeTab={tab} />;
        }
        return <Dashboard onSectionChange={setActiveSection} />;
    }
  };

  return (
    <div className="h-screen min-h-screen bg-background flex overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
          <div className="p-3 flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 h-full overflow-y-auto">
                <Sidebar
                  activeSection={activeSection}
                  onSectionChange={handleSectionChange}
                  isSuperAdmin={isSuperAdmin}
                  domainContext={domainContext}
                />
              </SheetContent>
            </Sheet>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background"
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="h-full overflow-y-auto">
          <Sidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            isSuperAdmin={isSuperAdmin}
            domainContext={domainContext}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </div>
      )}

      {/* Main Content */}
      <div className={cn(
        "flex-1 relative flex flex-col overflow-auto min-w-0 transition-all duration-300 h-full",
        isMobile ? 'pt-[64px]' : ''
      )}>
        <Suspense fallback={<SectionLoader />}>
          {renderSection()}
        </Suspense>

        {/* Live Delivery Tracking Session */}
        {domainContext !== 'admin' && (
          <Suspense fallback={null}>
            <LiveDeliverySession />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default Index;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { BusinessProvider } from "./contexts/BusinessContext";
import { LocationProvider } from "./contexts/LocationContext";
import { CartProvider } from "./contexts/CartContext";
import { StaffAuthProvider } from "./contexts/StaffAuthContext";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { UpdateNotification } from "./components/UpdateNotification";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useAppUpdate } from "./hooks/use-app-update";
import { useDomainContext } from "./hooks/use-domain-context";
import { useToast } from "./hooks/use-toast";

// Lazy load all page components for better initial bundle size
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin").then((m) => ({ default: m.SuperAdmin })));
const NotFound = lazy(() => import("./pages/NotFound"));
const CustomerDisplay = lazy(() =>
  import("./pages/CustomerDisplay").then((m) => ({ default: m.CustomerDisplay }))
);
const Auth = lazy(() => import("./pages/Auth").then((m) => ({ default: m.Auth })));
const Onboarding = lazy(() => import("./pages/Onboarding").then((m) => ({ default: m.Onboarding })));
const ShopProduct = lazy(() => import("./pages/ShopProduct").then((m) => ({ default: m.ShopProduct })));
const PublicStorefront = lazy(() =>
  import("./pages/PublicStorefront").then((m) => ({ default: m.PublicStorefront }))
);
const OrderTracking = lazy(() => import("./pages/OrderTracking").then((m) => ({ default: m.OrderTracking })));
const Scheduling = lazy(() => import("./pages/Scheduling"));
const Suppliers = lazy(() => import("./pages/Suppliers"));

const StaffAcceptInvite = lazy(() =>
  import("./pages/StaffAcceptInvite").then((m) => ({ default: m.StaffAcceptInvite }))
);
const SelfServeOrder = lazy(() => import("./pages/SelfServeOrder"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const MerchantPaymentCallback = lazy(() => import("./pages/MerchantPaymentCallback"));
const InvoiceView = lazy(() => import("./pages/InvoiceView"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const Docs = lazy(() => import("./pages/Docs"));
const ShortUrlRedirect = lazy(() => import("./pages/ShortUrlRedirect"));
const OrderPayment = lazy(() => import("./pages/OrderPayment"));
const PaymentLinkRedirect = lazy(() => import("./pages/PaymentLinkRedirect"));
const DeliveryDetails = lazy(() => import("./pages/DeliveryDetails"));
const ReceiptView = lazy(() => import("./pages/ReceiptView"));

// Fintech pages
const Wallet = lazy(() => import("./pages/Wallet"));
const Collections = lazy(() => import("./pages/Collections"));
const Disbursements = lazy(() => import("./pages/Disbursements"));
const Utilities = lazy(() => import("./pages/Utilities"));
const Settlements = lazy(() => import("./pages/Settlements"));

import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { isCriticalFlowActive } from "./lib/critical-flow";

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <LoadingSpinner size="large" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s — refresh data quickly when user returns
      gcTime: 1000 * 60 * 30, // 30 minutes
      // auto-refresh when tab regains focus, unless the user is mid-flow
      // (entering an OTP, uploading a document, etc.)
      refetchOnWindowFocus: () => !isCriticalFlowActive(),
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});


const App = () => {
  const { updateAvailable, updateApp, dismissUpdate } = useAppUpdate();
  const domainContext = useDomainContext();
  const { toast } = useToast();

  // Global unhandled promise rejection handler
  useEffect(() => {
    const isIgnorable = (reason: unknown) => {
      try {
        const r = reason as any;
        const parts = [
          r?.message,
          r?.error,
          r?.code,
          r?.context?.error,
          typeof r === "string" ? r : "",
          (() => { try { return JSON.stringify(r); } catch { return ""; } })(),
        ].filter(Boolean).join(" ");
        return /unauthorized|ismart session expired|ismart_unauthorized|edge function returned (4\d\d|5\d\d)|invalid token|jwt|aborterror|network ?error|failed to fetch|dynamically imported module|loading chunk|importing a module script failed/i.test(parts);
      } catch {
        return false;
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      // Always swallow — surfaced errors should be handled at call sites with proper UX.
      event.preventDefault();
      if (isIgnorable(event.reason)) return;
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
      // Don't show the generic toast; rely on call-site error handling and ErrorBoundary.
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, [toast]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <BusinessProvider>
            <LocationProvider>
              <CartProvider>
                <StaffAuthProvider>
                  <Toaster />
                  <Sonner />
                  <OfflineIndicator />
                  <UpdateNotification updateAvailable={updateAvailable} onUpdate={updateApp} onDismiss={dismissUpdate} />
                  <BrowserRouter>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* Public routes accessible from all domains */}
                        <Route path="/receipt" element={<ReceiptView />} />
                        <Route path="/invoice" element={<InvoiceView />} />
                        <Route path="/track-order" element={<OrderTracking />} />
                        <Route path="/s/:code" element={<ShortUrlRedirect />} />
                        <Route path="/store/:userId" element={<PublicStorefront />} />
                        <Route path="/delivery-details" element={<DeliveryDetails />} />
                        <Route path="/pay" element={<OrderPayment />} />
                        <Route path="/pay/:code" element={<PaymentLinkRedirect />} />
                        <Route path="/merchant-payment/callback" element={<MerchantPaymentCallback />} />

                        {/* control.getdowo.online - Super Admin */}
                        {domainContext === "admin" && (
                          <>
                            <Route path="/auth" element={<Auth />} />
                            <Route path="/" element={<SuperAdmin />} />
                            <Route path="/admin" element={<SuperAdmin />} />
                            <Route path="/super-admin" element={<SuperAdmin />} />
                          </>
                        )}

                        {/* getdowo.online - Main Application */}
                        {domainContext === "app" && (
                          <>
                            <Route path="/auth" element={<Auth />} />
                            <Route path="/onboarding" element={<Onboarding />} />
                            <Route path="/subscribe" element={<Subscribe />} />
                            <Route path="/staff-invite" element={<StaffAcceptInvite />} />
                            <Route path="/" element={<Index />} />
                            <Route path="/admin" element={<SuperAdmin />} />
                            <Route path="/customer-display" element={<CustomerDisplay />} />
                            <Route path="/shop/:slug" element={<ShopProduct />} />
                            <Route path="/scheduling" element={<Scheduling />} />
                            <Route path="/suppliers" element={<Suppliers />} />
                            
                            <Route path="/order/:token" element={<SelfServeOrder />} />
                            <Route path="/payment/callback" element={<PaymentCallback />} />
                            <Route path="/docs" element={<Docs />} />
                            
                            {/* Fintech Routes */}
                            <Route path="/wallet" element={<Wallet />} />
                            <Route path="/collections" element={<Collections />} />
                            <Route path="/disbursement" element={<Disbursements />} />
                            <Route path="/utilities" element={<Utilities />} />
                            <Route path="/settlements" element={<Settlements />} />
                          </>
                        )}

                        {/* Fallback for unmatched routes */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </BrowserRouter>
                </StaffAuthProvider>
              </CartProvider>
            </LocationProvider>
          </BusinessProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

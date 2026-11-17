import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import { useIdleTimer } from "@/hooks/use-idle-timer";
import { use2FACheck } from "@/hooks/use-2fa-check";
import { supabase } from "@/integrations/supabase/client";
import { signOutMerchantPortal } from "@/lib/merchant-session";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { GlobalSearchPanel } from "@/components/admin/GlobalSearchPanel";
import { DashboardOverviewTab } from "@/components/admin/DashboardOverviewTab";
import { BusinessManagementTab } from "@/components/admin/BusinessManagementTab";
import { OrdersManagementTab } from "@/components/admin/OrdersManagementTab";
import { SubscriptionsManagementTab } from "@/components/admin/SubscriptionsManagementTab";
import { InvoiceManagementTab } from "@/components/admin/InvoiceManagementTab";
import { RevenueAnalyticsTab } from "@/components/admin/RevenueAnalyticsTab";
import { RefundManagementTab } from "@/components/admin/RefundManagementTab";
import { RoleManagementTab } from "@/components/admin/RoleManagementTab";
import { AuditLogsTab } from "@/components/admin/AuditLogsTab";
import { SystemSettingsTab } from "@/components/admin/SystemSettingsTab";
import { FeatureFlagsTab } from "@/components/admin/FeatureFlagsTab";
import { SupportTicketsTab } from "@/components/admin/SupportTicketsTab";
import { PromotionalCreditsTab } from "@/components/admin/PromotionalCreditsTab";
import { AnnouncementsTab } from "@/components/admin/AnnouncementsTab";
import { ImpersonationTab } from "@/components/admin/ImpersonationTab";
import { SystemMonitoringTab } from "@/components/admin/SystemMonitoringTab";
import { FraudControlsTab } from "@/components/admin/FraudControlsTab";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { InventoryOverviewTab } from "@/components/admin/InventoryOverviewTab";
import { CampaignMonitoringTab } from "@/components/admin/CampaignMonitoringTab";
import { ApiManagementTab } from "@/components/admin/ApiManagementTab";
import { DatabaseManagementTab } from "@/components/admin/DatabaseManagementTab";
import { ExportReportingTab } from "@/components/admin/ExportReportingTab";
import { SupportChatTab } from "@/components/admin/SupportChatTab";
import { WebhookManagementTab } from "@/components/admin/WebhookManagementTab";
import { StaffManagementTab } from "@/components/admin/StaffManagementTab";
import { SocialStoreAnalyticsTab } from "@/components/admin/SocialStoreAnalyticsTab";
import { IntegrationsTab } from "@/components/admin/IntegrationsTab";
import { CommunicationSettingsTab } from "@/components/admin/CommunicationSettingsTab";
import { SystemTemplatesTab } from "@/components/admin/SystemTemplatesTab";
import { PendingActionsTab } from "@/components/admin/PendingActionsTab";
import { DeliveryPartnersTab } from "@/components/admin/DeliveryPartnersTab";
import { BillingManagementTab } from "@/components/admin/BillingManagementTab";
import { CreditPackagesTab } from "@/components/admin/CreditPackagesTab";
import { SLATrackingTab } from "@/components/admin/SLATrackingTab";

import { FeatureAnnouncementCampaign } from "@/components/admin/FeatureAnnouncementCampaign";
import { NotificationSettingsTab } from "@/components/admin/NotificationSettingsTab";
import { TrialUsageTrackingTab } from "@/components/admin/TrialUsageTrackingTab";
import { SuperAdminRoleManagement } from "@/components/admin/SuperAdminRoleManagement";
import { TwoFactorSettings } from "@/components/admin/TwoFactorSettings";
import { TwoFactorVerifyDialog } from "@/components/admin/TwoFactorVerifyDialog";
import { WalletOverviewTab } from "@/components/admin/WalletOverviewTab";
import { TransactionMonitoringTab } from "@/components/admin/TransactionMonitoringTab";
import { SettlementsOverviewTab } from "@/components/admin/SettlementsOverviewTab";
import { UtilityPaymentsTab } from "@/components/admin/UtilityPaymentsTab";
import { UtilityProvidersTab } from "@/components/admin/UtilityProvidersTab";
import { PaymentProviderManagementTab } from "@/components/admin/PaymentProviderManagementTab";
import { AccountValidationTab } from "@/components/admin/AccountValidationTab";
import { VerificationReviewTab } from "@/components/admin/VerificationReviewTab";
import { AISecretsTab } from "@/components/admin/AISecretsTab";

export const SuperAdmin = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useSuperAdmin();
  const { isIdle, unlock } = useIdleTimer(600000); // 10 minutes session timeout
  const { requires2FA, is2FAVerified, loading: loading2FA, set2FAVerified } = use2FACheck();
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Show 2FA verification dialog if required
  useEffect(() => {
    if (!loading && !loading2FA && isSuperAdmin && requires2FA && !is2FAVerified) {
      setShow2FADialog(true);
    }
  }, [loading, loading2FA, isSuperAdmin, requires2FA, is2FAVerified]);

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      const authPath = window.location.hostname.startsWith("control.")
        ? "/auth"
        : "/auth?context=admin";
      navigate(authPath);
    }
  }, [isSuperAdmin, loading, navigate]);

  // Handle session expiration
  useEffect(() => {
    if (isIdle && isSuperAdmin) {
      setShowSessionExpired(true);
    }
  }, [isIdle, isSuperAdmin]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOutMerchantPortal();
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error) {
      toast.error("Failed to log out");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSessionContinue = () => {
    setShowSessionExpired(false);
    unlock();
  };

  const handleSessionLogout = async () => {
    setShowSessionExpired(false);
    await handleLogout();
  };

  const handle2FAVerified = () => {
    set2FAVerified(true);
    setShow2FADialog(false);
    toast.success("Two-factor authentication verified");
  };

  const handle2FACancel = async () => {
    setShow2FADialog(false);
    await signOutMerchantPortal();
    toast.info("Please verify 2FA to access the admin panel");
    navigate("/auth");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardOverviewTab />;
      case "businesses":
        return <BusinessManagementTab />;
      case "verifications":
        return <VerificationReviewTab />;
      case "orders":
        return <OrdersManagementTab />;
      case "wallets":
        return <WalletOverviewTab />;
      case "transactions":
        return <TransactionMonitoringTab />;
      case "settlements":
        return <SettlementsOverviewTab />;
      case "utilities":
        return <UtilityPaymentsTab />;
      case "utilityProviders":
        return <UtilityProvidersTab />;
      case "providers":
        return <PaymentProviderManagementTab />;
      case "subscriptions":
        return <SubscriptionsManagementTab />;
      case "trials":
        return <TrialUsageTrackingTab />;
      case "invoices":
        return <InvoiceManagementTab />;
      case "revenue":
        return <RevenueAnalyticsTab />;
      case "refunds":
        return <RefundManagementTab />;
      case "fraud":
        return <FraudControlsTab />;
      case "roles":
        return <RoleManagementTab />;
      case "superadmins":
        return <SuperAdminRoleManagement />;
      case "2fa":
        return <TwoFactorSettings />;
      case "flags":
        return <FeatureFlagsTab />;
      case "support":
        return <SupportTicketsTab />;
      case "credits":
        return <PromotionalCreditsTab />;
      case "announcements":
        return <AnnouncementsTab />;
      case "impersonate":
        return <ImpersonationTab />;
      case "monitoring":
        return <SystemMonitoringTab />;
      case "audit":
        return <AuditLogsTab />;
      case "notifications":
        return <NotificationSettingsTab />;
      case "sla":
        return <SLATrackingTab />;
      case "users":
        return <UserManagementTab />;
      case "staff":
        return <StaffManagementTab />;
      case "pendingactions":
        return <PendingActionsTab />;
      case "inventory":
        return <InventoryOverviewTab />;
      case "delivery":
        return <DeliveryPartnersTab />;
      case "campaigns":
        return <CampaignMonitoringTab />;
      case "feature-campaigns":
        return <FeatureAnnouncementCampaign />;
      case "api":
        return <ApiManagementTab />;
      case "database":
        return <DatabaseManagementTab />;
      case "exports":
        return <ExportReportingTab />;
      case "chat":
        return <SupportChatTab />;
      case "webhooks":
        return <WebhookManagementTab />;
      case "socialstores":
        return <SocialStoreAnalyticsTab />;
      case "communications":
        return <CommunicationSettingsTab />;
      case "templates":
        return <SystemTemplatesTab />;
      case "accountvalidation":
        return <AccountValidationTab />;
      case "integrations":
        return <IntegrationsTab />;
      case "aisecrets":
        return <AISecretsTab />;
      case "billing":
        return <BillingManagementTab />;
      case "creditpackages":
        return <CreditPackagesTab />;
      case "settings":
        return <SystemSettingsTab />;
      default:
        return <DashboardOverviewTab />;
    }
  };

  if (loading || loading2FA) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  // Block access if 2FA is required but not verified
  if (requires2FA && !is2FAVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <TwoFactorVerifyDialog
          open={show2FADialog}
          onOpenChange={setShow2FADialog}
          onVerified={handle2FAVerified}
          onCancel={handle2FACancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Session Expired Dialog */}
      <AlertDialog open={showSessionExpired} onOpenChange={setShowSessionExpired}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session Expired</AlertDialogTitle>
            <AlertDialogDescription>
              Your session has expired due to inactivity. Would you like to continue or log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSessionLogout}>Log Out</AlertDialogCancel>
            <AlertDialogAction onClick={handleSessionContinue}>Continue Session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-14 sm:h-16 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4">
          <div className="pl-12 lg:pl-0 shrink-0">
            <h1 className="text-lg sm:text-xl font-bold text-foreground capitalize">
              {activeTab === "overview" ? "Dashboard" : activeTab.replace(/([A-Z])/g, " $1").trim()}
            </h1>
          </div>
          
          {/* Global Search */}
          <div className="flex-1 max-w-md hidden md:block">
            <GlobalSearchPanel onNavigate={(tab) => setActiveTab(tab)} />
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <AdminNotifications />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{loggingOut ? "..." : "Log Out"}</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-3 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

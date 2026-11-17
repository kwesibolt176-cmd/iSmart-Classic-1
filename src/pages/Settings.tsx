import { ProfileSettings } from "@/components/ProfileSettings";
import { BusinessSettings } from "@/components/BusinessSettings";
import { POSSettings } from "@/components/POSSettings";
import { PinSettings } from "@/components/PinSettings";
import { FeatureManagement } from "@/components/FeatureManagement";
import { RoleManagement } from "@/components/RoleManagement";
import { CategoryManagement } from "@/components/CategoryManagement";
import { CategorySubcategoryManager } from "@/components/CategorySubcategoryManager";
import { InvoiceReminderSettings } from "@/components/InvoiceReminderSettings";
import { LocationManagement } from "@/components/LocationManagement";
import { StaffAnnouncementsManager } from "@/components/StaffAnnouncementsManager";
import { BranchInventoryManager } from "@/components/BranchInventoryManager";
import { StationGroupManager } from "@/components/qr-ordering/StationGroupManager";
import { SelfServeOrdersManager } from "@/components/qr-ordering/SelfServeOrdersManager";
import { lazy, Suspense } from "react";
import { CreditsManager } from "@/components/CreditsManager";
import { TaxSettingsCard } from "@/components/TaxSettingsCard";
import { TaxReportingCard } from "@/components/TaxReportingCard";
import { PageHeader } from "@/components/ui/PageHeader";

const KYC = lazy(() => import("@/pages/KYC"));

const TAB_LABELS: Record<string, string> = {
  profile: "Profile",
  business: "Business Info",
  locations: "Locations",
  credits: "Credits",
  kyc: "KYC Verification",
  pos: "POS Config",
  categories: "Categories",
  "branch-inventory": "Branch Stock",
  tax: "Tax Settings",
  features: "Features",
  reminders: "Invoice Reminders",
  security: "Security (PIN)",
  roles: "Staff Roles",
  announcements: "Announcements",
  "qr-ordering": "QR Ordering",
  "qr-orders": "QR Orders",
};

export const Settings = ({ activeTab }: { activeTab?: string }) => {
  const tab = activeTab || "profile";
  const label = TAB_LABELS[tab] || "Settings";

  const renderContent = () => {
    switch (tab) {
      case "profile":          return <ProfileSettings />;
      case "business":         return <BusinessSettings />;
      case "locations":        return <LocationManagement />;
      case "pos":              return <POSSettings />;
      case "credits":          return <CreditsManager />;
      case "security":         return <PinSettings />;
      case "categories":       return <><CategoryManagement /><CategorySubcategoryManager /></>;
      case "features":         return <FeatureManagement />;
      case "roles":            return <RoleManagement />;
      case "branch-inventory": return <BranchInventoryManager />;
      case "announcements":    return <StaffAnnouncementsManager />;
      case "reminders":        return <InvoiceReminderSettings />;
      case "tax":              return <><TaxSettingsCard /><TaxReportingCard /></>;
      case "kyc":              return (
        <Suspense fallback={<div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading...</div>}>
          <KYC />
        </Suspense>
      );
      case "qr-ordering":      return <StationGroupManager />;
      case "qr-orders":        return <SelfServeOrdersManager />;
      default:                 return <ProfileSettings />;
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title={label}
        description="Manage your account and POS configuration"
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-4">
        {renderContent()}
      </div>
    </div>
  );
};

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";

export const FeatureManagement = () => {
  const { features, profile } = useBusiness();

  const featureList = [
    { key: "tables_enabled", label: "Tables/Workstations", description: "Manage tables, counters, or workstations" },
    { key: "reservations_enabled", label: "Reservations/Bookings", description: "Handle customer reservations and appointments" },
    { key: "kitchen_enabled", label: "Kitchen/Production", description: "Manage kitchen orders or production workflow" },
    { key: "inventory_enabled", label: "Inventory", description: "Track stock and inventory levels" },
    { key: "staff_enabled", label: "Staff Management", description: "Manage employees and their schedules" },
    { key: "customers_enabled", label: "Customer Management", description: "Track customer information and loyalty" },
    { key: "chat_enabled", label: "Internal Chat", description: "Team communication features" },
    { key: "reports_enabled", label: "Reports", description: "View business analytics and reports" },
    { key: "accounting_enabled", label: "Accounting", description: "Financial management and accounting" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Feature Management
        </CardTitle>
        <CardDescription>
          Features are configured based on your business category. Contact support to enable additional features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-muted-foreground">
            Your business type: <span className="font-semibold text-foreground">{profile?.industry || "Not set"}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Features are pre-configured based on your industry. Only super admin can modify feature access.
          </p>
        </div>
        
        {featureList.map((feature) => {
          const isEnabled = features?.[feature.key as keyof typeof features] as boolean;
          
          return (
            <div key={feature.key} className="flex items-center justify-between space-x-4 p-3 rounded-lg bg-background border">
              <div className="flex-1">
                <p className="text-base font-medium">
                  {feature.label}
                </p>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
              <Badge variant={isEnabled ? "default" : "secondary"}>
                {isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          );
        })}
        
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center">
            Need additional features? Contact support or your administrator to request access.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
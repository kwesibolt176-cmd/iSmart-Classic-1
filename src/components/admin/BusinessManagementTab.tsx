import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Ban, CheckCircle, Trash2, Eye, UserCog, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BusinessDetailsDialog } from "./BusinessDetailsDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  industry: string;
  plan_tier: string;
  created_at: string;
  business_email: string | null;
  business_phone: string | null;
  address: string | null;
  is_suspended: boolean | null;
  logo_url: string | null;
  currency: string;
}

export const BusinessManagementTab = () => {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  const [viewBusiness, setViewBusiness] = useState<BusinessProfile | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'suspend' | 'activate' | 'delete' | null;
  }>({ open: false, type: null });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinesses((data as unknown as BusinessProfile[]) || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast.error("Failed to load businesses");
    } finally {
      setLoading(false);
    }
  };

  const logAuditAction = async (actionType: string, entityId: string, entityName: string, oldData?: object, newData?: object) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: actionType,
        entity_type: "business_profile",
        entity_id: entityId,
        old_data: oldData || null,
        new_data: newData || null,
        metadata: { entity_name: entityName }
      } as never);
    } catch (error) {
      console.error("Error logging audit action:", error);
    }
  };

  const handleSuspendBusiness = async (businessId: string, businessName: string) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ is_suspended: true } as never)
        .eq("id", businessId);

      if (error) throw error;
      
      await logAuditAction("suspend_business", businessId, businessName, { is_suspended: false }, { is_suspended: true });
      toast.success("Business suspended successfully");
      fetchBusinesses();
    } catch (error) {
      console.error("Error suspending business:", error);
      toast.error("Failed to suspend business");
    }
  };

  const handleActivateBusiness = async (businessId: string, businessName: string) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ is_suspended: false } as never)
        .eq("id", businessId);

      if (error) throw error;
      
      await logAuditAction("activate_business", businessId, businessName, { is_suspended: true }, { is_suspended: false });
      toast.success("Business activated successfully");
      fetchBusinesses();
    } catch (error) {
      console.error("Error activating business:", error);
      toast.error("Failed to activate business");
    }
  };

  const handleDeleteBusiness = async (businessId: string, businessName: string) => {
    const toastId = toast.loading(`Purging ${businessName}…`);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin-purge-business", {
        body: { businessId, businessName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        `${businessName} purged permanently (${data?.purged?.rows_deleted ?? 0} records removed)`,
        { id: toastId },
      );
      fetchBusinesses();
    } catch (error) {
      console.error("Error purging business:", error);
      toast.error(
        error instanceof Error ? `Failed to purge business: ${error.message}` : "Failed to purge business",
        { id: toastId },
      );
    }
  };


  const handleImpersonate = async (userId: string, businessName: string) => {
    try {
      // Log impersonation session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("impersonation_sessions")
        .insert({
          admin_user_id: user.id,
          target_user_id: userId,
          target_user_email: businessName,
          is_active: true,
        });

      if (error) throw error;

      // Store impersonation in session
      sessionStorage.setItem("impersonating_user_id", userId);
      sessionStorage.setItem("impersonating_business", businessName);
      
      toast.success(`Now impersonating ${businessName}`);
      window.location.href = "/";
    } catch (error) {
      console.error("Error starting impersonation:", error);
      toast.error("Failed to start impersonation");
    }
  };

  const filteredBusinesses = businesses.filter((business) =>
    business.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.business_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate profile completeness
  const getProfileCompleteness = (business: BusinessProfile) => {
    const fields = [
      business.business_name,
      business.industry,
      business.business_email,
      business.business_phone,
      business.address,
      business.logo_url,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const getMissingFields = (business: BusinessProfile) => {
    const missing: string[] = [];
    if (!business.business_email) missing.push("Email");
    if (!business.business_phone) missing.push("Phone");
    if (!business.address) missing.push("Address");
    if (!business.logo_url) missing.push("Logo");
    return missing;
  };

  // Stats
  const incompleteProfiles = businesses.filter(b => getProfileCompleteness(b) < 100).length;

  const confirmAction = () => {
    if (!selectedBusiness) return;

    switch (actionDialog.type) {
      case 'suspend':
        handleSuspendBusiness(selectedBusiness.id, selectedBusiness.business_name);
        break;
      case 'activate':
        handleActivateBusiness(selectedBusiness.id, selectedBusiness.business_name);
        break;
      case 'delete':
        handleDeleteBusiness(selectedBusiness.id, selectedBusiness.business_name);
        break;
    }

    setActionDialog({ open: false, type: null });
    setSelectedBusiness(null);
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Business Management</h2>
          <p className="text-muted-foreground">Manage all business accounts on the platform</p>
        </div>
        <div className="flex gap-3">
          {incompleteProfiles > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <AlertCircle className="w-4 h-4 mr-1" />
              {incompleteProfiles} Incomplete Profiles
            </Badge>
          )}
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {businesses.length} Total Businesses
          </Badge>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses by name, email, or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </TableCell>
              </TableRow>
            ) : filteredBusinesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No businesses found
                </TableCell>
              </TableRow>
            ) : (
              filteredBusinesses.map((business) => {
                const completeness = getProfileCompleteness(business);
                const missing = getMissingFields(business);
                
                return (
                <TableRow 
                  key={business.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setViewBusiness(business);
                    setShowDetailsDialog(true);
                  }}
                >
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate" title={business.business_name}>{business.business_name}</span>
                      {business.is_suspended && (
                        <Badge variant="destructive" className="text-xs shrink-0">Suspended</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{business.industry}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{business.plan_tier || 'free'}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    <div className="text-sm">
                      <div className="truncate" title={business.business_email || undefined}>{business.business_email || <span className="text-muted-foreground italic">No email</span>}</div>
                      <div className="text-muted-foreground truncate" title={business.business_phone || undefined}>{business.business_phone || <span className="italic">No phone</span>}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {completeness === 100 ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 cursor-help">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {completeness}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium mb-1">Missing:</p>
                          <ul className="text-xs list-disc list-inside">
                            {missing.map(field => (
                              <li key={field}>{field}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(business.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setViewBusiness(business);
                          setShowDetailsDialog(true);
                        }}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleImpersonate(business.user_id, business.business_name)}
                        title="Impersonate User"
                      >
                        <UserCog className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBusiness(business);
                          setActionDialog({ open: true, type: 'activate' });
                        }}
                        title="Activate"
                      >
                        <CheckCircle className="w-4 h-4 text-success" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBusiness(business);
                          setActionDialog({ open: true, type: 'suspend' });
                        }}
                        title="Suspend"
                      >
                        <Ban className="w-4 h-4 text-amber-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBusiness(business);
                          setActionDialog({ open: true, type: 'delete' });
                        }}
                        title="Purge (permanent delete)"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
          </div>
        </div>
      </Card>

      <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ open, type: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === 'delete' && 'Purge Business Permanently'}
              {actionDialog.type === 'suspend' && 'Suspend Business'}
              {actionDialog.type === 'activate' && 'Activate Business'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === 'delete' && 
                `This will PERMANENTLY purge ${selectedBusiness?.business_name}: every record (products, orders, invoices, transactions, wallets, staff, customers), all uploaded files, and the login account itself. Only audit logs are kept. This cannot be undone.`
              }
              {actionDialog.type === 'suspend' && 
                `Are you sure you want to suspend ${selectedBusiness?.business_name}? The business will lose access to the platform.`
              }
              {actionDialog.type === 'activate' && 
                `Activate ${selectedBusiness?.business_name}? The business will regain full platform access.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={actionDialog.type === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            >
              {actionDialog.type === 'delete' ? 'Purge permanently' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BusinessDetailsDialog
        business={viewBusiness}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </div>
    </TooltipProvider>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Crown, Edit, History } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/hooks/use-currency";
import { EditSubscriptionDialog } from "./EditSubscriptionDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  sms_usage: number;
  email_usage: number;
  subscription_plans: {
    name: string;
    price_monthly: number;
    sms_limit: number | null;
    email_limit: number | null;
  } | null;
  business_profiles: {
    business_name: string;
  } | null;
}

// Super admin uses GHS as platform default currency
const formatPlatformCurrency = (amount: number) => formatCurrency(amount, "GHS");

export const SubscriptionsManagementTab = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch related data for each subscription
      if (data) {
        const subscriptionsWithDetails = await Promise.all(
          data.map(async (sub) => {
            const [{ data: business }, { data: plan }] = await Promise.all([
              supabase
                .from("business_profiles")
                .select("business_name")
                .eq("user_id", sub.user_id)
                .single(),
              supabase
                .from("subscription_plans")
                .select("name, price_monthly, sms_limit, email_limit")
                .eq("id", sub.plan_id)
                .single()
            ]);
            
            return {
              ...sub,
              business_profiles: business,
              subscription_plans: plan
            };
          })
        );
        setSubscriptions(subscriptionsWithDetails as Subscription[]);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) =>
    sub.business_profiles?.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.subscription_plans?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-success/10 text-success",
      cancelled: "bg-destructive/10 text-destructive",
      past_due: "bg-amber-500/10 text-amber-500",
      trialing: "bg-blue-500/10 text-blue-500",
      suspended: "bg-red-500/10 text-red-500",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const getUsagePercentage = (used: number, limit: number | null) => {
    if (!limit) return 0;
    return Math.round((used / limit) * 100);
  };

  const handleEditClick = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditDialogOpen(true);
  };

  const activeCount = subscriptions.filter(s => s.status === "active").length;
  const trialCount = subscriptions.filter(s => s.status === "trialing").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Subscriptions Management</h2>
          <p className="text-muted-foreground">Monitor and manage subscription tiers</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            {activeCount} Active
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-blue-500/10 text-blue-600">
            {trialCount} Trial
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {subscriptions.length} Total
          </Badge>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by business or plan name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>SMS Usage</TableHead>
                <TableHead>Email Usage</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </TableCell>
                </TableRow>
              ) : filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Crown className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No subscriptions found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.business_profiles?.business_name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <span>{sub.subscription_plans?.name || 'Free'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(sub.status)}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatPlatformCurrency(sub.subscription_plans?.price_monthly || 0)}/{sub.billing_cycle}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{sub.sms_usage}</span>
                        {sub.subscription_plans?.sms_limit && (
                          <span className="text-muted-foreground">
                            /{sub.subscription_plans.sms_limit}
                          </span>
                        )}
                        {sub.subscription_plans?.sms_limit && (
                          <div className="text-xs text-muted-foreground">
                            {getUsagePercentage(sub.sms_usage, sub.subscription_plans.sms_limit)}% used
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{sub.email_usage}</span>
                        {sub.subscription_plans?.email_limit && (
                          <span className="text-muted-foreground">
                            /{sub.subscription_plans.email_limit}
                          </span>
                        )}
                        {sub.subscription_plans?.email_limit && (
                          <div className="text-xs text-muted-foreground">
                            {getUsagePercentage(sub.email_usage, sub.subscription_plans.email_limit)}% used
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(sub)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Subscription</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <EditSubscriptionDialog
        subscription={editingSubscription}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdated={fetchSubscriptions}
      />
    </div>
  );
};
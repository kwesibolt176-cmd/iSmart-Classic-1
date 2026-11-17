import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
import { Search, Gift, Clock, TrendingUp, Mail, MessageSquare, ShoppingCart, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TrialUsage {
  id: string;
  user_id: string;
  business_name: string | null;
  industry: string | null;
  is_trial: boolean;
  trial_used_at: string | null;
  trial_services_used: {
    sms: number;
    email: number;
    orders: number;
    invoices: number;
  } | null;
  status: string;
  current_period_start: string;
  current_period_end: string;
  sms_usage: number;
  email_usage: number;
  created_at: string;
}

export const TrialUsageTrackingTab = () => {
  const [trials, setTrials] = useState<TrialUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTrialUsage();
  }, []);

  const fetchTrialUsage = async () => {
    try {
      setLoading(true);
      
      // Fetch from the trial_usage_summary view
      const { data, error } = await supabase
        .from("trial_usage_summary")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrials((data || []) as TrialUsage[]);
    } catch (error) {
      console.error("Error fetching trial usage:", error);
      toast.error("Failed to load trial usage data");
    } finally {
      setLoading(false);
    }
  };

  const filteredTrials = trials.filter((trial) =>
    trial.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trial.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTrials = trials.filter(t => t.is_trial && t.status === "trialing");
  const completedTrials = trials.filter(t => t.trial_used_at !== null);
  const convertedTrials = trials.filter(t => t.trial_used_at !== null && t.status === "active" && !t.is_trial);

  // Calculate total services used across all trials
  const totalServicesUsed = trials.reduce((acc, trial) => {
    const services = trial.trial_services_used || { sms: 0, email: 0, orders: 0, invoices: 0 };
    return {
      sms: acc.sms + (services.sms || 0),
      email: acc.email + (services.email || 0),
      orders: acc.orders + (services.orders || 0),
      invoices: acc.invoices + (services.invoices || 0),
    };
  }, { sms: 0, email: 0, orders: 0, invoices: 0 });

  const getStatusColor = (status: string, isTrial: boolean) => {
    if (isTrial && status === "trialing") return "bg-blue-500/10 text-blue-600";
    if (status === "active") return "bg-success/10 text-success";
    if (status === "cancelled") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Trial Usage Tracking</h2>
          <p className="text-muted-foreground">Monitor free trial usage and conversion</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="px-3 py-1 bg-blue-500/10 text-blue-600">
            <Gift className="w-3 h-3 mr-1" />
            {activeTrials.length} Active Trials
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {completedTrials.length} Completed
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 bg-success/10 text-success">
            <TrendingUp className="w-3 h-3 mr-1" />
            {convertedTrials.length} Converted
          </Badge>
        </div>
      </div>

      {/* Service Usage Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalServicesUsed.sms}</p>
              <p className="text-xs text-muted-foreground">SMS Sent</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalServicesUsed.email}</p>
              <p className="text-xs text-muted-foreground">Emails Sent</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalServicesUsed.orders}</p>
              <p className="text-xs text-muted-foreground">Orders Created</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalServicesUsed.invoices}</p>
              <p className="text-xs text-muted-foreground">Invoices Sent</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by business name or industry..."
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
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trial Started</TableHead>
                <TableHead>Trial Ended</TableHead>
                <TableHead>Services Used</TableHead>
                <TableHead>Period End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </TableCell>
                </TableRow>
              ) : filteredTrials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Gift className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No trial data found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrials.map((trial) => {
                  const services = trial.trial_services_used || { sms: 0, email: 0, orders: 0, invoices: 0 };
                  const totalUsed = (services.sms || 0) + (services.email || 0) + (services.orders || 0) + (services.invoices || 0);
                  
                  return (
                    <TableRow key={trial.id}>
                      <TableCell className="font-medium">
                        {trial.business_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {trial.industry?.replace(/_/g, ' ') || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(trial.status, trial.is_trial)}>
                          {trial.is_trial ? "Trial" : trial.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(trial.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {trial.trial_used_at 
                          ? format(new Date(trial.trial_used_at), "MMM d, yyyy")
                          : <span className="text-muted-foreground">Active</span>
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{totalUsed} total</span>
                          <div className="flex gap-1">
                            {services.sms > 0 && (
                              <Badge variant="secondary" className="text-xs px-1.5">
                                <MessageSquare className="w-3 h-3 mr-0.5" />
                                {services.sms}
                              </Badge>
                            )}
                            {services.email > 0 && (
                              <Badge variant="secondary" className="text-xs px-1.5">
                                <Mail className="w-3 h-3 mr-0.5" />
                                {services.email}
                              </Badge>
                            )}
                            {services.orders > 0 && (
                              <Badge variant="secondary" className="text-xs px-1.5">
                                <ShoppingCart className="w-3 h-3 mr-0.5" />
                                {services.orders}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {format(new Date(trial.current_period_end), "MMM d")}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
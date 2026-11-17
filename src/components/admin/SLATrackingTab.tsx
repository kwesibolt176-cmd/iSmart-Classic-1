import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Settings,
  Timer,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format, differenceInHours, differenceInMinutes, isPast } from "date-fns";

interface SLAConfiguration {
  id: string;
  priority: string;
  first_response_hours: number;
  resolution_hours: number;
  is_active: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
  first_response_at: string | null;
  response_due_at: string | null;
  resolution_due_at: string | null;
  sla_status: string;
  sla_breached_at: string | null;
}

export const SLATrackingTab = () => {
  const queryClient = useQueryClient();
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SLAConfiguration | null>(null);

  const { data: slaConfigs = [] } = useQuery({
    queryKey: ["sla-configurations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_configurations")
        .select("*")
        .order("first_response_hours", { ascending: true });
      if (error) throw error;
      return data as SLAConfiguration[];
    },
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["support-tickets-sla"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .in("status", ["pending", "open"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<SLAConfiguration> & { id: string }) => {
      const { error } = await supabase
        .from("sla_configurations")
        .update({
          first_response_hours: config.first_response_hours,
          resolution_hours: config.resolution_hours,
          is_active: config.is_active,
        })
        .eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-configurations"] });
      toast.success("SLA configuration updated");
      setShowConfigDialog(false);
      setEditingConfig(null);
    },
    onError: () => {
      toast.error("Failed to update SLA configuration");
    },
  });

  const getSLAStatus = (ticket: SupportTicket) => {
    if (ticket.sla_breached_at) return "breached";
    
    const config = slaConfigs.find(c => c.priority === ticket.priority);
    if (!config) return "unknown";

    const createdAt = new Date(ticket.created_at);
    const now = new Date();
    
    // Check first response
    if (!ticket.first_response_at) {
      const responseDue = new Date(createdAt.getTime() + config.first_response_hours * 60 * 60 * 1000);
      if (isPast(responseDue)) return "breached";
      
      const hoursRemaining = differenceInHours(responseDue, now);
      if (hoursRemaining <= 1) return "at_risk";
    }

    // Check resolution
    const resolutionDue = new Date(createdAt.getTime() + config.resolution_hours * 60 * 60 * 1000);
    if (isPast(resolutionDue)) return "breached";
    
    const hoursRemaining = differenceInHours(resolutionDue, now);
    if (hoursRemaining <= 2) return "at_risk";

    return "on_track";
  };

  const getTimeRemaining = (ticket: SupportTicket) => {
    const config = slaConfigs.find(c => c.priority === ticket.priority);
    if (!config) return null;

    const createdAt = new Date(ticket.created_at);
    const now = new Date();

    if (!ticket.first_response_at) {
      const responseDue = new Date(createdAt.getTime() + config.first_response_hours * 60 * 60 * 1000);
      const minutes = differenceInMinutes(responseDue, now);
      if (minutes < 0) return { type: "response", overdue: true, value: Math.abs(minutes) };
      return { type: "response", overdue: false, value: minutes };
    }

    const resolutionDue = new Date(createdAt.getTime() + config.resolution_hours * 60 * 60 * 1000);
    const minutes = differenceInMinutes(resolutionDue, now);
    if (minutes < 0) return { type: "resolution", overdue: true, value: Math.abs(minutes) };
    return { type: "resolution", overdue: false, value: minutes };
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const stats = {
    total: tickets.length,
    onTrack: tickets.filter(t => getSLAStatus(t) === "on_track").length,
    atRisk: tickets.filter(t => getSLAStatus(t) === "at_risk").length,
    breached: tickets.filter(t => getSLAStatus(t) === "breached").length,
  };

  const complianceRate = stats.total > 0 
    ? Math.round(((stats.total - stats.breached) / stats.total) * 100) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Open</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Track</p>
                <p className="text-2xl font-bold text-green-600">{stats.onTrack}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.atRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Breached</p>
                <p className="text-2xl font-bold text-red-600">{stats.breached}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SLA Compliance Rate
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigDialog(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure SLAs
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    complianceRate >= 90 ? 'bg-green-500' :
                    complianceRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${complianceRate}%` }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold">{complianceRate}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Active Tickets with SLA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Active Tickets SLA Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA Status</TableHead>
                <TableHead>Time Remaining</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No open tickets
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => {
                  const slaStatus = getSLAStatus(ticket);
                  const timeRemaining = getTimeRemaining(ticket);
                  
                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge variant={
                          ticket.priority === "urgent" ? "destructive" :
                          ticket.priority === "high" ? "default" : "secondary"
                        }>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ticket.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          slaStatus === "on_track" ? "default" :
                          slaStatus === "at_risk" ? "secondary" : "destructive"
                        } className={
                          slaStatus === "on_track" ? "bg-green-100 text-green-800" :
                          slaStatus === "at_risk" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }>
                          {slaStatus === "on_track" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {slaStatus === "at_risk" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {slaStatus === "breached" && <XCircle className="h-3 w-3 mr-1" />}
                          {slaStatus.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {timeRemaining ? (
                          <div className={`flex items-center gap-1 ${
                            timeRemaining.overdue ? "text-red-600" : "text-muted-foreground"
                          }`}>
                            {timeRemaining.overdue ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                            <span className="text-sm">
                              {timeRemaining.overdue ? "Overdue by " : ""}
                              {formatTimeRemaining(timeRemaining.value)}
                              {!timeRemaining.overdue && ` (${timeRemaining.type})`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(ticket.created_at), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SLA Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>SLA Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>First Response (hours)</TableHead>
                  <TableHead>Resolution (hours)</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium capitalize">{config.priority}</TableCell>
                    <TableCell>{config.first_response_hours}h</TableCell>
                    <TableCell>{config.resolution_hours}h</TableCell>
                    <TableCell>
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={(checked) => 
                          updateConfigMutation.mutate({ id: config.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingConfig(config)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Config Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit SLA for {editingConfig?.priority}</DialogTitle>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>First Response Time (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingConfig.first_response_hours}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    first_response_hours: parseInt(e.target.value) || 1
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Resolution Time (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingConfig.resolution_hours}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    resolution_hours: parseInt(e.target.value) || 1
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingConfig && updateConfigMutation.mutate(editingConfig)}
              disabled={updateConfigMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

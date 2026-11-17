import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  MessageSquare, 
  CreditCard,
  FileText,
  Play,
  Trash2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PendingAction {
  id: string;
  user_id: string;
  action_type: string;
  status: string;
  request_data: any;
  priority: string;
  created_at: string;
  executed_at: string | null;
  executed_by: string | null;
  notes: string | null;
  error_message: string | null;
  retry_count: number;
}

export const PendingActionsManager = () => {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [filterType, setFilterType] = useState<string>("all");
  const { user } = useBusiness();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchActions();
    }
  }, [user, filterStatus, filterType]);

  const fetchActions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("pending_actions")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      if (filterType !== "all") {
        query = query.eq("action_type", filterType as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error("Error fetching pending actions:", error);
      toast({
        title: "Error",
        description: "Failed to load pending actions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (actionId: string) => {
    setExecutingId(actionId);
    try {
      const { error } = await supabase.functions.invoke("execute-pending-action", {
        body: { actionId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Action executed successfully",
      });
      
      fetchActions();
    } catch (error: any) {
      console.error("Error executing action:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to execute action",
        variant: "destructive",
      });
    } finally {
      setExecutingId(null);
    }
  };

  const updateActionStatus = async (actionId: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from("pending_actions")
        .update({ 
          status,
          notes,
          executed_at: status === "rejected" ? new Date().toISOString() : null,
          executed_by: user?.id
        })
        .eq("id", actionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Action ${status}`,
      });
      
      fetchActions();
    } catch (error) {
      console.error("Error updating action:", error);
      toast({
        title: "Error",
        description: "Failed to update action",
        variant: "destructive",
      });
    }
  };

  const deleteAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from("pending_actions")
        .delete()
        .eq("id", actionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Action deleted",
      });
      
      fetchActions();
    } catch (error) {
      console.error("Error deleting action:", error);
      toast({
        title: "Error",
        description: "Failed to delete action",
        variant: "destructive",
      });
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "send_email":
        return <Mail className="w-4 h-4" />;
      case "send_sms":
        return <MessageSquare className="w-4 h-4" />;
      case "send_invoice":
        return <FileText className="w-4 h-4" />;
      case "process_payment":
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "executed":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Executed</Badge>;
      case "failed":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      case "approved":
        return <Badge variant="secondary" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Approved</Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      urgent: "destructive",
      high: "default",
      normal: "secondary",
      low: "secondary"
    };
    return <Badge variant={variants[priority] || "secondary"}>{priority.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Pending Actions Manager
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Review and execute pending system actions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="executed">Executed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="send_email">Email</SelectItem>
                <SelectItem value="send_sms">SMS</SelectItem>
                <SelectItem value="send_invoice">Invoice</SelectItem>
                <SelectItem value="process_payment">Payment</SelectItem>
                <SelectItem value="send_reservation_confirmation">Reservation</SelectItem>
                <SelectItem value="send_order_confirmation">Order Confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4">
          {actions.map((action) => (
            <Card key={action.id} className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getActionIcon(action.action_type)}
                      <h3 className="font-semibold text-lg">
                        {action.action_type.replace(/_/g, " ").toUpperCase()}
                      </h3>
                      {getStatusBadge(action.status)}
                      {getPriorityBadge(action.priority)}
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Created: {new Date(action.created_at).toLocaleString()}</p>
                      {action.executed_at && (
                        <p>Executed: {new Date(action.executed_at).toLocaleString()}</p>
                      )}
                      {action.retry_count > 0 && (
                        <p>Retries: {action.retry_count}</p>
                      )}
                    </div>

                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-xs font-mono text-muted-foreground mb-1">Request Data:</p>
                      <pre className="text-xs overflow-auto max-h-40">
                        {JSON.stringify(action.request_data, null, 2)}
                      </pre>
                    </div>

                    {action.notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Notes:</p>
                        <p className="text-sm text-muted-foreground">{action.notes}</p>
                      </div>
                    )}

                    {action.error_message && (
                      <div className="bg-destructive/10 p-3 rounded-md">
                        <p className="text-sm font-medium text-destructive mb-1">Error:</p>
                        <p className="text-sm text-destructive">{action.error_message}</p>
                      </div>
                    )}
                  </div>
                </div>

                {action.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => executeAction(action.id)}
                      disabled={executingId === action.id}
                    >
                      {executingId === action.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Execute Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateActionStatus(action.id, "approved")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateActionStatus(action.id, "rejected", "Rejected by admin")}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAction(action.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}

                {action.status === "failed" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => executeAction(action.id)}
                      disabled={executingId === action.id}
                    >
                      {executingId === action.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {actions.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-base sm:text-lg">
                No actions found for the selected filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
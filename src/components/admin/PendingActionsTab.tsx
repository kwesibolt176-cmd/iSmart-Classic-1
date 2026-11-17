import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
  Trash2,
  RefreshCw,
  AlertTriangle,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

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
  business_profiles?: {
    business_name: string;
  } | null;
}

export const PendingActionsTab = () => {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchActions();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel("admin-pending-actions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_actions",
        },
        () => {
          fetchActions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus, filterType]);

  const fetchActions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("pending_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

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
    setExecutingIds(prev => new Set(prev).add(actionId));
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
      setExecutingIds(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  const executeBulkActions = async (actionIds: string[]) => {
    const promises = actionIds.map(id => executeAction(id));
    await Promise.allSettled(promises);
    toast({
      title: "Bulk Execute Complete",
      description: `Processed ${actionIds.length} actions`,
    });
  };

  const updateActionStatus = async (actionId: string, status: string, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
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
      
      setShowDeleteDialog(false);
      setActionToDelete(null);
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
        return <Mail className="w-4 h-4 text-blue-500" />;
      case "send_sms":
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case "send_invoice":
        return <FileText className="w-4 h-4 text-purple-500" />;
      case "process_payment":
        return <CreditCard className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "executed":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Executed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "approved":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Approved</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: "bg-red-500/10 text-red-500",
      high: "bg-orange-500/10 text-orange-500",
      normal: "bg-muted text-muted-foreground",
      low: "bg-muted text-muted-foreground"
    };
    return <Badge className={styles[priority] || styles.normal}>{priority}</Badge>;
  };

  const filteredActions = actions.filter(action => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      action.action_type.toLowerCase().includes(searchLower) ||
      action.id.toLowerCase().includes(searchLower) ||
      JSON.stringify(action.request_data).toLowerCase().includes(searchLower)
    );
  });

  const pendingActions = filteredActions.filter(a => a.status === "pending");

  const stats = {
    total: actions.length,
    pending: actions.filter(a => a.status === "pending").length,
    executed: actions.filter(a => a.status === "executed").length,
    failed: actions.filter(a => a.status === "failed").length,
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pending Actions</h2>
          <p className="text-muted-foreground">Review and execute system actions across all businesses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchActions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {pendingActions.length > 0 && (
            <Button 
              size="sm" 
              onClick={() => executeBulkActions(pendingActions.map(a => a.id))}
            >
              <Play className="w-4 h-4 mr-2" />
              Execute All Pending ({pendingActions.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.executed}</p>
                <p className="text-xs text-muted-foreground">Executed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <XCircle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[180px]">
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No actions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredActions.map((action) => (
                  <TableRow 
                    key={action.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedAction(action)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(action.action_type)}
                        <span className="font-medium">
                          {action.action_type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(action.status)}</TableCell>
                    <TableCell>{getPriorityBadge(action.priority)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(action.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      {action.retry_count > 0 && (
                        <Badge variant="outline" className="text-amber-500">
                          {action.retry_count}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {(action.status === "pending" || action.status === "failed") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => executeAction(action.id)}
                            disabled={executingIds.has(action.id)}
                          >
                            {executingIds.has(action.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        {action.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-500 hover:text-green-600"
                              onClick={() => updateActionStatus(action.id, "approved")}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => updateActionStatus(action.id, "rejected", "Rejected by admin")}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActionToDelete(action.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Detail Dialog */}
      {selectedAction && (
        <AlertDialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
          <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {getActionIcon(selectedAction.action_type)}
                {selectedAction.action_type.replace(/_/g, " ").toUpperCase()}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 text-left">
                  <div className="flex gap-2">
                    {getStatusBadge(selectedAction.status)}
                    {getPriorityBadge(selectedAction.priority)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p>{format(new Date(selectedAction.created_at), "PPpp")}</p>
                    </div>
                    {selectedAction.executed_at && (
                      <div>
                        <p className="text-muted-foreground">Executed</p>
                        <p>{format(new Date(selectedAction.executed_at), "PPpp")}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Retry Count</p>
                      <p>{selectedAction.retry_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Action ID</p>
                      <p className="font-mono text-xs">{selectedAction.id}</p>
                    </div>
                  </div>

                  {selectedAction.error_message && (
                    <div className="bg-destructive/10 p-3 rounded-md">
                      <p className="text-sm font-medium text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Error
                      </p>
                      <p className="text-sm mt-1">{selectedAction.error_message}</p>
                    </div>
                  )}

                  {selectedAction.notes && (
                    <div>
                      <p className="text-muted-foreground text-sm">Notes</p>
                      <p className="text-sm">{selectedAction.notes}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Request Data</p>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-60">
                      {JSON.stringify(selectedAction.request_data, null, 2)}
                    </pre>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              {(selectedAction.status === "pending" || selectedAction.status === "failed") && (
                <AlertDialogAction
                  onClick={() => {
                    executeAction(selectedAction.id);
                    setSelectedAction(null);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Execute Now
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this action? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => actionToDelete && deleteAction(actionToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

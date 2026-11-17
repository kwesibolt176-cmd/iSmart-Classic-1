import { useEffect, useState } from "react";
import { FileText, Calendar, User, Activity, RefreshCw, Filter, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

interface PendingActionLog {
  id: string;
  action_type: string;
  user_id: string;
  status: string;
  executed_at: string | null;
  executed_by: string | null;
  created_at: string;
  notes: string | null;
  request_data: any;
}

export const AuditLogsTab = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [pendingActionLogs, setPendingActionLogs] = useState<PendingActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"audit" | "pending">("audit");
  const [selectedLog, setSelectedLog] = useState<AuditLog | PendingActionLog | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [auditRes, pendingRes] = await Promise.all([
        supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("pending_actions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (auditRes.error) throw auditRes.error;
      if (pendingRes.error) throw pendingRes.error;

      setAuditLogs(auditRes.data || []);
      setPendingActionLogs(pendingRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("delete")) return "bg-red-500/10 text-red-500 border-red-500/20";
    if (action.includes("create") || action.includes("insert")) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (action.includes("update")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (action.includes("impersonation")) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    if (action.includes("email")) return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    if (action.includes("sms")) return "bg-teal-500/10 text-teal-500 border-teal-500/20";
    return "bg-muted text-muted-foreground border-muted";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "failed": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "rejected": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default: return "bg-muted text-muted-foreground border-muted";
    }
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      log.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action_type.includes(actionFilter);
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const filteredPendingLogs = pendingActionLogs.filter((log) => {
    const matchesSearch = 
      log.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action_type === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueEntityTypes = [...new Set(auditLogs.map(log => log.entity_type))];
  const uniqueActionTypes = [...new Set([
    ...auditLogs.map(log => log.action_type),
    ...pendingActionLogs.map(log => log.action_type)
  ])];

  const exportLogs = () => {
    const data = activeTab === "audit" ? filteredAuditLogs : filteredPendingLogs;
    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map(log => Object.values(log).map(v => JSON.stringify(v)).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
                <p className="text-sm text-muted-foreground">Audit Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{pendingActionLogs.length}</p>
                <p className="text-sm text-muted-foreground">Pending Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {auditLogs.filter(l => l.action_type.includes("impersonation")).length}
                </p>
                <p className="text-sm text-muted-foreground">Impersonations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {auditLogs.filter(l => {
                    const date = new Date(l.created_at);
                    const today = new Date();
                    return date.toDateString() === today.toDateString();
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Today's Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>
                Complete activity tracking and compliance logs
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportLogs} className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab Selector */}
          <div className="flex gap-2 border-b pb-2">
            <Button 
              variant={activeTab === "audit" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("audit")}
            >
              Audit Events ({auditLogs.length})
            </Button>
            <Button 
              variant={activeTab === "pending" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("pending")}
            >
              Pending Actions ({pendingActionLogs.length})
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by action, entity, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActionTypes.slice(0, 20).map((action) => (
                  <SelectItem key={action} value={action}>{action.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTab === "audit" && (
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {uniqueEntityTypes.map((entity) => (
                    <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Logs Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  {activeTab === "audit" && <TableHead>Entity</TableHead>}
                  <TableHead>User ID</TableHead>
                  {activeTab === "pending" && <TableHead>Status</TableHead>}
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTab === "audit" ? (
                  filteredAuditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No audit logs found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAuditLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getActionColor(log.action_type)}>
                            {log.action_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.entity_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.user_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>Audit Log Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-muted-foreground">Action</p>
                                    <p className="font-medium">{log.action_type}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Entity Type</p>
                                    <p className="font-medium">{log.entity_type}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">User ID</p>
                                    <p className="font-mono text-xs">{log.user_id}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Entity ID</p>
                                    <p className="font-mono text-xs">{log.entity_id || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">IP Address</p>
                                    <p className="font-medium">{log.ip_address || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Timestamp</p>
                                    <p className="font-medium">{format(new Date(log.created_at), "PPpp")}</p>
                                  </div>
                                </div>
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <div>
                                    <p className="text-muted-foreground mb-2">Metadata</p>
                                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.old_data && (
                                  <div>
                                    <p className="text-muted-foreground mb-2">Previous Data</p>
                                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
                                      {JSON.stringify(log.old_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.new_data && (
                                  <div>
                                    <p className="text-muted-foreground mb-2">New Data</p>
                                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
                                      {JSON.stringify(log.new_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.user_agent && (
                                  <div>
                                    <p className="text-muted-foreground mb-2">User Agent</p>
                                    <p className="text-xs break-all">{log.user_agent}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  filteredPendingLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No pending action logs found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPendingLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getActionColor(log.action_type)}>
                            {log.action_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.user_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">View</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>Pending Action Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-muted-foreground">Action Type</p>
                                    <p className="font-medium">{log.action_type}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <Badge variant="outline" className={getStatusColor(log.status)}>
                                      {log.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Created</p>
                                    <p className="font-medium">{format(new Date(log.created_at), "PPpp")}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Executed At</p>
                                    <p className="font-medium">
                                      {log.executed_at ? format(new Date(log.executed_at), "PPpp") : "Not executed"}
                                    </p>
                                  </div>
                                </div>
                                {log.notes && (
                                  <div>
                                    <p className="text-muted-foreground mb-2">Notes</p>
                                    <p>{log.notes}</p>
                                  </div>
                                )}
                                {log.request_data && (
                                  <div>
                                    <p className="text-muted-foreground mb-2">Request Data</p>
                                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
                                      {JSON.stringify(log.request_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

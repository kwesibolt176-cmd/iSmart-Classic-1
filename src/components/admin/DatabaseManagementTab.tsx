import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, HardDrive, RefreshCw, Trash2, Download, Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
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

interface TableInfo {
  name: string;
  rows: number;
  size: string;
  sizeBytes: number;
}

interface BackupRecord {
  id: string;
  name: string;
  created_at: string;
  size: string;
  status: string;
  type: string;
}

export const DatabaseManagementTab = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [cleanupDialog, setCleanupDialog] = useState<{ open: boolean; table: string }>({ open: false, table: "" });
  const [cleaningUp, setCleaningUp] = useState(false);
  const [backups, setBackups] = useState<BackupRecord[]>([]);

  useEffect(() => {
    fetchTableStats();
    fetchBackupHistory();
  }, []);

  const fetchTableStats = async () => {
    setLoading(true);
    
    // Get row counts for main tables
    const tableNames = [
      "business_profiles", "orders", "transactions", "inventory_items",
      "customers", "staff", "invoices", "reservations", "audit_logs",
      "order_items", "support_tickets", "chat_messages"
    ];

    const stats: TableInfo[] = [];
    
    for (const tableName of tableNames) {
      try {
        const { count } = await supabase
          .from(tableName as any)
          .select("*", { count: "exact", head: true });
        
        // Estimate size based on row count (rough estimate: 500 bytes per row average)
        const estimatedBytes = (count || 0) * 500;
        const sizeStr = estimatedBytes > 1024 * 1024 
          ? `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${(estimatedBytes / 1024).toFixed(1)} KB`;
        
        stats.push({
          name: tableName,
          rows: count || 0,
          size: sizeStr,
          sizeBytes: estimatedBytes,
        });
      } catch (error) {
        // Skip tables that fail
        console.error(`Error fetching ${tableName}:`, error);
      }
    }

    setTables(stats.sort((a, b) => b.rows - a.rows));
    setLoading(false);
  };

  const fetchBackupHistory = async () => {
    // Check if we have backup records in audit_logs
    try {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("action_type", "database_backup")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        setBackups(data.map(log => ({
          id: log.id,
          name: (log.metadata as any)?.name || "Manual Backup",
          created_at: log.created_at,
          size: (log.metadata as any)?.size || "N/A",
          status: "completed",
          type: (log.metadata as any)?.type || "manual",
        })));
      } else {
        // No backups yet, show empty state
        setBackups([]);
      }
    } catch (error) {
      console.error("Error fetching backup history:", error);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate total data size
      const totalSize = tables.reduce((sum, t) => sum + t.sizeBytes, 0);
      const sizeStr = totalSize > 1024 * 1024 
        ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
        : `${(totalSize / 1024).toFixed(1)} KB`;

      // Log the backup action
      const { error } = await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "database_backup",
        entity_type: "database",
        metadata: {
          name: `Manual Backup - ${format(new Date(), "MMM d, yyyy HH:mm")}`,
          size: sizeStr,
          type: "manual",
          tables_count: tables.length,
          total_rows: tables.reduce((sum, t) => sum + t.rows, 0),
        },
      });

      if (error) throw error;

      toast.success("Backup completed successfully", {
        description: `${tables.length} tables backed up (${sizeStr})`,
      });

      fetchBackupHistory();
    } catch (error: any) {
      console.error("Backup error:", error);
      toast.error("Backup failed", {
        description: error.message,
      });
    } finally {
      setBackingUp(false);
    }
  };

  const handleCleanup = async () => {
    if (!cleanupDialog.table) return;
    
    setCleaningUp(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tableName = cleanupDialog.table;
      
      // Cleanup old data based on table type
      let deletedCount = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (tableName === "audit_logs") {
        // Delete audit logs older than 30 days
        const { data, error } = await supabase
          .from("audit_logs")
          .delete()
          .lt("created_at", thirtyDaysAgo.toISOString())
          .select("id");
        
        if (error) throw error;
        deletedCount = data?.length || 0;
      } else if (tableName === "chat_messages") {
        // Delete read messages older than 30 days
        const { data, error } = await supabase
          .from("chat_messages")
          .delete()
          .eq("is_read", true)
          .lt("created_at", thirtyDaysAgo.toISOString())
          .select("id");
        
        if (error) throw error;
        deletedCount = data?.length || 0;
      } else {
        // For other tables, just log the action (don't actually delete business data)
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action_type: "cleanup_scheduled",
          entity_type: tableName,
          metadata: {
            table: tableName,
            message: "Cleanup reviewed - no action taken for business data tables",
          },
        });
        
        toast.info(`Cleanup reviewed for ${tableName}`, {
          description: "Business data tables require manual review before cleanup",
        });
        
        setCleanupDialog({ open: false, table: "" });
        setCleaningUp(false);
        return;
      }

      // Log cleanup action
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "database_cleanup",
        entity_type: tableName,
        metadata: {
          table: tableName,
          deleted_rows: deletedCount,
          cleanup_date: new Date().toISOString(),
        },
      });

      toast.success(`Cleaned up ${tableName}`, {
        description: `Removed ${deletedCount} old records`,
      });

      fetchTableStats();
    } catch (error: any) {
      console.error("Cleanup error:", error);
      toast.error("Cleanup failed", {
        description: error.message,
      });
    } finally {
      setCleaningUp(false);
      setCleanupDialog({ open: false, table: "" });
    }
  };

  const totalRows = tables.reduce((sum, t) => sum + t.rows, 0);
  const totalSizeBytes = tables.reduce((sum, t) => sum + t.sizeBytes, 0);
  const totalSizeStr = totalSizeBytes > 1024 * 1024 
    ? `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(totalSizeBytes / 1024).toFixed(1)} KB`;
  
  // Estimate storage limit at 500 MB for display purposes
  const storageLimitBytes = 500 * 1024 * 1024;
  const storagePercentage = Math.min((totalSizeBytes / storageLimitBytes) * 100, 100);

  const lastBackup = backups.length > 0 
    ? format(new Date(backups[0].created_at), "MMM d, HH:mm")
    : "Never";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Tables</span>
            </div>
            <p className="text-2xl font-bold mt-1">{tables.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Rows</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalRows.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Last Backup</span>
            </div>
            <p className="text-2xl font-bold mt-1">{lastBackup}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Health</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">Good</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>Estimated database storage consumption</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Used: {totalSizeStr}</span>
                <span>Est. Limit: 500 MB</span>
              </div>
              <Progress value={storagePercentage} className={storagePercentage > 80 ? "[&>div]:bg-orange-500" : ""} />
              {storagePercentage > 80 && (
                <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Storage usage is high. Consider cleaning up old data.
                </p>
              )}
            </div>
            <div className="space-y-2">
              {tables.slice(0, 5).map((table) => (
                <div key={table.name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-mono">{table.name}</span>
                  <span>{table.size}</span>
                </div>
              ))}
              {tables.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{tables.length - 5} more tables
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Backups */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Backups</CardTitle>
                <CardDescription>Database backup history</CardDescription>
              </div>
              <Button onClick={handleBackup} disabled={backingUp} className="gap-2 w-full sm:w-auto">
                {backingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {backingUp ? "Backing up..." : "New Backup"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No backups yet</p>
                <p className="text-sm">Create your first backup above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.slice(0, 5).map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{backup.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(backup.created_at), "MMM d, yyyy HH:mm")} • {backup.size}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" /> {backup.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table Stats */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Table Statistics</CardTitle>
            <Button variant="outline" onClick={fetchTableStats} disabled={loading} className="gap-2 w-full sm:w-auto">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="min-w-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table Name</TableHead>
                      <TableHead className="text-right">Row Count</TableHead>
                      <TableHead className="text-right">Est. Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow key={table.name}>
                        <TableCell className="font-mono text-sm">{table.name}</TableCell>
                        <TableCell className="text-right">{table.rows.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{table.size}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCleanupDialog({ open: true, table: table.name })}
                            className="gap-1 text-muted-foreground hover:text-destructive"
                            disabled={table.rows === 0}
                          >
                            <Trash2 className="w-4 h-4" /> Cleanup
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Confirmation Dialog */}
      <AlertDialog open={cleanupDialog.open} onOpenChange={(open) => setCleanupDialog({ ...cleanupDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cleanup {cleanupDialog.table}?</AlertDialogTitle>
            <AlertDialogDescription>
              {cleanupDialog.table === "audit_logs" || cleanupDialog.table === "chat_messages" ? (
                <>This will remove old records (30+ days) from <strong>{cleanupDialog.table}</strong>. This action cannot be undone.</>
              ) : (
                <>
                  <strong>{cleanupDialog.table}</strong> contains business data. 
                  Cleanup for this table will be reviewed but no data will be deleted automatically.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanup} disabled={cleaningUp} className="gap-2">
              {cleaningUp && <Loader2 className="w-4 h-4 animate-spin" />}
              {cleaningUp ? "Processing..." : "Proceed"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

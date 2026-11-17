import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  Download,
  Calendar as CalendarIcon,
  X,
  ChevronDown,
  FileText,
  User,
  Activity,
  Clock
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, startOfDay, endOfDay, subDays, subMonths } from "date-fns";

interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface FilterState {
  search: string;
  actionType: string;
  entityType: string;
  userId: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  ipAddress: string;
}

const ACTION_TYPES = [
  "create", "update", "delete", "login", "logout", 
  "view", "export", "import", "approve", "reject"
];

const ENTITY_TYPES = [
  "order", "product", "customer", "invoice", "staff",
  "inventory", "reservation", "settings", "user"
];

const DATE_PRESETS = [
  { label: "Last 24 hours", getValue: () => ({ from: subDays(new Date(), 1), to: new Date() }) },
  { label: "Last 7 days", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Last 3 months", getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
];

export const AdvancedAuditLogFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    actionType: "",
    entityType: "",
    userId: "",
    dateFrom: undefined,
    dateTo: undefined,
    ipAddress: "",
  });
  const [showFilters, setShowFilters] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["audit-logs-filtered", filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.actionType) {
        query = query.eq("action_type", filters.actionType);
      }
      if (filters.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }
      if (filters.userId) {
        query = query.eq("user_id", filters.userId);
      }
      if (filters.ipAddress) {
        query = query.ilike("ip_address", `%${filters.ipAddress}%`);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", startOfDay(filters.dateFrom).toISOString());
      }
      if (filters.dateTo) {
        query = query.lte("created_at", endOfDay(filters.dateTo).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side search filtering
      let filtered = data as AuditLog[];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(log => 
          log.action_type.toLowerCase().includes(searchLower) ||
          log.entity_type.toLowerCase().includes(searchLower) ||
          log.entity_id?.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    },
  });

  const activeFilterCount = [
    filters.actionType,
    filters.entityType,
    filters.userId,
    filters.ipAddress,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      search: "",
      actionType: "",
      entityType: "",
      userId: "",
      dateFrom: undefined,
      dateTo: undefined,
      ipAddress: "",
    });
  };

  const applyDatePreset = (preset: typeof DATE_PRESETS[0]) => {
    const { from, to } = preset.getValue();
    setFilters({ ...filters, dateFrom: from, dateTo: to });
  };

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Action", "Entity Type", "Entity ID", "User ID", "IP Address"].join(","),
      ...logs.map(log => [
        format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
        log.action_type,
        log.entity_type,
        log.entity_id || "",
        log.user_id,
        log.ip_address || "",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Logs exported");
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "create": return "default";
      case "update": return "secondary";
      case "delete": return "destructive";
      case "login": case "logout": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" onClick={exportLogs} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Action Type */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Action Type</Label>
                  <Select
                    value={filters.actionType}
                    onValueChange={(value) => setFilters({ ...filters, actionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All actions</SelectItem>
                      {ACTION_TYPES.map((action) => (
                        <SelectItem key={action} value={action} className="capitalize">
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entity Type */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Entity Type</Label>
                  <Select
                    value={filters.entityType}
                    onValueChange={(value) => setFilters({ ...filters, entityType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All entities</SelectItem>
                      {ENTITY_TYPES.map((entity) => (
                        <SelectItem key={entity} value={entity} className="capitalize">
                          {entity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* User ID */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">User ID</Label>
                  <Input
                    placeholder="Filter by user..."
                    value={filters.userId}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  />
                </div>

                {/* IP Address */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">IP Address</Label>
                  <Input
                    placeholder="Filter by IP..."
                    value={filters.ipAddress}
                    onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
                  />
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? format(filters.dateFrom, "MMM d, yyyy") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, "MMM d, yyyy") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Date Presets & Clear */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-sm text-muted-foreground">Quick:</span>
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    onClick={() => applyDatePreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{logs.length} logs found</span>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No logs match the current filters
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <Collapsible key={log.id} open={expandedLog === log.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action_type)}>
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="capitalize">{log.entity_type}</span>
                          {log.entity_id && (
                            <span className="text-xs text-muted-foreground font-mono">
                              #{log.entity_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-xs">
                            {log.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || "-"}
                      </TableCell>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${
                              expandedLog === log.id ? "rotate-180" : ""
                            }`} />
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30">
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              {log.old_data && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">Previous Data</Label>
                                  <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-32">
                                    {JSON.stringify(log.old_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_data && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">New Data</Label>
                                  <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-32">
                                    {JSON.stringify(log.new_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Metadata</Label>
                                <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-32">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.user_agent && (
                              <div>
                                <Label className="text-xs text-muted-foreground">User Agent</Label>
                                <p className="mt-1 text-xs text-muted-foreground truncate">
                                  {log.user_agent}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

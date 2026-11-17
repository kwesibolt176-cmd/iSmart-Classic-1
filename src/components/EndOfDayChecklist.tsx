import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ClipboardCheck, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Clock,
  MessageSquare,
  ListChecks,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Json } from "@/integrations/supabase/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Staff {
  id: string;
  name: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  checked: boolean;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  // Cash & Financial
  { id: "count_cash", label: "Count cash drawer and record amount", category: "cash", checked: false },
  { id: "verify_transactions", label: "Verify all transactions are recorded", category: "cash", checked: false },
  { id: "process_refunds", label: "Process any pending refunds", category: "cash", checked: false },
  { id: "deposit_cash", label: "Prepare bank deposit if applicable", category: "cash", checked: false },
  
  // Equipment & Security
  { id: "close_register", label: "Close POS register/terminal", category: "equipment", checked: false },
  { id: "backup_data", label: "Ensure data is synced/backed up", category: "equipment", checked: false },
  { id: "check_equipment", label: "Check all equipment is functioning", category: "equipment", checked: false },
  { id: "lock_safe", label: "Secure cash in safe", category: "equipment", checked: false },
  
  // Inventory & Stock
  { id: "check_stock", label: "Note any low stock items", category: "inventory", checked: false },
  { id: "receive_deliveries", label: "Record any received deliveries", category: "inventory", checked: false },
  { id: "check_expiry", label: "Check for expired/expiring items", category: "inventory", checked: false },
  
  // Cleanliness & Closing
  { id: "clean_area", label: "Clean work area", category: "closing", checked: false },
  { id: "turn_off", label: "Turn off non-essential equipment", category: "closing", checked: false },
  { id: "secure_premises", label: "Lock all doors and windows", category: "closing", checked: false },
  { id: "set_alarm", label: "Set security alarm if applicable", category: "closing", checked: false },
];

export const EndOfDayChecklist = () => {
  const { user, profile } = useBusiness();
  const { currentLocation } = useLocation();
  const { format: formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [status, setStatus] = useState<"in_progress" | "completed">("in_progress");
  
  // Staff tracking
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string>("");
  
  // Cash reconciliation
  const [expectedCash, setExpectedCash] = useState(0);
  const [actualCash, setActualCash] = useState("");
  
  // Checklist items
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST_ITEMS);
  
  // Handover notes
  const [handoverNotes, setHandoverNotes] = useState("");
  const [issuesReported, setIssuesReported] = useState("");
  const [nextShiftTasks, setNextShiftTasks] = useState("");
  
  const cashDifference = actualCash ? parseFloat(actualCash) - expectedCash : 0;
  const completedCount = checklistItems.filter(item => item.checked).length;
  const totalCount = checklistItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  useEffect(() => {
    if (user) {
      loadTodayChecklist();
      fetchExpectedCash();
      fetchStaffList();
    }
  }, [user?.id, currentLocation]);

  const fetchStaffList = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("staff")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStaffList(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchExpectedCash = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("payment_method", "cash")
        .eq("status", "completed")
        .gte("transaction_date", today.toISOString());

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = (data || []).reduce((sum, t) => sum + Number(t.amount), 0);
      setExpectedCash(total);
    } catch (error) {
      console.error("Error fetching cash sales:", error);
    }
  };

  const loadTodayChecklist = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from("end_of_day_checklists")
        .select("*")
        .eq("user_id", user.id)
        .eq("shift_date", today);

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        setChecklistId(data.id);
        setStatus(data.status as "in_progress" | "completed");
        setActualCash(data.actual_cash?.toString() || "");
        setHandoverNotes(data.handover_notes || "");
        setIssuesReported(data.issues_reported || "");
        setNextShiftTasks(data.next_shift_tasks || "");
        setSelectedStaffId(data.completed_by_staff_id || null);
        setSelectedStaffName(data.completed_by_name || "");
        
        if (data.checklist_items && Array.isArray(data.checklist_items)) {
          setChecklistItems(data.checklist_items as unknown as ChecklistItem[]);
        }
      }
    } catch (error) {
      console.error("Error loading checklist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckItem = (itemId: string, checked: boolean) => {
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, checked } : item
      )
    );
  };

  const handleSave = async (complete = false) => {
    if (!user) return;

    setSaving(true);
    try {
      const checklistData = {
        user_id: user.id,
        location_id: currentLocation?.id || null,
        shift_date: new Date().toISOString().split('T')[0],
        expected_cash: expectedCash,
        actual_cash: actualCash ? parseFloat(actualCash) : null,
        cash_difference: actualCash ? parseFloat(actualCash) - expectedCash : null,
        checklist_items: JSON.parse(JSON.stringify(checklistItems)) as Json,
        handover_notes: handoverNotes,
        issues_reported: issuesReported,
        next_shift_tasks: nextShiftTasks,
        status: complete ? "completed" : "in_progress",
        completed_at: complete ? new Date().toISOString() : null,
        completed_by_staff_id: selectedStaffId || null,
        completed_by_name: selectedStaffName || profile?.business_name || null,
      };

      if (checklistId) {
        const { error } = await supabase
          .from("end_of_day_checklists")
          .update(checklistData)
          .eq("id", checklistId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("end_of_day_checklists")
          .insert(checklistData)
          .select()
          .single();

        if (error) throw error;
        setChecklistId(data.id);
      }

      if (complete) {
        setStatus("completed");
      }

      toast({
        title: complete ? "Checklist completed" : "Progress saved",
        description: complete 
          ? "End-of-day checklist has been completed and saved."
          : "Your progress has been saved.",
      });
    } catch (error) {
      console.error("Error saving checklist:", error);
      toast({
        title: "Error",
        description: "Failed to save checklist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryItems = (category: string) => 
    checklistItems.filter(item => item.category === category);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "cash": return "Cash & Financial";
      case "equipment": return "Equipment & Security";
      case "inventory": return "Inventory & Stock";
      case "closing": return "Cleanliness & Closing";
      default: return category;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <CardTitle>End-of-Day Checklist</CardTitle>
          </div>
          <Badge variant={status === "completed" ? "default" : "secondary"}>
            {status === "completed" ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</>
            ) : (
              <><Clock className="h-3 w-3 mr-1" /> In Progress</>
            )}
          </Badge>
        </div>
        <CardDescription>
          {format(new Date(), "EEEE, MMMM d, yyyy")} • {completedCount}/{totalCount} tasks completed ({completionPercentage}%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Staff Selector */}
        {staffList.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="staff-select">Staff Member Completing Checklist</Label>
            <Select 
              value={selectedStaffId || "none"} 
              onValueChange={(val) => {
                const staffId = val === "none" ? null : val;
                setSelectedStaffId(staffId);
                const staff = staffList.find(s => s.id === staffId);
                setSelectedStaffName(staff?.name || "");
              }}
              disabled={status === "completed"}
            >
              <SelectTrigger id="staff-select">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Select Staff --</SelectItem>
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {/* Cash Reconciliation Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold">Cash Reconciliation</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Expected Cash</Label>
                <p className="text-lg font-semibold">{formatCurrency(expectedCash)}</p>
              </div>
              <div>
                <Label htmlFor="actualCash" className="text-xs">Actual Cash Count</Label>
                <Input
                  id="actualCash"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  disabled={status === "completed"}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Difference</Label>
                <p className={`text-lg font-semibold ${
                  !actualCash ? "text-muted-foreground" : 
                  cashDifference >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {actualCash ? (
                    <>{cashDifference >= 0 ? "+" : ""}{formatCurrency(cashDifference)}</>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>

            {actualCash && Math.abs(cashDifference) > 0 && (
              <div className={`flex items-center gap-2 p-2 rounded text-sm ${
                cashDifference >= 0 ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"
              }`}>
                <AlertCircle className="h-4 w-4" />
                {cashDifference >= 0 
                  ? `Cash is ${formatCurrency(cashDifference)} over expected amount`
                  : `Cash is ${formatCurrency(Math.abs(cashDifference))} short of expected amount`
                }
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Checklist Items by Category */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Closing Tasks</h3>
            </div>

            {["cash", "equipment", "inventory", "closing"].map(category => (
              <div key={category} className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  {getCategoryLabel(category)}
                </Label>
                <div className="space-y-2">
                  {getCategoryItems(category).map(item => (
                    <div 
                      key={item.id} 
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        item.checked ? "bg-green-500/10" : "bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={(checked) => handleCheckItem(item.id, !!checked)}
                        disabled={status === "completed"}
                      />
                      <Label 
                        htmlFor={item.id} 
                        className={`cursor-pointer flex-1 text-sm ${
                          item.checked ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {item.label}
                      </Label>
                      {item.checked && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Handover Notes Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Shift Handover Notes</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="handoverNotes">General Notes</Label>
                <Textarea
                  id="handoverNotes"
                  placeholder="Any notes for the next shift..."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  disabled={status === "completed"}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="issuesReported" className="text-red-600">Issues to Report</Label>
                <Textarea
                  id="issuesReported"
                  placeholder="Any issues or problems encountered..."
                  value={issuesReported}
                  onChange={(e) => setIssuesReported(e.target.value)}
                  disabled={status === "completed"}
                  className="mt-1 border-red-200 focus:border-red-400"
                />
              </div>

              <div>
                <Label htmlFor="nextShiftTasks">Tasks for Next Shift</Label>
                <Textarea
                  id="nextShiftTasks"
                  placeholder="Things the next shift should prioritize..."
                  value={nextShiftTasks}
                  onChange={(e) => setNextShiftTasks(e.target.value)}
                  disabled={status === "completed"}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        {status !== "completed" && (
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Progress
            </Button>
            <Button 
              className="flex-1"
              onClick={() => handleSave(true)}
              disabled={saving || completionPercentage < 100}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Complete Day
            </Button>
          </div>
        )}

        {status === "completed" && (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-500/10 rounded-lg text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Checklist completed</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

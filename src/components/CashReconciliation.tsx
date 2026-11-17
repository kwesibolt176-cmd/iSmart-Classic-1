import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";

interface Staff {
  id: string;
  name: string;
}

export const CashReconciliation = () => {
  const { toast } = useToast();
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const { format: formatCurrency } = useCurrency();
  const [actualCash, setActualCash] = useState("");
  const [expectedCash, setExpectedCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState("");
  
  const difference = actualCash ? parseFloat(actualCash) - expectedCash : 0;

  useEffect(() => {
    if (user) {
      fetchCashSales();
      fetchStaffList();
    }
  }, [user, currentLocation]);

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

  const fetchCashSales = async () => {
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

      const { data: transactions, error } = await query;

      if (error) throw error;

      const total = (transactions || []).reduce((sum, t) => sum + Number(t.amount), 0);
      setExpectedCash(total);
    } catch (error) {
      console.error("Error fetching cash sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = () => {
    const staffInfo = selectedStaffName ? ` by ${selectedStaffName}` : "";
    toast({
      title: "Cash reconciled" + staffInfo,
      description: `Difference: ${formatCurrency(Math.abs(difference))} ${difference >= 0 ? "over" : "short"}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Reconciliation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Staff Selector */}
        {staffList.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="reconcile-staff">Staff Member</Label>
            <Select 
              value={selectedStaffId || "none"} 
              onValueChange={(val) => {
                const staffId = val === "none" ? null : val;
                setSelectedStaffId(staffId);
                const staff = staffList.find(s => s.id === staffId);
                setSelectedStaffName(staff?.name || "");
              }}
            >
              <SelectTrigger id="reconcile-staff">
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

        <div>
          <p className="text-sm text-muted-foreground mb-1">Expected Cash</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(expectedCash)}</p>
        </div>
        
        <div>
          <Label htmlFor="actualCash">Actual Cash Count</Label>
          <Input
            id="actualCash"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value)}
          />
        </div>

        {actualCash && (
          <div className={`p-3 rounded-lg ${difference >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
            <p className="text-sm text-muted-foreground mb-1">Difference</p>
            <p className={`text-xl font-bold ${difference >= 0 ? "text-green-600" : "text-red-600"}`}>
              {difference >= 0 ? "+" : ""}{formatCurrency(difference)}
            </p>
          </div>
        )}

        <Button onClick={handleReconcile} className="w-full" disabled={!actualCash}>
          Complete Reconciliation
        </Button>

        <div className="pt-4 border-t border-border space-y-2">
          <h4 className="font-semibold text-sm text-foreground">Cash Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Today's Cash Sales</span>
              <span className="text-foreground">
                {loading ? "Loading..." : formatCurrency(expectedCash)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import { 
  Coins, 
  TrendingUp, 
  Users,
  Plus,
  Check,
  Clock,
  Calendar,
  Percent
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface StaffCommission {
  id: string;
  staff_id: string;
  order_id: string | null;
  order_total: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  staff?: { name: string };
}

interface StaffTip {
  id: string;
  staff_id: string;
  order_id: string | null;
  tip_amount: number;
  payment_method: string | null;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  staff?: { name: string };
}

interface CommissionRule {
  id: string;
  name: string;
  rate: number;
  min_order_amount: number;
  applies_to_staff_ids: string[] | null;
  is_active: boolean;
}

interface Staff {
  id: string;
  name: string;
}

export const StaffCommissionTipTracker = () => {
  const queryClient = useQueryClient();
  const { format: formatCurrency } = useCurrency();
  const [showAddCommission, setShowAddCommission] = useState(false);
  const [showAddTip, setShowAddTip] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newCommission, setNewCommission] = useState({
    staff_id: "",
    order_total: 0,
    commission_rate: 0,
    notes: "",
  });
  const [newTip, setNewTip] = useState({
    staff_id: "",
    tip_amount: 0,
    payment_method: "cash",
    notes: "",
  });
  const [newRule, setNewRule] = useState({
    name: "",
    rate: 5,
    min_order_amount: 0,
  });

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Staff[];
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["staff-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_commissions")
        .select("*, staff:staff_id(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as StaffCommission[];
    },
  });

  const { data: tips = [] } = useQuery({
    queryKey: ["staff-tips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_tips")
        .select("*, staff:staff_id(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as StaffTip[];
    },
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["commission-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CommissionRule[];
    },
  });

  const addCommissionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const commission_amount = (newCommission.order_total * newCommission.commission_rate) / 100;
      const { error } = await supabase.from("staff_commissions").insert({
        staff_id: newCommission.staff_id,
        user_id: user.id,
        order_total: newCommission.order_total,
        commission_rate: newCommission.commission_rate,
        commission_amount,
        notes: newCommission.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-commissions"] });
      toast.success("Commission added");
      setShowAddCommission(false);
      setNewCommission({ staff_id: "", order_total: 0, commission_rate: 0, notes: "" });
    },
    onError: () => toast.error("Failed to add commission"),
  });

  const addTipMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("staff_tips").insert({
        staff_id: newTip.staff_id,
        user_id: user.id,
        tip_amount: newTip.tip_amount,
        payment_method: newTip.payment_method,
        notes: newTip.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-tips"] });
      toast.success("Tip recorded");
      setShowAddTip(false);
      setNewTip({ staff_id: "", tip_amount: 0, payment_method: "cash", notes: "" });
    },
    onError: () => toast.error("Failed to record tip"),
  });

  const addRuleMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("commission_rules").insert({
        user_id: user.id,
        name: newRule.name,
        rate: newRule.rate,
        min_order_amount: newRule.min_order_amount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-rules"] });
      toast.success("Rule created");
      setShowAddRule(false);
      setNewRule({ name: "", rate: 5, min_order_amount: 0 });
    },
    onError: () => toast.error("Failed to create rule"),
  });

  const markAsPaid = async (type: "commission" | "tip", id: string) => {
    const table = type === "commission" ? "staff_commissions" : "staff_tips";
    const { error } = await supabase
      .from(table)
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    
    if (error) {
      toast.error("Failed to update status");
    } else {
      queryClient.invalidateQueries({ queryKey: [type === "commission" ? "staff-commissions" : "staff-tips"] });
      toast.success("Marked as paid");
    }
  };

  const pendingCommissions = commissions.filter(c => c.status === "pending");
  const pendingTips = tips.filter(t => t.status === "pending");
  const totalPendingCommission = pendingCommissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const totalPendingTips = pendingTips.reduce((sum, t) => sum + Number(t.tip_amount), 0);
  const totalPaid = commissions.filter(c => c.status === "paid").reduce((sum, c) => sum + Number(c.commission_amount), 0) +
                    tips.filter(t => t.status === "paid").reduce((sum, t) => sum + Number(t.tip_amount), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Commissions</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPendingCommission)}</p>
              </div>
              <Coins className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Tips</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPendingTips)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid Out</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</p>
              </div>
              <Percent className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="commissions">
        <TabsList>
          <TabsTrigger value="commissions">
            Commissions ({pendingCommissions.length} pending)
          </TabsTrigger>
          <TabsTrigger value="tips">
            Tips ({pendingTips.length} pending)
          </TabsTrigger>
          <TabsTrigger value="rules">Commission Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddCommission(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Commission
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Order Total</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No commissions recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell className="font-medium">
                          {commission.staff?.name || "Unknown"}
                        </TableCell>
                        <TableCell>{formatCurrency(commission.order_total)}</TableCell>
                        <TableCell>{commission.commission_rate}%</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(commission.commission_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={commission.status === "paid" ? "default" : "secondary"}>
                            {commission.status === "paid" && <Check className="h-3 w-3 mr-1" />}
                            {commission.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {commission.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(commission.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {commission.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsPaid("commission", commission.id)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddTip(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Tip
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No tips recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    tips.map((tip) => (
                      <TableRow key={tip.id}>
                        <TableCell className="font-medium">
                          {tip.staff?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(tip.tip_amount)}
                        </TableCell>
                        <TableCell className="capitalize">{tip.payment_method || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={tip.status === "paid" ? "default" : "secondary"}>
                            {tip.status === "paid" && <Check className="h-3 w-3 mr-1" />}
                            {tip.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {tip.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(tip.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {tip.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsPaid("tip", tip.id)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddRule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <div className="grid gap-4">
            {rules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No commission rules configured
                </CardContent>
              </Card>
            ) : (
              rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{rule.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {rule.rate}% commission on orders over {formatCurrency(rule.min_order_amount)}
                        </p>
                      </div>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Commission Dialog */}
      <Dialog open={showAddCommission} onOpenChange={setShowAddCommission}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Commission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={newCommission.staff_id}
                onValueChange={(value) => setNewCommission({ ...newCommission, staff_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order Total</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newCommission.order_total}
                onChange={(e) => setNewCommission({ ...newCommission, order_total: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newCommission.commission_rate}
                onChange={(e) => setNewCommission({ ...newCommission, commission_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Commission Amount</p>
              <p className="text-xl font-bold">
                {formatCurrency((newCommission.order_total * newCommission.commission_rate) / 100)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={newCommission.notes}
                onChange={(e) => setNewCommission({ ...newCommission, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCommission(false)}>Cancel</Button>
            <Button
              onClick={() => addCommissionMutation.mutate()}
              disabled={!newCommission.staff_id || newCommission.order_total <= 0 || addCommissionMutation.isPending}
            >
              Add Commission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tip Dialog */}
      <Dialog open={showAddTip} onOpenChange={setShowAddTip}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Tip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={newTip.staff_id}
                onValueChange={(value) => setNewTip({ ...newTip, staff_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tip Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newTip.tip_amount}
                onChange={(e) => setNewTip({ ...newTip, tip_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={newTip.payment_method}
                onValueChange={(value) => setNewTip({ ...newTip, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={newTip.notes}
                onChange={(e) => setNewTip({ ...newTip, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTip(false)}>Cancel</Button>
            <Button
              onClick={() => addTipMutation.mutate()}
              disabled={!newTip.staff_id || newTip.tip_amount <= 0 || addTipMutation.isPending}
            >
              Record Tip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Commission Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="e.g., Standard Sales Commission"
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newRule.rate}
                onChange={(e) => setNewRule({ ...newRule, rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Order Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newRule.min_order_amount}
                onChange={(e) => setNewRule({ ...newRule, min_order_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRule(false)}>Cancel</Button>
            <Button
              onClick={() => addRuleMutation.mutate()}
              disabled={!newRule.name || newRule.rate <= 0 || addRuleMutation.isPending}
            >
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

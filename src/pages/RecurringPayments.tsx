import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";
import { Repeat, Plus, RefreshCw, CheckCircle, XCircle, Clock, MoreVertical, Calendar, Pause, Play, Trash2, Edit } from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/ui/PageHeader";

interface RecurringSchedule {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  customer_phone: string | null;
  customer_email: string | null;
  is_active: boolean;
  total_collected: number;
  successful_runs: number;
  failed_runs: number;
  last_run_at: string | null;
  last_run_status: string | null;
  created_at: string;
}

interface RecurringExecution {
  id: string;
  schedule_id: string;
  amount: number;
  status: string;
  error_message: string | null;
  executed_at: string;
}

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const RecurringPayments = () => {
  const { profile } = useBusiness();
  const { format: formatAmount } = useCurrency();
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [executions, setExecutions] = useState<RecurringExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringSchedule | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    description: "",
    amount: "",
    frequency: "monthly",
    customer_phone: "",
    customer_email: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    try {
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('recurring_schedules')
        .select('*')
        .eq('business_id', profile?.id)
        .order('created_at', { ascending: false });

      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData || []);

      if (schedulesData && schedulesData.length > 0) {
        const { data: executionsData } = await supabase
          .from('recurring_executions')
          .select('*')
          .in('schedule_id', schedulesData.map(s => s.id))
          .order('executed_at', { ascending: false })
          .limit(50);
        
        setExecutions(executionsData || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load recurring payments');
    } finally {
      setLoading(false);
    }
  };

  const calculateNextRunDate = (startDate: string, frequency: string): string => {
    const start = new Date(startDate);
    const now = new Date();
    
    if (start > now) return startDate;
    
    let nextDate = start;
    while (nextDate <= now) {
      switch (frequency) {
        case 'daily':
          nextDate = addDays(nextDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(nextDate, 1);
          break;
        case 'monthly':
          nextDate = addMonths(nextDate, 1);
          break;
        case 'yearly':
          nextDate = addYears(nextDate, 1);
          break;
      }
    }
    return format(nextDate, 'yyyy-MM-dd');
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.name || !newSchedule.amount) {
      toast.error("Please fill in required fields");
      return;
    }

    if (!newSchedule.customer_phone && !newSchedule.customer_email) {
      toast.error("Please provide customer phone or email");
      return;
    }

    setCreating(true);
    try {
      const nextRunDate = calculateNextRunDate(newSchedule.start_date, newSchedule.frequency);
      
      const { error } = await supabase
        .from('recurring_schedules')
        .insert({
          business_id: profile?.id,
          name: newSchedule.name,
          description: newSchedule.description || null,
          amount: parseFloat(newSchedule.amount),
          frequency: newSchedule.frequency,
          start_date: newSchedule.start_date,
          next_run_date: nextRunDate,
          customer_phone: newSchedule.customer_phone || null,
          customer_email: newSchedule.customer_email || null,
          currency: profile?.currency || 'GHS',
        });

      if (error) throw error;

      toast.success("Recurring payment schedule created");
      setCreateDialogOpen(false);
      setNewSchedule({
        name: "",
        description: "",
        amount: "",
        frequency: "monthly",
        customer_phone: "",
        customer_email: "",
        start_date: format(new Date(), 'yyyy-MM-dd'),
      });
      fetchData();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error("Failed to create schedule");
    } finally {
      setCreating(false);
    }
  };

  const toggleSchedule = async (id: string, isActive: boolean) => {
    try {
      await supabase
        .from('recurring_schedules')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      toast.success(isActive ? "Schedule paused" : "Schedule resumed");
      fetchData();
    } catch (error) {
      toast.error("Failed to update schedule");
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await supabase
        .from('recurring_schedules')
        .delete()
        .eq('id', id);
      
      toast.success("Schedule deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete schedule");
    }
  };

  const openEditDialog = (schedule: RecurringSchedule) => {
    setEditingSchedule(schedule);
    setEditDialogOpen(true);
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule || !editingSchedule.name || !editingSchedule.amount) {
      toast.error("Please fill in required fields");
      return;
    }

    setUpdating(true);
    try {
      const nextRunDate = calculateNextRunDate(editingSchedule.start_date, editingSchedule.frequency);
      
      const { error } = await supabase
        .from('recurring_schedules')
        .update({
          name: editingSchedule.name,
          description: editingSchedule.description || null,
          amount: editingSchedule.amount,
          frequency: editingSchedule.frequency,
          start_date: editingSchedule.start_date,
          next_run_date: nextRunDate,
          customer_phone: editingSchedule.customer_phone || null,
          customer_email: editingSchedule.customer_email || null,
        })
        .eq('id', editingSchedule.id);

      if (error) throw error;

      toast.success("Recurring payment schedule updated");
      setEditDialogOpen(false);
      setEditingSchedule(null);
      fetchData();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error("Failed to update schedule");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      success: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    };
    const { variant, icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1 capitalize">
        {icon}
        {status}
      </Badge>
    );
  };

  const totalActive = schedules.filter(s => s.is_active).length;
  const totalCollected = schedules.reduce((sum, s) => sum + s.total_collected, 0);
  const totalSuccessful = schedules.reduce((sum, s) => sum + s.successful_runs, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Recurring Payments"
        description="Automate scheduled payment collections"
        rightContent={<Repeat className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Schedules</p>
                  <p className="text-2xl font-bold text-foreground">{schedules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</p>
                  <p className="text-2xl font-bold text-foreground">{totalActive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <Repeat className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Collected</p>
                  <p className="text-2xl font-bold text-foreground">{formatAmount(totalCollected)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Successful Runs</p>
                  <p className="text-2xl font-bold text-foreground">{totalSuccessful}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="schedules">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList className="bg-card/50 border border-border/50 flex-wrap h-auto gap-1 p-1 w-full sm:w-auto">
              <TabsTrigger value="schedules" className="gap-2 min-h-[40px] data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 font-semibold flex-1 sm:flex-none">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Schedules</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 min-h-[40px] data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 font-semibold flex-1 sm:flex-none">
                <Repeat className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  New Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Recurring Payment</DialogTitle>
                  <DialogDescription>
                    Set up automatic payment collection from a customer
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="e.g., Monthly Subscription"
                      value={newSchedule.name}
                      onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Optional description"
                      value={newSchedule.description}
                      onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newSchedule.amount}
                        onChange={(e) => setNewSchedule({ ...newSchedule, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency *</Label>
                      <Select
                        value={newSchedule.frequency}
                        onValueChange={(value) => setNewSchedule({ ...newSchedule, frequency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={newSchedule.start_date}
                      onChange={(e) => setNewSchedule({ ...newSchedule, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Phone</Label>
                    <PhoneInput
                      placeholder="Customer phone number"
                      value={newSchedule.customer_phone}
                      onChange={(value) => setNewSchedule({ ...newSchedule, customer_phone: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Email</Label>
                    <Input
                      type="email"
                      placeholder="customer@example.com"
                      value={newSchedule.customer_email}
                      onChange={(e) => setNewSchedule({ ...newSchedule, customer_email: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSchedule} disabled={creating} className="w-full sm:w-auto">
                    {creating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                    Create Schedule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="schedules">
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
              {schedules.map((schedule) => (
                <Card key={schedule.id} className={`hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 ${!schedule.is_active ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{schedule.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {schedule.description || schedule.customer_phone || schedule.customer_email}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(schedule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleSchedule(schedule.id, schedule.is_active)}>
                            {schedule.is_active ? (
                              <><Pause className="h-4 w-4 mr-2" /> Pause</>
                            ) : (
                              <><Play className="h-4 w-4 mr-2" /> Resume</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteSchedule(schedule.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="font-semibold text-sm">{formatAmount(schedule.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Frequency</span>
                      <Badge variant="outline" className="capitalize">{schedule.frequency}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Next Run</span>
                      <span className="text-sm">{format(new Date(schedule.next_run_date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Collected</span>
                      <span className="font-semibold text-foreground text-sm">{formatAmount(schedule.total_collected)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={schedule.is_active ? "default" : "secondary"}>
                        {schedule.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {schedules.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">No recurring payment schedules</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      Create Your First Schedule
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="pt-6">
                {executions.length > 0 ? (
                  <div className="space-y-3">
                    {executions.map((execution) => {
                      const schedule = schedules.find(s => s.id === execution.schedule_id);
                      return (
                        <div key={execution.id} className="flex items-center justify-between p-3 rounded-lg border gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-full ${execution.status === 'success' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                              {execution.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{schedule?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(execution.executed_at), 'MMM d, HH:mm')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-semibold text-sm ${execution.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                              {formatAmount(execution.amount)}
                            </p>
                            {getStatusBadge(execution.status)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No execution history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Recurring Payment</DialogTitle>
              <DialogDescription>
                Update the recurring payment schedule details
              </DialogDescription>
            </DialogHeader>
            {editingSchedule && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g., Monthly Subscription"
                    value={editingSchedule.name}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Optional description"
                    value={editingSchedule.description || ''}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={editingSchedule.amount}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency *</Label>
                    <Select
                      value={editingSchedule.frequency}
                      onValueChange={(value) => setEditingSchedule({ ...editingSchedule, frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={editingSchedule.start_date}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Phone</Label>
                  <PhoneInput
                    placeholder="Customer phone number"
                    value={editingSchedule.customer_phone || ''}
                    onChange={(value) => setEditingSchedule({ ...editingSchedule, customer_phone: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Email</Label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={editingSchedule.customer_email || ''}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, customer_email: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleUpdateSchedule} disabled={updating} className="w-full sm:w-auto">
                {updating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                Update Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default RecurringPayments;

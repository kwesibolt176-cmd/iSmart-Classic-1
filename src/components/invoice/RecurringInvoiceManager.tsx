import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, RefreshCw, Calendar, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RecurringInvoice {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  items: any[];
  total: number;
  frequency: string;
  next_invoice_date: string;
  end_date: string | null;
  is_active: boolean;
  invoices_generated: number;
  last_generated_at: string | null;
}

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

export const RecurringInvoiceManager = () => {
  const { user, profile } = useBusiness();
  const { toast } = useToast();
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    frequency: "monthly",
    next_invoice_date: "",
    end_date: "",
    items: [{ name: "", quantity: 1, price: 0 }] as InvoiceItem[],
    notes: "",
  });

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = { 'GHS': 'GH₵', 'USD': 'USD', 'EUR': '€', 'GBP': '£' };
    return symbols[code] || code;
  };
  const currency = getCurrencySymbol(profile?.currency || "GHS");

  useEffect(() => {
    if (user?.id) fetchRecurringInvoices();
  }, [user?.id]);

  const fetchRecurringInvoices = async () => {
    const { data, error } = await supabase
      .from("recurring_invoices")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRecurringInvoices(data.map(d => ({
        ...d,
        items: Array.isArray(d.items) ? d.items : []
      })) as RecurringInvoice[]);
    }
    setLoading(false);
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const subtotal = calculateTotal();
      const { error } = await supabase.from("recurring_invoices").insert([{
        user_id: user.id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone || null,
        items: formData.items as any,
        subtotal,
        total: subtotal,
        frequency: formData.frequency,
        next_invoice_date: formData.next_invoice_date,
        end_date: formData.end_date || null,
        is_active: true,
      }]);

      if (error) throw error;
      toast({ title: "Recurring invoice created" });
      setDialogOpen(false);
      fetchRecurringInvoices();
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await supabase.from("recurring_invoices").update({ is_active: !isActive }).eq("id", id);
      toast({ title: isActive ? "Paused" : "Resumed" });
      fetchRecurringInvoices();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("recurring_invoices").delete().eq("id", id);
      toast({ title: "Deleted" });
      fetchRecurringInvoices();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: "", quantity: 1, price: 0 }],
    });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      frequency: "monthly",
      next_invoice_date: "",
      end_date: "",
      items: [{ name: "", quantity: 1, price: 0 }],
      notes: "",
    });
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      weekly: "Weekly",
      biweekly: "Every 2 Weeks",
      monthly: "Monthly",
      quarterly: "Quarterly",
      yearly: "Yearly",
    };
    return labels[freq] || freq;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Recurring Invoices
        </CardTitle>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Recurring
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : recurringInvoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No recurring invoices set up. Create one to automate billing!
          </p>
        ) : (
          <div className="space-y-4">
            {recurringInvoices.map((ri) => (
              <Card key={ri.id}>
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{ri.customer_name}</h3>
                        <Badge variant={ri.is_active ? "default" : "secondary"}>
                          {ri.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {currency} {ri.total.toFixed(2)} • {getFrequencyLabel(ri.frequency)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Next: {format(new Date(ri.next_invoice_date), "MMM dd, yyyy")}
                        </span>
                        <span>{ri.invoices_generated} generated</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(ri.id, ri.is_active)}
                      >
                        {ri.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(ri.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Recurring Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <PhoneInput
                    value={formData.customer_phone}
                    onChange={(value) => setFormData({ ...formData, customer_phone: value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Invoice Date *</Label>
                  <Input
                    type="date"
                    value={formData.next_invoice_date}
                    onChange={(e) => setFormData({ ...formData, next_invoice_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className="col-span-5"
                      required
                    />
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                      className="col-span-2"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(index, "price", parseFloat(e.target.value) || 0)}
                      className="col-span-3"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length === 1}
                      className="col-span-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold">
                  <span>Total per Invoice:</span>
                  <span>{currency} {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create Recurring Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

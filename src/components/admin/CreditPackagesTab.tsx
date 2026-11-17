import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
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
import { Plus, Edit, Package, Mail, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/hooks/use-currency";

interface CreditPackage {
  id: string;
  name: string;
  credit_type: "sms" | "email";
  credits_amount: number;
  price: number;
  currency: string;
  is_active: boolean;
  display_order: number;
}

export const CreditPackagesTab = () => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    credit_type: "sms" as "sms" | "email",
    credits_amount: 100,
    price: 10,
    currency: "GHS",
    display_order: 0,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setPackages((data || []) as CreditPackage[]);
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast.error("Failed to load credit packages");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (pkg?: CreditPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        credit_type: pkg.credit_type,
        credits_amount: pkg.credits_amount,
        price: pkg.price,
        currency: pkg.currency,
        display_order: pkg.display_order,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: "",
        credit_type: "sms",
        credits_amount: 100,
        price: 10,
        currency: "GHS",
        display_order: packages.length,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.credits_amount <= 0 || formData.price <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      if (editingPackage) {
        const { error } = await supabase
          .from("credit_packages")
          .update(formData)
          .eq("id", editingPackage.id);
        
        if (error) throw error;
        toast.success("Package updated");
      } else {
        const { error } = await supabase
          .from("credit_packages")
          .insert({ ...formData, is_active: true });
        
        if (error) throw error;
        toast.success("Package created");
      }

      setDialogOpen(false);
      fetchPackages();
    } catch (error: any) {
      toast.error(error.message || "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pkg: CreditPackage) => {
    try {
      const { error } = await supabase
        .from("credit_packages")
        .update({ is_active: !pkg.is_active })
        .eq("id", pkg.id);

      if (error) throw error;
      
      setPackages(prev => 
        prev.map(p => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p)
      );
      toast.success(`Package ${pkg.is_active ? "disabled" : "enabled"}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update package");
    }
  };

  const getCostPerUnit = (pkg: CreditPackage) => {
    return (pkg.price / pkg.credits_amount).toFixed(4);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Credit Packages</h2>
          <p className="text-muted-foreground">Manage SMS and Email credit top-up packages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPackages}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Package
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Cost/Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </TableCell>
              </TableRow>
            ) : packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No credit packages defined</p>
                </TableCell>
              </TableRow>
            ) : (
              packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      {pkg.credit_type === "sms" ? (
                        <MessageSquare className="w-3 h-3" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      {pkg.credit_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {pkg.credits_amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(pkg.price, pkg.currency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(Number(getCostPerUnit(pkg)), pkg.currency)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={pkg.is_active}
                      onCheckedChange={() => toggleActive(pkg)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openDialog(pkg)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Edit Package" : "Create Package"}
            </DialogTitle>
            <DialogDescription>
              Configure credit package details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Package Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., SMS Starter"
              />
            </div>

            <div className="space-y-2">
              <Label>Credit Type</Label>
              <Select
                value={formData.credit_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, credit_type: v as "sms" | "email" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Credits Amount</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.credits_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, credits_amount: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Price (GHS)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                min={0}
                value={formData.display_order}
                onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPackage ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

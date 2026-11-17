import { useState, useEffect } from "react";
import { Plus, Search, Package, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
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

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  cost_per_unit: number;
  low_stock_threshold: number;
  supplier_id: string | null;
  is_active: boolean;
}

interface Supplier {
  id: string;
  name: string;
}

const UNITS = ["g", "kg", "ml", "L", "pcs", "oz", "lb", "cups", "tbsp", "tsp"];

export const IngredientsManager = () => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const { toast } = useToast();
  const { format } = useCurrency();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    unit: "g",
    quantity: "",
    cost_per_unit: "",
    low_stock_threshold: "10",
    supplier_id: "",
  });

  useEffect(() => {
    if (user) {
      fetchIngredients();
      fetchSuppliers();
    }
  }, [user, currentLocation]);

  const fetchIngredients = async () => {
    if (!user) return;
    try {
      let query = supabase
        .from("ingredients")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");

      if (currentLocation) {
        query = query.eq("location_id", currentLocation.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setIngredients(data || []);
    } catch (error: any) {
      toast({ title: "Error loading ingredients", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true);
    setSuppliers(data || []);
  };

  const resetForm = () => {
    setFormData({ name: "", unit: "g", quantity: "", cost_per_unit: "", low_stock_threshold: "10", supplier_id: "" });
    setEditingId(null);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setFormData({
      name: ingredient.name,
      unit: ingredient.unit,
      quantity: ingredient.quantity.toString(),
      cost_per_unit: ingredient.cost_per_unit?.toString() || "",
      low_stock_threshold: ingredient.low_stock_threshold?.toString() || "10",
      supplier_id: ingredient.supplier_id || "",
    });
    setEditingId(ingredient.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const payload = {
        user_id: user.id,
        location_id: currentLocation?.id || null,
        name: formData.name,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity) || 0,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        low_stock_threshold: parseFloat(formData.low_stock_threshold) || 10,
        supplier_id: formData.supplier_id || null,
      };

      if (editingId) {
        const { error } = await supabase.from("ingredients").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Ingredient updated" });
      } else {
        const { error } = await supabase.from("ingredients").insert(payload);
        if (error) throw error;
        toast({ title: "Ingredient added" });
      }

      fetchIngredients();
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("ingredients").update({ is_active: false }).eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Ingredient deleted" });
      fetchIngredients();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = ingredients.filter((ing) => ing.quantity <= ing.low_stock_threshold).length;
  const totalValue = ingredients.reduce((sum, ing) => sum + ing.quantity * (ing.cost_per_unit || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-card/95 to-card/80 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ingredients</p>
                <p className="text-2xl font-bold">{ingredients.length}</p>
              </div>
              <Package className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card/95 to-card/80 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-500">{lowStockCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500/60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card/95 to-card/80 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{format(totalValue)}</p>
              </div>
              <Package className="w-8 h-8 text-secondary/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Ingredient
        </Button>
      </div>

      {/* Ingredients List */}
      {filteredIngredients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No ingredients found</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Ingredient
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIngredients.map((ingredient) => {
            const isLowStock = ingredient.quantity <= ingredient.low_stock_threshold;
            return (
              <Card key={ingredient.id} className={`hover:shadow-lg transition-shadow ${isLowStock ? 'border-yellow-500/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{ingredient.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {ingredient.quantity} {ingredient.unit}
                      </p>
                    </div>
                    {isLowStock && (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <span>Cost: {format(ingredient.cost_per_unit || 0)}/{ingredient.unit}</span>
                    <span>Alert at: {ingredient.low_stock_threshold} {ingredient.unit}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ingredient)} className="flex-1">
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteId(ingredient.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update ingredient details" : "Add a new ingredient to track"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Ingredient Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Tomatoes, Flour, Chicken"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost per Unit (GH₵)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Low Stock Alert</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>
            {suppliers.length > 0 && (
              <div className="space-y-2">
                <Label>Supplier (Optional)</Label>
                <Select value={formData.supplier_id} onValueChange={(val) => setFormData({ ...formData, supplier_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Update" : "Add"} Ingredient</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the ingredient from your inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

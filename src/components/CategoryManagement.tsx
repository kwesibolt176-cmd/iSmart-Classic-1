import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DynamicIcon } from "./DynamicIcon";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

export const CategoryManagement = () => {
  const { user } = useBusiness();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: "", icon: "" });

  const iconOptions = [
    { value: "Smartphone", label: "Phone" },
    { value: "Laptop", label: "Laptop" },
    { value: "Sandwich", label: "Burger / Sandwich" },
    { value: "Pizza", label: "Pizza" },
    { value: "Soup", label: "Noodles / Soup" },
    { value: "Coffee", label: "Coffee" },
    { value: "CupSoda", label: "Drink" },
    { value: "CakeSlice", label: "Cake" },
    { value: "Beer", label: "Beer" },
    { value: "Wine", label: "Wine" },
    { value: "Salad", label: "Salad" },
    { value: "Beef", label: "Meat" },
    { value: "Fish", label: "Fish" },
    { value: "Bowl", label: "Rice / Bowl" },
    { value: "Utensils", label: "Stew / Meal" },
    { value: "Dessert", label: "Dessert" },
    { value: "Droplet", label: "Juice / Liquid" },
    { value: "ShoppingBag", label: "Takeout" },
    { value: "Package", label: "Bento / Box" },
    { value: "ChefHat", label: "Chef / Special" },
  ];

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user?.id]);

  const fetchCategories = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("display_order");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleAddCategory = async () => {
    if (!user || !newCategory.name.trim()) return;

    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: newCategory.name.trim(),
      icon: newCategory.icon || null,
      display_order: categories.length,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.code === "23505" ? "A category with this name already exists." : error.message || "Failed to add category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category added successfully",
      });
      setNewCategory({ name: "", icon: "" });
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      fetchCategories();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("categories")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } else {
      setCategories(categories.map(cat => 
        cat.id === id ? { ...cat, is_active: isActive } : cat
      ));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Management</CardTitle>
        <CardDescription>
          Manage product/service categories for your business
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Electronics, Services"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category-icon">Icon (optional)</Label>
              <Select
                value={newCategory.icon}
                onValueChange={(val) => setNewCategory({ ...newCategory, icon: val })}
              >
                <SelectTrigger id="category-icon">
                  <SelectValue placeholder="Select an icon..." />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={icon.value} className="w-4 h-4" />
                        <span>{icon.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAddCategory} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Existing Categories</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet. Add your first category above.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    {category.icon && <DynamicIcon name={category.icon} className="w-6 h-6 text-muted-foreground block" />}
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${category.id}`} className="text-sm">Active</Label>
                      <Switch
                        id={`active-${category.id}`}
                        checked={category.is_active}
                        onCheckedChange={(checked) => handleToggleActive(category.id, checked)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

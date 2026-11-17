import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DynamicIcon } from "./DynamicIcon";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export const CategorySubcategoryManager = ({ onUpdate }: { onUpdate?: () => void }) => {
  const { user } = useBusiness();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
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
    { value: "Droplet", label: "Juice" },
    { value: "ShoppingBag", label: "Takeout" },
    { value: "Package", label: "Bento / Box" },
    { value: "ChefHat", label: "Chef / Special" },
  ];
  const [newSubcategory, setNewSubcategory] = useState({ name: "", categoryId: "" });

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchSubcategories();
    }
  }, [user?.id]);

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("display_order");
    setCategories(data || []);
  };

  const fetchSubcategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("subcategories")
      .select("*")
      .eq("user_id", user.id)
      .order("display_order");
    setSubcategories(data || []);
  };

  const handleAddCategory = async () => {
    if (!user || !newCategory.name.trim()) return;

    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: newCategory.name.trim(),
      icon: newCategory.icon.trim() || null,
      display_order: categories.length,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add category", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Category added successfully" });
      setNewCategory({ name: "", icon: "" });
      fetchCategories();
      onUpdate?.();
    }
  };

  const handleAddSubcategory = async () => {
    if (!user || !newSubcategory.name.trim() || !newSubcategory.categoryId) return;

    const { error } = await supabase.from("subcategories").insert({
      user_id: user.id,
      category_id: newSubcategory.categoryId,
      name: newSubcategory.name.trim(),
      display_order: subcategories.filter(s => s.category_id === newSubcategory.categoryId).length,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add subcategory", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Subcategory added successfully" });
      setNewSubcategory({ name: "", categoryId: "" });
      fetchSubcategories();
      onUpdate?.();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Category deleted" });
      fetchCategories();
      fetchSubcategories();
      onUpdate?.();
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete subcategory", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Subcategory deleted" });
      fetchSubcategories();
      onUpdate?.();
    }
  };

  const handleToggleActive = async (type: "category" | "subcategory", id: string, currentState: boolean) => {
    const table = type === "category" ? "categories" : "subcategories";
    const { error } = await supabase.from(table).update({ is_active: !currentState }).eq("id", id);
    
    if (error) {
      toast({ title: "Error", description: `Failed to update ${type}`, variant: "destructive" });
    } else {
      if (type === "category") fetchCategories();
      else fetchSubcategories();
      onUpdate?.();
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Manage Categories & Subcategories
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Categories & Subcategories</DialogTitle>
          <DialogDescription>Add, edit, or remove your product categories and subcategories</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category Name</Label>
                  <Input
                    placeholder="e.g., Electronics"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select
                    value={newCategory.icon}
                    onValueChange={(val) => setNewCategory({ ...newCategory, icon: val })}
                  >
                    <SelectTrigger>
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
            </CardContent>
          </Card>

          {/* Add Subcategory */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Subcategory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Parent Category</Label>
                  <Select
                    value={newSubcategory.categoryId}
                    onValueChange={(val) => setNewSubcategory({ ...newSubcategory, categoryId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <DynamicIcon name={cat.icon} className="w-4 h-4" />
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategory Name</Label>
                  <Input
                    placeholder="e.g., Smartphones"
                    value={newSubcategory.name}
                    onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAddSubcategory} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Subcategory
              </Button>
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Existing Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-sm">No categories yet</p>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <button onClick={() => toggleCategory(category.id)} className="p-1">
                        {expandedCategories.has(category.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      {category.icon && <DynamicIcon name={category.icon} className="w-5 h-5 text-muted-foreground block" />}
                      <span className="font-medium flex-1">{category.name}</span>
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => handleToggleActive("category", category.id, category.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    
                    {expandedCategories.has(category.id) && (
                      <div className="ml-8 space-y-1">
                        {subcategories
                          .filter((sub) => sub.category_id === category.id)
                          .map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-3 p-2 bg-background rounded-lg border"
                            >
                              <span className="text-sm flex-1">{sub.name}</span>
                              <Switch
                                checked={sub.is_active}
                                onCheckedChange={() => handleToggleActive("subcategory", sub.id, sub.is_active)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSubcategory(sub.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        {subcategories.filter((sub) => sub.category_id === category.id).length === 0 && (
                          <p className="text-xs text-muted-foreground ml-2">No subcategories</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

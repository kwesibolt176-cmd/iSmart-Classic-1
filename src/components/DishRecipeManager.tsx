import { useState, useEffect } from "react";
import { Plus, Trash2, ChefHat, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useToast } from "@/hooks/use-toast";

interface DishRecipeManagerProps {
  inventoryItemId: string;
  dishName: string;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

interface DishIngredient {
  id: string;
  ingredient_id: string;
  quantity_required: number;
  unit: string;
  ingredient?: Ingredient;
}

export const DishRecipeManager = ({ inventoryItemId, dishName }: DishRecipeManagerProps) => {
  const { user } = useBusiness();
  const { currentLocation } = useLocation();
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dishIngredients, setDishIngredients] = useState<DishIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    ingredient_id: "",
    quantity_required: "",
    unit: "g",
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user?.id, inventoryItemId]);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch all available ingredients
      let ingredientsQuery = supabase
        .from("ingredients")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (currentLocation) {
        ingredientsQuery = ingredientsQuery.eq("location_id", currentLocation.id);
      }

      const { data: ingredientsData } = await ingredientsQuery;
      setIngredients(ingredientsData || []);

      // Fetch dish ingredients (recipe)
      const { data: dishIngredientsData } = await supabase
        .from("dish_ingredients")
        .select("*, ingredient:ingredients(*)")
        .eq("inventory_item_id", inventoryItemId)
        .eq("user_id", user.id);

      setDishIngredients(
        (dishIngredientsData || []).map((di: any) => ({
          ...di,
          ingredient: di.ingredient,
        }))
      );
    } catch (error) {
      console.error("Error fetching recipe data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = async () => {
    if (!user || !newIngredient.ingredient_id || !newIngredient.quantity_required) return;

    setAdding(true);
    try {
      const { error } = await supabase.from("dish_ingredients").insert({
        user_id: user.id,
        inventory_item_id: inventoryItemId,
        ingredient_id: newIngredient.ingredient_id,
        quantity_required: parseFloat(newIngredient.quantity_required),
        unit: newIngredient.unit,
      });

      if (error) throw error;

      // Update track_inventory to false for this dish
      await supabase
        .from("inventory_items")
        .update({ track_inventory: false })
        .eq("id", inventoryItemId);

      toast({ title: "Ingredient added to recipe" });
      setNewIngredient({ ingredient_id: "", quantity_required: "", unit: "g" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveIngredient = async (dishIngredientId: string) => {
    try {
      const { error } = await supabase.from("dish_ingredients").delete().eq("id", dishIngredientId);
      if (error) throw error;

      // Check if there are any remaining ingredients
      const remaining = dishIngredients.filter((di) => di.id !== dishIngredientId);
      if (remaining.length === 0) {
        // If no ingredients left, set track_inventory back to true
        await supabase
          .from("inventory_items")
          .update({ track_inventory: true })
          .eq("id", inventoryItemId);
      }

      toast({ title: "Ingredient removed" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Calculate how many portions can be made based on ingredient availability
  const calculateAvailablePortions = () => {
    if (dishIngredients.length === 0) return null;

    let minPortions = Infinity;
    let limitingIngredient = "";

    for (const di of dishIngredients) {
      if (di.ingredient) {
        const available = di.ingredient.quantity || 0;
        const required = di.quantity_required || 1;
        const portions = Math.floor(available / required);
        if (portions < minPortions) {
          minPortions = portions;
          limitingIngredient = di.ingredient.name;
        }
      }
    }

    return { portions: minPortions === Infinity ? 0 : minPortions, limitingIngredient };
  };

  const availability = calculateAvailablePortions();
  const availableIngredients = ingredients.filter(
    (ing) => !dishIngredients.some((di) => di.ingredient_id === ing.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ChefHat className="w-5 h-5 text-primary" />
            Recipe for "{dishName}"
          </CardTitle>
          {availability && (
            <Badge variant={availability.portions > 5 ? "default" : availability.portions > 0 ? "secondary" : "destructive"}>
              {availability.portions} portions available
            </Badge>
          )}
        </div>
        {availability && availability.portions <= 5 && availability.portions > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 mt-2">
            <AlertCircle className="w-4 h-4" />
            Low on {availability.limitingIngredient}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Recipe */}
        {dishIngredients.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Ingredients per portion:</Label>
            <div className="space-y-2">
              {dishIngredients.map((di) => (
                <div
                  key={di.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{di.ingredient?.name || "Unknown"}</span>
                    <span className="text-muted-foreground">
                      {di.quantity_required} {di.unit}
                    </span>
                    {di.ingredient && (
                      <span className="text-xs text-muted-foreground">
                        (Stock: {di.ingredient.quantity} {di.ingredient.unit})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveIngredient(di.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No ingredients added to this recipe yet</p>
            <p className="text-sm">Add ingredients to track availability automatically</p>
          </div>
        )}

        {/* Add New Ingredient */}
        {availableIngredients.length > 0 ? (
          <div className="pt-4 border-t">
            <Label className="text-sm mb-3 block">Add Ingredient:</Label>
            <div className="flex flex-wrap gap-2">
              <Select
                value={newIngredient.ingredient_id}
                onValueChange={(val) => {
                  const ing = ingredients.find((i) => i.id === val);
                  setNewIngredient({
                    ...newIngredient,
                    ingredient_id: val,
                    unit: ing?.unit || "g",
                  });
                }}
              >
                <SelectTrigger className="flex-1 min-w-[150px]">
                  <SelectValue placeholder="Select ingredient..." />
                </SelectTrigger>
                <SelectContent>
                  {availableIngredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} ({ing.quantity} {ing.unit} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Qty"
                value={newIngredient.quantity_required}
                onChange={(e) => setNewIngredient({ ...newIngredient, quantity_required: e.target.value })}
                className="w-24"
              />
              <Input
                placeholder="Unit"
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                className="w-20"
              />
              <Button
                onClick={handleAddIngredient}
                disabled={adding || !newIngredient.ingredient_id || !newIngredient.quantity_required}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        ) : ingredients.length === 0 ? (
          <div className="pt-4 border-t text-center text-muted-foreground">
            <p className="text-sm">No ingredients available. Add ingredients first in the Ingredients tab.</p>
          </div>
        ) : (
          <div className="pt-4 border-t text-center text-muted-foreground">
            <p className="text-sm">All ingredients have been added to this recipe.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

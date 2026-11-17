import { UtensilsCrossed, Coffee, Cake, Salad, Pizza } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
}

const categories: Category[] = [
  { id: "all", name: "All Items", icon: UtensilsCrossed },
  { id: "appetizers", name: "Appetizers", icon: Salad },
  { id: "mains", name: "Main Courses", icon: Pizza },
  { id: "desserts", name: "Desserts", icon: Cake },
  { id: "drinks", name: "Drinks", icon: Coffee },
];

interface MenuCategoriesProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const MenuCategories = ({ selectedCategory, onSelectCategory }: MenuCategoriesProps) => {
  return (
    <div className="w-64 bg-card border-r border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Categories</h2>
      <div className="space-y-2">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-muted/30 text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

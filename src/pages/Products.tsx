import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Package, AlertTriangle, History, Grid3x3, Upload, Layers, ChefHat, TrendingUp, Edit, ScanBarcode } from "lucide-react";
import { MenuItem } from "@/components/MenuItem";
import { CartDrawer } from "@/components/CartDrawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewInventoryDialog } from "@/components/NewInventoryDialog";
import { BulkProductImportDialog } from "@/components/BulkProductImportDialog";
import { InventoryHistoryTab } from "@/components/InventoryHistoryTab";
import { ManageVariantsDialog } from "@/components/ManageVariantsDialog";
import { IngredientsManager } from "@/components/IngredientsManager";
import { DishRecipeManager } from "@/components/DishRecipeManager";
import { PredictiveRestocking } from "@/components/inventory/PredictiveRestocking";
import { EditProductDialog } from "@/components/EditProductDialog";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { ProductImageSearch } from "@/components/ProductImageSearch";
import { getIndustryConfig, isFoodIndustry } from "@/lib/industry-config";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DynamicIcon } from "@/components/DynamicIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarcodeScanner, type ScannedInventoryItem } from "@/components/BarcodeScanner";
import { useCart } from "@/contexts/CartContext";
import { productToScannedCartItem } from "@/lib/scan-to-cart";

interface ProductItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category_id: string | null;
  subcategory_id?: string | null;
  image_url?: string | null;
  description?: string | null;
  low_stock_threshold: number;
  bnpl_enabled: boolean;
  is_active: boolean;
  has_variants: boolean;
  sku?: string | null;
  cost?: number | null;
  show_on_storefront?: boolean;
  track_inventory?: boolean;
  barcode?: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  is_active: boolean;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  is_active: boolean;
}

interface ProductsProps {
  initialTab?: "catalog" | "inventory";
}

export const Products = ({ initialTab = "catalog" }: ProductsProps = {}) => {
  const { user, profile } = useBusiness();
  const { currentLocation } = useLocation();
  const { format: formatCurrency, currencySymbol } = useCurrency();
  
  // Get industry-specific configuration
  const industryConfig = useMemo(() => getIndustryConfig(profile?.industry), [profile?.industry]);
  const isFood = useMemo(() => isFoodIndustry(profile?.industry), [profile?.industry]);
  
  const { toast } = useToast();
  const { addItem } = useCart();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<ProductItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<ProductItem | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScanToCart = (_barcode: string, product?: ScannedInventoryItem) => {
    if (!product) return;

    const result = productToScannedCartItem(product);
    if (!result.ok) {
      if (result.reason === "out_of_stock") {
        toast({
          title: "Out of stock",
          description: `${product.name} cannot be added until it is restocked.`,
          variant: "destructive",
        });
        return;
      }

      setScannerOpen(false);
      setSelectedCategory("all");
      setSelectedSubcategory(null);
      setSearchQuery(product.name);
      toast({
        title: "Select product options",
        description: `${product.name} has variants. Select the required option from the product card.`,
      });
      return;
    }

    addItem(result.item);
  };

  useEffect(() => {
    if (user) {
      fetchData();
      
      const channel = supabase
        .channel("products_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "inventory_items",
          },
          () => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, currentLocation]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("subcategories")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("display_order"),
      ]);

      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);

      // Fetch all items for this user (show all products regardless of location assignment)
      const { data: itemsData, error: itemsError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    const matchesSubcategory = !selectedSubcategory || item.subcategory_id === selectedSubcategory;
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(normalizedSearch)
      || Boolean(item.barcode?.toLowerCase().includes(normalizedSearch))
      || Boolean(item.sku?.toLowerCase().includes(normalizedSearch));
    return matchesCategory && matchesSubcategory && matchesSearch;
  });

  const criticalItems = items.filter((item) => item.quantity <= item.low_stock_threshold / 2).length;
  const lowStockItems = items.filter(
    (item) => item.quantity <= item.low_stock_threshold && item.quantity > item.low_stock_threshold / 2
  ).length;
  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full bg-background">
        <LoadingSpinner size="large" message="Loading products..." />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title={`${industryConfig.productLabelPlural} & ${industryConfig.inventoryLabel}`}
        description={`Manage your ${industryConfig.inventoryLabel.toLowerCase()}, stock levels, and catalog`}
        rightContent={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setScannerOpen(true)}
              className="gap-2 rounded-lg"
            >
              <ScanBarcode className="w-4 h-4" />
              Scan to Cart
            </Button>
            <Button 
              variant="outline"
              onClick={() => setBulkImportOpen(true)} 
              className="gap-2 rounded-lg"
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </Button>
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="gap-2 w-full sm:w-auto rounded-lg bg-primary text-primary-foreground font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {industryConfig.addProductLabel}
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-700">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-card group rounded-xl border border-border p-6 transition-all hover:shadow-md hover:border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Package className="w-5 h-5 text-primary" />
              </div>
              <span className="text-primary text-[10px] font-bold uppercase tracking-wider">
                Total Catalog
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Total {industryConfig.productLabelPlural}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{items.length}</p>
          </div>
          
          <div className="bg-card group rounded-xl border border-orange-200/50 dark:border-orange-900/40 p-6 transition-all hover:shadow-md hover:border-orange-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-orange-500 text-[10px] font-bold uppercase tracking-wider">
                Attention Required
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Low Stock Items</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-500 tabular-nums">{lowStockItems}</p>
          </div>
          
          <div className="bg-card group rounded-xl border border-red-200/50 dark:border-red-900/40 p-6 transition-all hover:shadow-md hover:border-red-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-red-500 text-[10px] font-bold uppercase tracking-wider">
                Critical Level
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600 tabular-nums">{criticalItems}</p>
          </div>
          
          <div className="bg-card group rounded-xl border border-emerald-200/50 dark:border-emerald-900/40 p-6 transition-all hover:shadow-md hover:border-emerald-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                Inventory Value
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Estimated Worth</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="catalog" className="gap-2">
              <Grid3x3 className="w-4 h-4" />
              {industryConfig.catalogLabel}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="w-4 h-4" />
              {industryConfig.inventoryLabel}
            </TabsTrigger>
            {isFood && (
              <TabsTrigger value="ingredients" className="gap-2">
                <ChefHat className="w-4 h-4" />
                Ingredients
              </TabsTrigger>
            )}
            <TabsTrigger value="predictions" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-6">
            <div className="flex flex-col lg:flex-row h-full gap-6">
              {/* Categories Sidebar */}
              <div className="w-full lg:w-72 bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Categories</h2>
                </div>
                <div className="p-2 space-y-1 overflow-y-auto max-h-[400px] lg:max-h-[600px]">
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedSubcategory(null);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                      selectedCategory === "all"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span>All Products</span>
                  </button>
                  {categories.map((category) => {
                    const categorySubcategories = subcategories.filter(s => s.category_id === category.id);
                    return (
                      <div key={category.id} className="space-y-1">
                        <button
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setSelectedSubcategory(null);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                            selectedCategory === category.id && !selectedSubcategory
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {category.icon && <DynamicIcon name={category.icon} className="w-4 h-4" />}
                          <span>{category.name}</span>
                        </button>
                        
                        {selectedCategory === category.id && categorySubcategories.length > 0 && (
                          <div className="ml-4 space-y-1">
                            {categorySubcategories.map((subcategory) => (
                              <button
                                key={subcategory.id}
                                onClick={() => setSelectedSubcategory(subcategory.id)}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all ${
                                  selectedSubcategory === subcategory.id
                                    ? "bg-primary/20 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-muted/30"
                                }`}
                              >
                                <span>{subcategory.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex-1">
                <div className="mb-6">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-card border-border rounded-lg focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {selectedCategory !== "all" && (
                  <div className="mb-4 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Showing:</span>
                    <span className="font-medium text-foreground">
                      {categories.find(c => c.id === selectedCategory)?.name || "All Products"}
                      {selectedSubcategory && (
                        <> / {subcategories.find(s => s.id === selectedSubcategory)?.name}</>
                      )}
                    </span>
                  </div>
                )}

                {filteredItems.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Package className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg mb-2">
                        {items.length === 0 ? "No products yet" : "No products found"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {items.length === 0 ? "Add your first product to get started" : "Try adjusting your filters"}
                      </p>
                      {items.length === 0 && (
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Product
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    {filteredItems.map((item) => (
                      <MenuItem key={item.id} item={{
                        ...item,
                        image: item.image_url || undefined,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <ProductImageSearch />
            
            {items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-lg mb-2">
                    No {industryConfig.productLabelPlural.toLowerCase()} yet
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your first {industryConfig.productLabel.toLowerCase()} to get started
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {industryConfig.addProductLabel}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                {items.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.has_variants && (
                              <Badge variant="outline">
                                <Layers className="w-3 h-3 mr-1" />
                                Has Variants
                              </Badge>
                            )}
                            {item.bnpl_enabled && (
                              <Badge className="bg-[hsl(217_91%_60%)]/10 text-[hsl(217_91%_60%)] border-[hsl(217_91%_60%)]/20">BNPL</Badge>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-lg">{formatCurrency(item.price)}</span>
                      </div>
                      
                      {industryConfig.trackStock && (
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stock:</span>
                            <span className={item.quantity <= item.low_stock_threshold ? "text-red-500 font-medium" : ""}>
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Low Stock Alert:</span>
                            <span>{item.low_stock_threshold}</span>
                          </div>
                        </div>
                      )}

                      {isFood && (
                        <div className="mb-4">
                          <DishRecipeManager inventoryItemId={item.id} dishName={item.name} />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => {
                            setSelectedItemForEdit(item);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          Edit / Restock
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setSelectedItemForVariants(item);
                            setVariantsDialogOpen(true);
                          }}
                        >
                          <Layers className="w-4 h-4" />
                          Variants
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {isFood && (
            <TabsContent value="ingredients">
              <IngredientsManager />
            </TabsContent>
          )}

          <TabsContent value="predictions">
            <PredictiveRestocking />
          </TabsContent>

          <TabsContent value="history">
            <InventoryHistoryTab />
          </TabsContent>
        </Tabs>

        <NewInventoryDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onInventoryAdded={fetchData}
        />

        <BulkProductImportDialog
          open={bulkImportOpen}
          onOpenChange={setBulkImportOpen}
          onImportComplete={fetchData}
        />

        {selectedItemForVariants && (
          <ManageVariantsDialog
            open={variantsDialogOpen}
            onOpenChange={setVariantsDialogOpen}
            inventoryItemId={selectedItemForVariants.id}
            productName={selectedItemForVariants.name}
            basePrice={selectedItemForVariants.price}
            onVariantsChange={fetchData}
          />
        )}

        <EditProductDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          product={selectedItemForEdit}
          onProductUpdated={fetchData}
        />

        <CartDrawer />
        <BarcodeScanner
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={handleScanToCart}
          mode="lookup"
          keepOpenAfterScan
        />
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/hooks/use-currency";

// Super admin uses GHS as platform default currency
const formatPlatformCurrency = (amount: number) => formatCurrency(amount, "GHS");
interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  low_stock_threshold: number;
  business_name?: string;
  user_id: string;
}

export const InventoryOverviewTab = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    
    // Fetch inventory with business info
    const { data: inventoryData, error: invError } = await supabase
      .from("inventory_items")
      .select("id, name, quantity, price, low_stock_threshold, user_id")
      .order("quantity", { ascending: true })
      .limit(500);

    if (!invError && inventoryData) {
      // Get business names
      const userIds = [...new Set(inventoryData.map(i => i.user_id))];
      const { data: businessData } = await supabase
        .from("business_profiles")
        .select("user_id, business_name")
        .in("user_id", userIds);

      const businessMap = new Map(businessData?.map(b => [b.user_id, b.business_name]) || []);
      
      setItems(inventoryData.map(item => ({
        ...item,
        low_stock_threshold: item.low_stock_threshold || 10,
        business_name: businessMap.get(item.user_id) || "Unknown"
      })));
    }
    setLoading(false);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = items.length;
  const lowStockItems = items.filter(i => i.quantity <= i.low_stock_threshold).length;
  const outOfStock = items.filter(i => i.quantity === 0).length;
  const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Products</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Low Stock</span>
            </div>
            <p className="text-2xl font-bold mt-1">{lowStockItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Out of Stock</span>
            </div>
            <p className="text-2xl font-bold mt-1">{outOfStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatPlatformCurrency(totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>All Inventory</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading inventory...</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="min-w-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.slice(0, 100).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={item.name}>{item.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate" title={item.business_name}>{item.business_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatPlatformCurrency(Number(item.price))}</TableCell>
                    <TableCell>
                      {item.quantity === 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : item.quantity <= item.low_stock_threshold ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">Low Stock</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">In Stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </div>
          )}
          {filteredItems.length > 100 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Showing 100 of {filteredItems.length} items
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

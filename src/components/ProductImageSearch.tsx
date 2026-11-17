import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Search, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { functionErrorMessage } from "@/lib/function-errors";
import { prepareImageForUpload } from "@/lib/image-resize";

interface SearchResult {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
}

export const ProductImageSearch = () => {
  const { user } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [detectedFeatures, setDetectedFeatures] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = async (query: string) => {
    if (!user?.id) return [];
    const { data: products, error } = await supabase
      .from("inventory_items")
      .select("id, name, price, quantity, sku")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .limit(10);

    if (error) throw error;
    return products || [];
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term || !user?.id) return;

    setSearching(true);
    setHasSearched(true);
    setDetectedFeatures("");
    setSearchResults([]);

    try {
      const products = await runSearch(term);
      setSearchResults(products);

      if (products.length === 0) {
        toast.info("No matching products found. Try a different search term.");
      }
    } catch (error) {
      console.error("Error searching products:", error);
      toast.error("Failed to search products");
    } finally {
      setSearching(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setSearching(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      // Downscale first: the data URL is sent as JSON and large photos exceed the proxy body limit.
      const prepared = await prepareImageForUpload(file);
      const base64 = await new Promise<string>((resolve) => {
        const fileReader = new FileReader();
        fileReader.onloadend = () => resolve(fileReader.result as string);
        fileReader.readAsDataURL(prepared);
      });

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-product-image",
        { body: { imageUrl: base64, mode: "search" } }
      );

      if (analysisError) throw { invokeError: analysisError, data: analysisData };

      if (analysisData?.error) {
        toast.error(await functionErrorMessage(null, analysisData, "Failed to search by image"));
        return;
      }

      const features = analysisData?.analysis || "";
      setDetectedFeatures(features);

      const products = await runSearch(features.split(" ").slice(0, 5).join(" "));
      setSearchResults(products);

      if (products.length > 0) {
        toast.success(`Found ${products.length} matching products`);
      } else {
        toast.info("No matching products found. Try uploading a different image.");
      }
    } catch (error) {
      console.error("Error searching by image:", error);
      const failure = error as { invokeError?: unknown; data?: unknown };
      toast.error(await functionErrorMessage(failure.invokeError ?? error, failure.data, "Failed to search by image"));
    } finally {
      setSearching(false);
    }
  };

  const resetResults = () => {
    setHasSearched(false);
    setSearchResults([]);
    setDetectedFeatures("");
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Product Search
        </CardTitle>
        <CardDescription>
          Search your inventory by product name, or by uploading a photo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="name" onValueChange={resetResults}>
          <TabsList>
            <TabsTrigger value="name">Search by Name</TabsTrigger>
            <TabsTrigger value="image">Search by Image</TabsTrigger>
          </TabsList>

          <TabsContent value="name" className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={searching}
              />
              <Button type="submit" disabled={searching || !searchTerm.trim()}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-search-upload"
                disabled={searching}
              />
              <label htmlFor="image-search-upload" className="cursor-pointer">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Search preview"
                    className="max-h-48 mx-auto rounded-lg mb-4"
                  />
                ) : (
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={searching}
                  onClick={() => document.getElementById("image-search-upload")?.click()}
                >
                  {searching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </>
                  )}
                </Button>
              </label>
            </div>

            {detectedFeatures && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">AI detected features:</p>
                <p className="text-sm">{detectedFeatures}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {hasSearched && !searching && (
          <div className="space-y-2">
            <h3 className="font-semibold">
              {searchResults.length > 0
                ? `Matching Products (${searchResults.length})`
                : "No matching products"}
            </h3>
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.sku && (
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(product.price)}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} in stock
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

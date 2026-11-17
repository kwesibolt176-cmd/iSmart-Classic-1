import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Loader2, Plus, Search, Share2, Package, ShoppingBag, ExternalLink, QrCode, Download, Store, Tag } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AddToSocialStoreDialog } from "@/components/AddToSocialStoreDialog";
import { SocialStoreOrders } from "@/components/SocialStoreOrders";
import { PromoCodeManager } from "@/components/PromoCodeManager";
import { QRCodeSVG } from "qrcode.react";
import { PageHeader } from "@/components/ui/PageHeader";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  quantity: number;
}

export const SocialStore = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showStorefrontQR, setShowStorefrontQR] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const { user } = useBusiness();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchBusinessProfile();
    }
  }, [user?.id]);

  const fetchBusinessProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    if (data) {
      setBusinessProfile(data);
    }
  };

  const fetchProducts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, description, price, image_url, is_active, quantity, show_on_storefront")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("show_on_storefront", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const storefrontDomain = window.location.origin;

  const copyShareLink = (productId: string) => {
    const link = `${storefrontDomain}/store/${user?.id}?product=${productId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this link on social media",
    });
  };

  const copyStorefrontLink = () => {
    const link = `${storefrontDomain}/store/${user?.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Storefront link copied!",
      description: "Add this link to your social media bio",
    });
  };

  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `${businessProfile?.business_name || "store"}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const storefrontLink = `${STOREFRONT_DOMAIN}/store/${user?.id}`;

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Social Store"
        description="Share your complete storefront on social media and manage your social commerce products"
        rightContent={<Store className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10 shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-foreground">Active Storefront</h3>
            <p className="text-sm text-muted-foreground">Manage your online presence and product catalog</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/20">
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>
        </div>

        {/* Storefront Link & QR Code Section */}
        <Card className="p-6 bg-card hover:border-primary/20 transition-all shadow-sm">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Your Storefront Link
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link in your social media bio so customers can browse all your products
              </p>
              <div className="flex gap-2 mb-4">
                <Input value={storefrontLink} readOnly className="flex-1" />
                <Button onClick={copyStorefrontLink} variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button onClick={() => window.open(storefrontLink, "_blank")} variant="outline" size="icon">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={() => setShowStorefrontQR(!showStorefrontQR)} variant="outline" className="gap-2">
                <QrCode className="w-4 h-4" />
                {showStorefrontQR ? "Hide" : "Show"} QR Code
              </Button>
            </div>
            
            {showStorefrontQR && (
              <div className="lg:border-l lg:pl-6">
                <div className="bg-white p-4 rounded-lg inline-block" ref={qrRef}>
                  <QRCodeSVG
                    value={storefrontLink}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <Button onClick={downloadQRCode} variant="outline" className="w-full mt-4 gap-2">
                  <Download className="w-4 h-4" />
                  Download QR Code
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Print and display at your location
                </p>
              </div>
            )}
          </div>
        </Card>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="promos" className="gap-1">
              <Tag className="w-3 h-3" />
              Promos
            </TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {/* Search Bar */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </Card>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding your first product to share on social media
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Product
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {product.image_url && (
                      <div className="aspect-square bg-muted">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Stock: {product.quantity}
                        </span>
                      </div>
                      <Button
                        onClick={() => copyShareLink(product.id)}
                        variant="outline"
                        className="w-full gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Copy Share Link
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="promos">
            <PromoCodeManager />
          </TabsContent>

          <TabsContent value="orders">
            <SocialStoreOrders />
          </TabsContent>
        </Tabs>
      </div>

      <AddToSocialStoreDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onProductAdded={fetchProducts}
      />
    </div>
  );
};

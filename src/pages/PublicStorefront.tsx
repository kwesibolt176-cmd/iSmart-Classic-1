import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Store, ShoppingCart, Plus, MapPin, Mail, Phone, Package, Gift } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useCart } from "@/contexts/CartContext";
import { PublicCheckout } from "@/components/PublicCheckout";
import { toast } from "@/hooks/use-toast";
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import { RetailStorefront } from "@/components/storefront/RetailStorefront";
import { RestaurantStorefront } from "@/components/storefront/RestaurantStorefront";
import { ServicesStorefront } from "@/components/storefront/ServicesStorefront";
import { HomeServicesStorefront } from "@/components/storefront/HomeServicesStorefront";
import { GiftCardPurchase } from "@/components/storefront/GiftCardPurchase";
import { useStorefrontTracking } from "@/hooks/use-storefront-tracking";
import { ProductDiscoveryBar } from "@/components/storefront/ProductDiscoveryBar";
import { useProductDiscovery } from "@/hooks/use-product-discovery";
import { PromoBanner } from "@/components/storefront/PromoBanner";
import { SocialShareButtons } from "@/components/storefront/SocialShareButtons";
import { WishlistDrawer } from "@/components/storefront/WishlistDrawer";
import { RecentlyViewedSection } from "@/components/storefront/RecentlyViewedSection";
import { QuickViewModal } from "@/components/storefront/QuickViewModal";
import { useWishlist } from "@/hooks/use-wishlist";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { getCurrencySymbol } from "@/hooks/use-currency";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  quantity: number;
  slug: string | null;
  category_name?: string;
  category_id?: string;
}

interface BusinessProfile {
  business_name: string;
  business_phone: string | null;
  business_email: string | null;
  address: string | null;
  website: string | null;
  logo_url: string | null;
  banner_url: string | null;
  industry: string | null;
  currency: string;
}

export const PublicStorefront = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { addItem, getTotalItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showGiftCardPurchase, setShowGiftCardPurchase] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);

  // Wishlist and Recently Viewed hooks
  const { wishlist, isInWishlist, toggleWishlist, removeFromWishlist, clearWishlist } = useWishlist(userId);
  const { recentlyViewed, addRecentlyViewed, clearRecentlyViewed } = useRecentlyViewed(userId);

  // Track visitor
  useStorefrontTracking(userId);

  useEffect(() => {
    if (userId) {
      fetchStoreData();
    }
  }, [userId]);

  const fetchStoreData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Fetch business profile
      const { data: businessData } = await supabase
        .from("business_profiles")
        .select("business_name, business_phone, business_email, address, website, logo_url, banner_url, industry, currency")
        .eq("user_id", userId)
        .single();

      if (businessData) {
        setBusiness(businessData);
      }

      // Fetch categories for category names
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", userId)
        .eq("is_active", true);

      const categoryMap = new Map(categoriesData?.map(c => [c.id, c.name]) || []);

      // Fetch products from inventory_items where show_on_storefront is true and in stock
      const { data: productsData } = await supabase
        .from("inventory_items")
        .select("id, name, description, price, image_url, quantity, slug, category_id, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("show_on_storefront", true)
        .gt("quantity", 0)
        .order("created_at", { ascending: false });

      // Map products with category names
      const productsWithCategories = (productsData || [])
        .filter((p) => !p.category_id || categoryMap.has(p.category_id))
        .map((p) => ({
        ...p,
        category_name: p.category_id ? categoryMap.get(p.category_id) : undefined,
      }));

      setProducts(productsWithCategories);
    } catch (error) {
      console.error("Error fetching store data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product, quantity: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (product.quantity === 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently unavailable",
        variant: "destructive",
      });
      return;
    }

    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url || undefined,
        description: product.description || undefined,
      });
    }
    
    toast({
      title: "Added to cart",
      description: `${quantity > 1 ? `${quantity}x ` : ""}${product.name} ${quantity > 1 ? "have" : "has"} been added to your cart`,
    });
  };

  const handleProductClick = (product: Product) => {
    // Track recently viewed
    addRecentlyViewed({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    });
    
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  const handleQuickView = (product: Product) => {
    addRecentlyViewed({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    });
    setQuickViewProduct(product);
    setShowQuickView(true);
  };

  const handleWishlistAddToCart = (item: { id: string; name: string; price: number; image_url?: string | null }) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image_url || undefined,
    });
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart`,
    });
  };

  // Determine industry category for storefront layout
  const getIndustryCategory = (industry: string | null): 'food' | 'retail' | 'beauty' | 'services' | 'home' => {
    if (!industry) return 'retail';
    
    const foodIndustries = ['restaurant', 'bakery', 'bar_brewery', 'catering', 'coffee_shop', 'food_truck', 'franchise', 'full_service_restaurant', 'quick_service'];
    const retailIndustries = ['retail', 'clothing_retail', 'garden_retail', 'grocery', 'home_gift', 'wine_liquor'];
    const beautyIndustries = ['salon', 'barbershop', 'beauty_salon', 'hair_salon', 'med_spa', 'nail_salon', 'tattoo_piercing'];
    const homeIndustries = ['cleaning', 'contractors', 'landscaping'];
    
    if (foodIndustries.includes(industry)) return 'food';
    if (retailIndustries.includes(industry)) return 'retail';
    if (beautyIndustries.includes(industry)) return 'beauty';
    if (homeIndustries.includes(industry)) return 'home';
    return 'services';
  };

  // Use centralized currency helper

  // Product discovery hook
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    categories,
    filteredProducts,
    resetFilters,
    hasActiveFilters,
  } = useProductDiscovery({ products });

  const renderStorefront = () => {
    const industryCategory = getIndustryCategory(business?.industry || null);
    const currency = getCurrencySymbol(business?.currency || 'GHS');

    switch (industryCategory) {
      case 'food':
        return (
          <RestaurantStorefront
            products={filteredProducts}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
            currency={currency}
            industry={business?.industry}
          />
        );
      case 'retail':
        return (
          <RetailStorefront
            products={filteredProducts}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
            currency={currency}
            industry={business?.industry}
          />
        );
      case 'beauty':
        return (
          <ServicesStorefront
            products={filteredProducts}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
            currency={currency}
            businessPhone={business?.business_phone}
            industry={business?.industry}
          />
        );
      case 'home':
        return (
          <HomeServicesStorefront
            products={filteredProducts}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
            currency={currency}
            businessPhone={business?.business_phone}
            industry={business?.industry}
          />
        );
      case 'services':
      default:
        return (
          <ServicesStorefront
            products={filteredProducts}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
            currency={currency}
            businessPhone={business?.business_phone}
            industry={business?.industry}
          />
        );
    }
  }

  if (showGiftCardPurchase && userId && business) {
    const giftCardCurrency = getCurrencySymbol(business?.currency || 'GHS');
    return (
      <GiftCardPurchase 
        userId={userId} 
        onBack={() => setShowGiftCardPurchase(false)} 
        businessName={business.business_name}
        currency={giftCardCurrency}
      />
    );
  }

  if (showCheckout && userId) {
    return <PublicCheckout userId={userId} onBack={() => setShowCheckout(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Store Not Found</h2>
          <p className="text-muted-foreground">This store doesn't exist or is no longer available.</p>
        </Card>
      </div>
    );
  }

  const currency = getCurrencySymbol(business?.currency || 'GHS');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Promo Banner */}
      <PromoBanner userId={userId!} />

      {/* Banner */}
      {business.banner_url && (
        <div className="relative w-full h-48 md:h-64 overflow-hidden">
          <img
            src={business.banner_url}
            alt={`${business.business_name} banner`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      {/* Header */}
      <div className={`bg-card/80 border-b sticky top-0 z-10 backdrop-blur-md shadow-sm ${business.banner_url ? '-mt-16' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              {business.logo_url ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-background shadow-lg bg-background flex-shrink-0">
                  <img
                    src={business.logo_url}
                    alt={`${business.business_name} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Store className="w-8 h-8 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">{business.business_name}</h1>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                  {business.business_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {business.business_phone}
                    </span>
                  )}
                  {business.business_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {business.business_email}
                    </span>
                  )}
                  {business.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {business.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Social Share */}
              <SocialShareButtons 
                title={`Shop at ${business.business_name}`}
                description="Check out amazing products!"
                compact 
              />

              {/* Wishlist */}
              <WishlistDrawer
                items={wishlist}
                onRemove={removeFromWishlist}
                onAddToCart={handleWishlistAddToCart}
                onClear={clearWishlist}
                currency={currency}
              />

              {/* Gift Cards Button */}
              <Button
                onClick={() => setShowGiftCardPurchase(true)}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Gift className="w-5 h-5" />
                <span className="hidden sm:inline">Gift Cards</span>
              </Button>

              <Button
                onClick={() => navigate("/track-order")}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Package className="w-5 h-5" />
                <span className="hidden sm:inline">Track Order</span>
              </Button>
              
              {getTotalItems() > 0 && (
                <Button
                  onClick={() => setShowCheckout(true)}
                  size="lg"
                  className="gap-2 shadow-lg relative"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="hidden sm:inline">Checkout</span>
                  <Badge variant="secondary" className="absolute -top-2 -right-2">
                    {getTotalItems()}
                  </Badge>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Industry-Specific Storefront */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recently Viewed */}
        <RecentlyViewedSection
          items={recentlyViewed}
          onProductClick={(item) => {
            const product = products.find(p => p.id === item.id);
            if (product) handleProductClick(product);
          }}
          onAddToCart={handleWishlistAddToCart}
          onClear={clearRecentlyViewed}
          currency={currency}
        />

        <ProductDiscoveryBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalProducts={products.length}
          filteredCount={filteredProducts.length}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />
        {renderStorefront()}
      </div>

      <ProductDetailsDialog
        product={selectedProduct}
        open={showProductDetails}
        onOpenChange={setShowProductDetails}
        onAddToCart={(quantity) => selectedProduct && handleAddToCart(selectedProduct, quantity)}
        userId={userId}
      />

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        open={showQuickView}
        onOpenChange={setShowQuickView}
        onAddToCart={(quantity) => quickViewProduct && handleAddToCart(quickViewProduct, quantity)}
        onViewDetails={() => {
          if (quickViewProduct) {
            setSelectedProduct(quickViewProduct);
            setShowQuickView(false);
            setShowProductDetails(true);
          }
        }}
        isInWishlist={quickViewProduct ? isInWishlist(quickViewProduct.id) : false}
        onToggleWishlist={() => {
          if (quickViewProduct) {
            toggleWishlist({
              id: quickViewProduct.id,
              name: quickViewProduct.name,
              price: quickViewProduct.price,
              image_url: quickViewProduct.image_url,
            });
          }
        }}
        currency={currency}
      />
    </div>
  );
};

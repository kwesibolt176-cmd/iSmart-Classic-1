import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MessageSquare, CheckCircle, XCircle, ThumbsUp, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "@/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  customer_name: string | null;
  customer_email: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
  inventory_item: { name: string } | null;
}

export const ProductReviewsManager = () => {
  const { user } = useBusiness();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "featured">("all");

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  const fetchReviews = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("product_reviews")
        .select(`
          *,
          inventory_item:inventory_items(name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (reviewId: string, updates: Partial<Review>) => {
    try {
      const { error } = await supabase
        .from("product_reviews")
        .update(updates)
        .eq("id", reviewId);

      if (error) throw error;

      setReviews(reviews.map(r => r.id === reviewId ? { ...r, ...updates } : r));
      toast({ title: "Review updated" });
    } catch (error) {
      toast({ title: "Error updating review", variant: "destructive" });
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      setReviews(reviews.filter(r => r.id !== reviewId));
      toast({ title: "Review deleted" });
    } catch (error) {
      toast({ title: "Error deleting review", variant: "destructive" });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      (review.customer_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (review.content?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (review.inventory_item?.name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filter === "all" ||
      (filter === "pending" && !review.is_approved) ||
      (filter === "approved" && review.is_approved) ||
      (filter === "featured" && review.is_featured);

    return matchesSearch && matchesFilter;
  });

  // Stats
  const totalReviews = reviews.length;
  const approvedReviews = reviews.filter(r => r.is_approved).length;
  const pendingReviews = reviews.filter(r => !r.is_approved).length;
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";
  const featuredReviews = reviews.filter(r => r.is_featured).length;

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading reviews...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{totalReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">{averageRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/10">
                <XCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Featured</p>
                <p className="text-2xl font-bold">{featuredReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Management */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Reviews</CardTitle>
          <CardDescription>Approve, feature, or remove product reviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="featured">Featured</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Reviews Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">
                      {review.inventory_item?.name || "Unknown Product"}
                    </TableCell>
                    <TableCell>{renderStars(review.rating)}</TableCell>
                    <TableCell className="max-w-xs">
                      {review.title && (
                        <p className="font-medium text-sm">{review.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {review.content || "No content"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{review.customer_name || "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground">{review.customer_email}</p>
                        {review.is_verified_purchase && (
                          <Badge variant="outline" className="text-green-600 text-xs mt-1">
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={review.is_approved ? "default" : "secondary"}>
                          {review.is_approved ? "Approved" : "Pending"}
                        </Badge>
                        {review.is_featured && (
                          <Badge variant="outline" className="text-purple-600">
                            Featured
                          </Badge>
                        )}
                        {review.helpful_count > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> {review.helpful_count}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Approve</span>
                          <Switch
                            checked={review.is_approved}
                            onCheckedChange={(checked) => updateReview(review.id, { is_approved: checked })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Feature</span>
                          <Switch
                            checked={review.is_featured}
                            onCheckedChange={(checked) => updateReview(review.id, { is_featured: checked })}
                            disabled={!review.is_approved}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive h-6 px-2"
                          onClick={() => deleteReview(review.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {searchQuery || filter !== "all" 
                        ? "No reviews match your filters"
                        : "No reviews yet. Reviews from your storefront will appear here."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

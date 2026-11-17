import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, ThumbsUp, CheckCircle, MessageSquare, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  customer_name: string | null;
  is_verified_purchase: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
}

interface ProductReviewsDisplayProps {
  productId: string;
  userId: string;
  productName: string;
}

export const ProductReviewsDisplay = ({ productId, userId, productName }: ProductReviewsDisplayProps) => {
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: "",
    content: "",
    customer_name: "",
    customer_email: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch approved reviews
  const { data: reviews = [], refetch } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("id, rating, title, content, customer_name, is_verified_purchase, is_featured, helpful_count, created_at")
        .eq("inventory_item_id", productId)
        .eq("is_approved", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Review[];
    },
  });

  const submitReview = async () => {
    if (!newReview.rating || !newReview.customer_name) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("product_reviews")
        .insert({
          user_id: userId,
          inventory_item_id: productId,
          rating: newReview.rating,
          title: newReview.title || null,
          content: newReview.content || null,
          customer_name: newReview.customer_name,
          customer_email: newReview.customer_email || null,
        });

      if (error) throw error;

      toast({ 
        title: "Review submitted!", 
        description: "Your review will be visible after approval." 
      });
      setShowWriteReview(false);
      setNewReview({ rating: 5, title: "", content: "", customer_name: "", customer_email: "" });
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({ title: "Error submitting review", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const markHelpful = async (reviewId: string, currentCount: number) => {
    try {
      await supabase
        .from("product_reviews")
        .update({ helpful_count: currentCount + 1 })
        .eq("id", reviewId);
      
      refetch();
      toast({ title: "Thanks for your feedback!" });
    } catch (error) {
      console.error("Error marking helpful:", error);
    }
  };

  const renderStars = (rating: number, interactive = false, onSelect?: (rating: number) => void) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"} ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onClick={() => interactive && onSelect?.(star)}
          />
        ))}
      </div>
    );
  };

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 
      : 0
  }));

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Average Rating */}
        <div className="text-center">
          {averageRating ? (
            <>
              <p className="text-4xl font-bold">{averageRating}</p>
              {renderStars(Math.round(Number(averageRating)))}
              <p className="text-sm text-muted-foreground mt-1">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No reviews yet</p>
          )}
        </div>

        {/* Rating Distribution */}
        {reviews.length > 0 && (
          <div className="flex-1 space-y-1 min-w-[200px]">
            {ratingCounts.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-2 text-sm">
                <span className="w-3">{rating}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-6 text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Write Review Button */}
        <Dialog open={showWriteReview} onOpenChange={setShowWriteReview}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Write a Review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review {productName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Your Rating *</Label>
                {renderStars(newReview.rating, true, (rating) => setNewReview({ ...newReview, rating }))}
              </div>
              <div className="space-y-2">
                <Label>Your Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={newReview.customer_name}
                  onChange={(e) => setNewReview({ ...newReview, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={newReview.customer_email}
                  onChange={(e) => setNewReview({ ...newReview, customer_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Review Title</Label>
                <Input
                  placeholder="Summary of your experience"
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Your Review</Label>
                <Textarea
                  placeholder="Tell others about your experience..."
                  value={newReview.content}
                  onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                  rows={4}
                />
              </div>
              <Button onClick={submitReview} disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className={review.is_featured ? "ring-1 ring-purple-500/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    {renderStars(review.rating)}
                    {review.is_featured && (
                      <Badge variant="outline" className="text-purple-600 gap-1">
                        <Sparkles className="w-3 h-3" /> Featured
                      </Badge>
                    )}
                    {review.is_verified_purchase && (
                      <Badge variant="outline" className="text-green-600 gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  {review.title && (
                    <h4 className="font-semibold">{review.title}</h4>
                  )}

                  {/* Content */}
                  {review.content && (
                    <p className="text-muted-foreground mt-1">{review.content}</p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span>{review.customer_name}</span>
                    <span>•</span>
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Helpful Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground gap-1"
                  onClick={() => markHelpful(review.id, review.helpful_count)}
                >
                  <ThumbsUp className="w-4 h-4" />
                  {review.helpful_count > 0 && review.helpful_count}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {reviews.length === 0 && (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
          </Card>
        )}
      </div>
    </div>
  );
};

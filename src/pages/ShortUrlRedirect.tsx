import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ShortUrlRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  useEffect(() => {
    const resolveShortUrl = async () => {
      if (!code) {
        setError("Invalid short URL");
        setLoading(false);
        return;
      }

      try {
        // Fetch the short URL
        const { data: shortUrl, error: fetchError } = await supabase
          .from("short_urls")
          .select("id, original_url, is_active, expires_at")
          .eq("short_code", code)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching short URL:", fetchError);
          setError("Failed to resolve short URL");
          setLoading(false);
          return;
        }

        if (!shortUrl) {
          setError("Short URL not found");
          setLoading(false);
          return;
        }

        if (!shortUrl.is_active) {
          setError("This short URL has been deactivated");
          setLoading(false);
          return;
        }

        if (shortUrl.expires_at && new Date(shortUrl.expires_at) < new Date()) {
          setError("This short URL has expired");
          setLoading(false);
          return;
        }

        const parsedUrl = new URL(shortUrl.original_url);
        if (parsedUrl.protocol !== "https:") {
          setError("This short URL has an unsafe destination");
          setLoading(false);
          return;
        }

        // Track the click
        await supabase.from("short_url_clicks").insert({
          short_url_id: shortUrl.id,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        });

        // Update click count
        await supabase
          .from("short_urls")
          .update({ clicks: (await supabase.from("short_urls").select("clicks").eq("id", shortUrl.id).single()).data?.clicks + 1 || 1 })
          .eq("id", shortUrl.id);

        // Store for fallback display
        setOriginalUrl(shortUrl.original_url);

        // Redirect to the original URL
        window.location.assign(parsedUrl.href);
      } catch (err) {
        console.error("Error resolving short URL:", err);
        setError("An error occurred while redirecting");
        setLoading(false);
      }
    };

    resolveShortUrl();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">Redirecting...</p>
            <p className="text-sm text-muted-foreground">Please wait while we redirect you</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Link Not Available</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Homepage
            </Button>
            {originalUrl && (
              <Button
                variant="outline"
                onClick={() => {
                  const parsed = new URL(originalUrl);
                  if (parsed.protocol === "https:") window.location.assign(parsed.href);
                }}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Try Original Link
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default ShortUrlRedirect;

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, Copy, Loader2, Check, ExternalLink } from "lucide-react";

interface UrlShortenerDialogProps {
  children?: React.ReactNode;
  defaultUrl?: string;
  onShortened?: (shortUrl: string) => void;
}

export const UrlShortenerDialog = ({ children, defaultUrl, onShortened }: UrlShortenerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(defaultUrl || "");
  const [title, setTitle] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleShorten = async () => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to shorten",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("shorten-url", {
        body: {
          url,
          title: title || undefined,
          customCode: customCode || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to shorten URL");
      }

      const result = response.data;
      
      if (result.error) {
        throw new Error(result.error);
      }

      setShortUrl(result.shortUrl);
      onShortened?.(result.shortUrl);
      
      toast({
        title: "URL Shortened!",
        description: "Your short URL has been created",
      });
    } catch (error: any) {
      console.error("Error shortening URL:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to shorten URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (shortUrl) {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Short URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setUrl(defaultUrl || "");
    setTitle("");
    setCustomCode("");
    setShortUrl(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) handleReset();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Link className="w-4 h-4 mr-2" />
            Shorten URL
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            URL Shortener
          </DialogTitle>
        </DialogHeader>

        {shortUrl ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Your short URL:</p>
              <div className="flex items-center gap-2">
                <Input
                  value={shortUrl}
                  readOnly
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="w-4 h-4" />
              <span className="truncate">{url}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Shorten Another
              </Button>
              <Button onClick={() => setOpen(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL to shorten *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/very/long/url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="My Link"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to remember this link
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customCode">Custom code (optional)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  dowo.co/s/
                </span>
                <Input
                  id="customCode"
                  placeholder="my-link"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for auto-generated code
              </p>
            </div>

            <Button
              onClick={handleShorten}
              disabled={isLoading || !url}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Shortening...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Shorten URL
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UrlShortenerDialog;

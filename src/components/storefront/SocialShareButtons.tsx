import { Button } from "@/components/ui/button";
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Link2, 
  MessageCircle,
  Check
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SocialShareButtonsProps {
  url?: string;
  title?: string;
  description?: string;
  compact?: boolean;
}

export const SocialShareButtons = ({
  url = window.location.href,
  title = "Check out this store!",
  description = "Amazing products at great prices",
  compact = false
}: SocialShareButtonsProps) => {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    }
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Share2 className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleShare('facebook')}>
            <Facebook className="w-4 h-4 mr-2 text-blue-600" />
            Facebook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('twitter')}>
            <Twitter className="w-4 h-4 mr-2 text-sky-500" />
            Twitter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
            <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Link2 className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy Link"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">Share:</span>
      
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
        onClick={() => handleShare('facebook')}
      >
        <Facebook className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200"
        onClick={() => handleShare('twitter')}
      >
        <Twitter className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
        onClick={() => handleShare('whatsapp')}
      >
        <MessageCircle className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={handleCopyLink}
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
      </Button>

      {navigator.share && (
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleNativeShare}
        >
          <Share2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

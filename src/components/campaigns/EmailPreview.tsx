import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeCampaignHtml } from "@/lib/campaign-html";

interface EmailPreviewProps {
  subject: string;
  body: string;
  senderName?: string;
  previewData?: Record<string, string>;
  viewMode?: "desktop" | "mobile";
}

export const EmailPreview = ({ 
  subject, 
  body, 
  senderName = "Your Business",
  previewData = {},
  viewMode = "desktop"
}: EmailPreviewProps) => {
  // Replace template variables with preview data
  const processedSubject = useMemo(() => {
    let result = subject;
    Object.entries(previewData).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    // Replace any remaining variables with placeholder styling
    result = result.replace(/\{\{([^}]+)\}\}/g, '<span class="text-primary">[$1]</span>');
    return sanitizeCampaignHtml(result);
  }, [subject, previewData]);

  const processedBody = useMemo(() => {
    let result = body;
    Object.entries(previewData).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    // Replace any remaining variables with placeholder styling
    result = result.replace(/\{\{([^}]+)\}\}/g, '<span style="color: hsl(var(--primary)); font-weight: 500;">[$1]</span>');
    return sanitizeCampaignHtml(result);
  }, [body, previewData]);

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      viewMode === "mobile" ? "max-w-[375px] mx-auto" : "w-full"
    )}>
      <CardHeader className="bg-muted/50 border-b py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {viewMode === "mobile" ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Email Preview
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {viewMode === "mobile" ? "Mobile" : "Desktop"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Email Header */}
        <div className="p-4 border-b bg-card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{senderName}</p>
              <p className="text-xs text-muted-foreground">to: recipient@example.com</p>
              <p 
                className="font-semibold mt-1 text-sm"
                dangerouslySetInnerHTML={{ __html: processedSubject || "No subject" }}
              />
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className={cn(
          "p-6 bg-background min-h-[200px]",
          viewMode === "mobile" ? "text-sm" : ""
        )}>
          {body ? (
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: processedBody }}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Your email content will appear here...
            </p>
          )}
        </div>

        {/* Email Footer */}
        <div className="p-4 border-t bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            This is a preview of how your email will appear to recipients.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

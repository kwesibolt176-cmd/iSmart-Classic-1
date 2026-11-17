import { useState } from "react";
import { Button } from "./ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { functionErrorMessage } from "@/lib/function-errors";

interface ImagePolishButtonProps {
  imageUrl: string;
  onImagePolished: (polishedUrl: string) => void;
  disabled?: boolean;
}

export const ImagePolishButton = ({
  imageUrl,
  onImagePolished,
  disabled = false,
}: ImagePolishButtonProps) => {
  const [polishing, setPolishing] = useState(false);

  const handlePolish = async () => {
    if (!imageUrl) {
      toast.error("Please add an image first");
      return;
    }

    setPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("polish-product-image", {
        body: { imageUrl },
      });

      if (error) throw { invokeError: error, data };

      if (data?.error) {
        toast.error(await functionErrorMessage(null, data, "Failed to polish image"));
        return;
      }

      if (data?.polishedImageUrl) {
        onImagePolished(data.polishedImageUrl);
        toast.success("Image polished successfully!");
      }
    } catch (error) {
      console.error("Error polishing image:", error);
      const failure = error as { invokeError?: unknown; data?: unknown };
      toast.error(await functionErrorMessage(failure.invokeError ?? error, failure.data, "Failed to polish image"));
    } finally {
      setPolishing(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handlePolish}
      disabled={disabled || polishing || !imageUrl}
      className="w-full"
    >
      {polishing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Polishing...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Auto Polish with AI
        </>
      )}
    </Button>
  );
};

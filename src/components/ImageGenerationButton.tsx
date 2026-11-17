import { useState } from "react";
import { Button } from "./ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { functionErrorMessage } from "@/lib/function-errors";

interface ImageGenerationButtonProps {
  productName: string;
  description?: string;
  onImageGenerated: (imageUrl: string) => void;
  disabled?: boolean;
}

export const ImageGenerationButton = ({
  productName,
  description,
  onImageGenerated,
  disabled = false,
}: ImageGenerationButtonProps) => {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!productName.trim()) {
      toast.error("Please enter a product name first");
      return;
    }

    setGenerating(true);
    try {
      const prompt = description
        ? `${productName}: ${description}`
        : productName;

      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: { prompt },
      });

      if (error) throw { invokeError: error, data };

      if (data?.error) {
        toast.error(await functionErrorMessage(null, data, "Failed to generate image"));
        return;
      }

      if (data?.imageUrl) {
        onImageGenerated(data.imageUrl);
        toast.success("Image generated successfully!");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      const failure = error as { invokeError?: unknown; data?: unknown };
      toast.error(await functionErrorMessage(failure.invokeError ?? error, failure.data, "Failed to generate image"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGenerate}
      disabled={disabled || generating || !productName.trim()}
      className="w-full"
    >
      {generating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          Generate Image with AI
        </>
      )}
    </Button>
  );
};

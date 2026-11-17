import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { MAX_IMAGE_BYTES, prepareImageForUpload } from "@/lib/image-resize";

interface ProductImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  disabled?: boolean;
}

export const ProductImageUpload = ({ 
  currentImageUrl, 
  onImageUploaded, 
  disabled 
}: ProductImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { user } = useBusiness();

  const uploadImage = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload images");
      return;
    }

    try {
      setUploading(true);
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      console.log("Uploading file:", fileName);
      
      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      console.log("Upload successful, public URL:", publicUrl);
      setPreviewUrl(publicUrl);
      onImageUploaded(publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error('Error uploading image:', error);
      const status = Number(error?.statusCode ?? error?.status);
      const tooLarge = status === 413 || /too large|entity/i.test(String(error?.message ?? ""));
      toast.error(tooLarge ? "This image is too large to upload. Try a smaller photo." : error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input onChange triggered", e.target.id, e.target.files);
    const file = e.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Large photos (4K and above) are downscaled so they fit the upload limits.
    let prepared: File;
    try {
      prepared = await prepareImageForUpload(file);
    } catch {
      toast.error("This image could not be read. Try a PNG, JPG or WebP photo.");
      e.target.value = '';
      return;
    }

    if (prepared.size > MAX_IMAGE_BYTES) {
      toast.error("Image size must be less than 5MB");
      e.target.value = '';
      return;
    }

    await uploadImage(prepared);

    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageUploaded("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const triggerFileInput = useCallback((inputRef: React.RefObject<HTMLInputElement>) => {
    console.log("Triggering file input click");
    if (inputRef.current) {
      inputRef.current.click();
    }
  }, []);

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="relative group">
          <img 
            src={previewUrl} 
            alt="Product preview" 
            className="w-full h-48 object-cover rounded-lg border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemoveImage}
            disabled={disabled || uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
          onClick={() => triggerFileInput(fileInputRef)}
          disabled={disabled || uploading}
        >
          <div className="flex justify-center gap-3">
            <Camera className="w-7 h-7 text-muted-foreground" />
            <Upload className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Click to upload an image
          </p>
          <p className="text-xs text-muted-foreground/70">
            PNG, JPG or WebP — large photos are resized automatically
          </p>
        </button>

      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="sr-only"
        aria-hidden="true"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="sr-only"
        aria-hidden="true"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => triggerFileInput(fileInputRef)}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => triggerFileInput(cameraInputRef)}
          disabled={disabled || uploading}
        >
          <Camera className="w-4 h-4 mr-2" />
          Take Photo
        </Button>
      </div>

    </div>
  );
};

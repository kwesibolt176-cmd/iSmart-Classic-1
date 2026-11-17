import { useCallback, useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string, item?: ScannedInventoryItem) => void;
  mode?: "scan" | "lookup";
  keepOpenAfterScan?: boolean;
}

export interface ScannedInventoryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  description: string | null;
  has_variants: boolean;
  track_inventory: boolean;
}

export const BarcodeScanner = ({ open, onOpenChange, onScan, mode = "lookup", keepOpenAfterScan = false }: BarcodeScannerProps) => {
  const [manualEntry, setManualEntry] = useState("");
  const [useManual, setUseManual] = useState(true);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const processingRef = useRef(false);
  const { toast } = useToast();

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (mode === "lookup") {
      // Look up the item in inventory (barcodes are unique per merchant, so scope to the signed-in user)
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user?.id) {
        toast({
          title: "Sign in required",
          description: "Please sign in again before scanning products",
          variant: "destructive",
        });
        return false;
      }

      const lookup = supabase
        .from("inventory_items")
        .select("id, name, price, quantity, image_url, description, has_variants, track_inventory")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .eq("barcode", barcode);
      const { data, error } = await lookup.limit(1).maybeSingle();

      if (error) {
        console.error("Error looking up barcode:", error);
        toast({
          title: "Error",
          description: "Failed to look up barcode",
          variant: "destructive",
        });
        return false;
      }

      if (!data) {
        toast({
          title: "Not Found",
          description: "No item found with this barcode",
          variant: "destructive",
        });
        return false;
      }

      onScan(barcode, data);
    } else {
      onScan(barcode);
    }

    return true;
  }, [mode, onScan, toast]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = manualEntry.trim();
    if (!barcode) return;

    const found = await lookupBarcode(barcode);
    if (!found) return;

    setManualEntry("");
    if (!keepOpenAfterScan) onOpenChange(false);
  };

  useEffect(() => {
    if (!open || useManual) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      processingRef.current = false;
      return;
    }

    let cancelled = false;
    setCameraStarting(true);
    setCameraError(null);

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("camera_unsupported");
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result, _error, scannerControls) => {
            if (!result || processingRef.current) return;
            processingRef.current = true;
            scannerControls.stop();

            const barcode = result.getText().trim();
            setManualEntry(barcode);
            void lookupBarcode(barcode).then((found) => {
              if (cancelled) return;
              processingRef.current = false;
              if (found) {
                setManualEntry("");
                if (keepOpenAfterScan) {
                  setUseManual(true);
                } else {
                  onOpenChange(false);
                }
              } else {
                setUseManual(true);
              }
            });
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (error) {
        if (cancelled) return;
        const denied = error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name);
        setCameraError(denied
          ? "Camera permission was denied. Allow camera access in your browser settings and try again."
          : "Camera scanning is unavailable on this device. Use a barcode scanner or enter the code manually.");
      } finally {
        if (!cancelled) setCameraStarting(false);
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      processingRef.current = false;
    };
  }, [keepOpenAfterScan, lookupBarcode, onOpenChange, open, useManual]);

  useEffect(() => {
    if (!open) {
      setUseManual(true);
      setManualEntry("");
      setCameraError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={useManual ? "default" : "outline"}
              className="flex-1"
              onClick={() => setUseManual(true)}
            >
              <Keyboard className="w-4 h-4 mr-2" />
              Manual Entry
            </Button>
            <Button
              type="button"
              variant={!useManual ? "default" : "outline"}
              className="flex-1"
              onClick={() => setUseManual(false)}
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera Scan
            </Button>
          </div>

          {useManual ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <Label htmlFor="barcode">Enter Barcode</Label>
                <Input
                  id="barcode"
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  placeholder="Scan or type a barcode, then press Enter"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                {mode === "lookup" ? "Scan Item" : "Submit Barcode"}
              </Button>
              {keepOpenAfterScan && (
                <p className="text-xs text-muted-foreground text-center">
                  Keep scanning to add more items. Each repeat scan increases the quantity.
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-lg bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  aria-label="Barcode camera preview"
                />
                {cameraStarting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
                    Starting camera…
                  </div>
                )}
                {!cameraStarting && !cameraError && (
                  <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                )}
              </div>
              {cameraError ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-destructive">{cameraError}</p>
                  <Button type="button" variant="outline" onClick={() => setUseManual(true)}>
                    Enter Barcode Manually
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  Point the rear camera at the barcode. Scanning stops as soon as a code is detected.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

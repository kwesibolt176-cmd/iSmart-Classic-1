import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductVariantsManager } from "./ProductVariantsManager";

interface ManageVariantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItemId: string;
  productName: string;
  basePrice: number;
  onVariantsChange?: () => void;
}

export const ManageVariantsDialog = ({
  open,
  onOpenChange,
  inventoryItemId,
  productName,
  basePrice,
  onVariantsChange,
}: ManageVariantsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Variants - {productName}</DialogTitle>
        </DialogHeader>
        <ProductVariantsManager
          inventoryItemId={inventoryItemId}
          basePrice={basePrice}
          onVariantsChange={onVariantsChange}
        />
      </DialogContent>
    </Dialog>
  );
};

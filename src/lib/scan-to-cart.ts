export interface ScannableProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  description?: string | null;
  has_variants?: boolean;
  track_inventory?: boolean;
}

export type ScanToCartResult =
  | {
      ok: true;
      item: {
        id: string;
        name: string;
        price: number;
        image?: string;
        description?: string;
      };
    }
  | { ok: false; reason: "out_of_stock" | "variant_required" };

export const productToScannedCartItem = (product: ScannableProduct): ScanToCartResult => {
  if (product.has_variants) {
    return { ok: false, reason: "variant_required" };
  }

  if (product.track_inventory !== false && product.quantity <= 0) {
    return { ok: false, reason: "out_of_stock" };
  }

  return {
    ok: true,
    item: {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image_url || undefined,
      description: product.description || undefined,
    },
  };
};

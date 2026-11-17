import { describe, expect, it } from "vitest";
import { productToScannedCartItem } from "./scan-to-cart";

const product = {
  id: "product-1",
  name: "Coffee",
  price: 12.5,
  quantity: 4,
  image_url: "https://example.test/coffee.png",
  description: "Freshly roasted",
};

describe("productToScannedCartItem", () => {
  it("maps an in-stock product to the existing cart shape", () => {
    expect(productToScannedCartItem(product)).toEqual({
      ok: true,
      item: {
        id: "product-1",
        name: "Coffee",
        price: 12.5,
        image: "https://example.test/coffee.png",
        description: "Freshly roasted",
      },
    });
  });

  it("blocks tracked products that are out of stock", () => {
    expect(productToScannedCartItem({ ...product, quantity: 0 })).toEqual({
      ok: false,
      reason: "out_of_stock",
    });
  });

  it("allows untracked products regardless of quantity", () => {
    expect(productToScannedCartItem({ ...product, quantity: 0, track_inventory: false }).ok).toBe(true);
  });

  it("requires normal variant selection instead of bypassing it", () => {
    expect(productToScannedCartItem({ ...product, has_variants: true })).toEqual({
      ok: false,
      reason: "variant_required",
    });
  });
});

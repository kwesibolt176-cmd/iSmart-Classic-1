/**
 * Shrinks product photos in the browser before upload.
 *
 * The public proxy in front of storage rejects large request bodies (HTTP 413),
 * and the product-images bucket caps objects at 5MB. Phone and camera photos
 * routinely exceed both, so we downscale and re-encode them first.
 */

export const MAX_IMAGE_EDGE = 2048;
/** Stay under the proxy's default 1MB body limit where we can. */
export const TARGET_IMAGE_BYTES = 900 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const fitWithin = (width: number, height: number, maxEdge = MAX_IMAGE_EDGE) => {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const loadBitmap = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * Returns a file that is at most MAX_IMAGE_EDGE on its longest side and, when
 * possible, under TARGET_IMAGE_BYTES. Small images are returned unchanged.
 */
export const prepareImageForUpload = async (file: File): Promise<File> => {
  const bitmap = await loadBitmap(file);
  const sourceWidth = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
  const sourceHeight = "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;
  const { width, height } = fitWithin(sourceWidth, sourceHeight);

  const alreadySmall = width === sourceWidth && file.size <= TARGET_IMAGE_BYTES &&
    (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
  if (alreadySmall) {
    if ("close" in bitmap) bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot resize images.");
  context.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) bitmap.close();

  // WebP keeps transparency; browsers that cannot encode it return PNG, so fall back to JPEG.
  let type = "image/webp";
  let blob: Blob | null = null;
  for (const quality of [0.85, 0.75, 0.65, 0.55]) {
    blob = await toBlob(canvas, type, quality);
    if (blob && blob.type !== type) {
      type = "image/jpeg";
      blob = await toBlob(canvas, type, quality);
    }
    if (blob && blob.size <= TARGET_IMAGE_BYTES) break;
  }
  if (!blob) throw new Error("The image could not be processed.");

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${type === "image/webp" ? "webp" : "jpg"}`, { type });
};

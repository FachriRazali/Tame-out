// Reads a photo chosen in a <input type="file"> and returns it as a base64
// data: URL, entirely in the browser — no upload endpoint, no disk write
// (this app runs on Vercel, whose serverless filesystem is read-only; the
// photo is stored straight in the cafes.cover_image_url TEXT column).
//
// The photo is also downscaled (longest side <= 1600px) and re-encoded as
// JPEG before it is returned. A raw phone photo is 3-8MB, and as base64 it
// would blow past Vercel's ~4.5MB request-body limit; after this step a
// cafe cover is typically 150-500KB, which also keeps /api/cafes light.
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_INPUT_BYTES = 12 * 1024 * 1024; // refuse absurdly large originals before decoding
const MAX_SIDE = 1600;

export async function readImageAsDataUrl(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type))
    throw new Error("Only PNG, JPG or WEBP images are accepted.");
  if (file.size > MAX_INPUT_BYTES)
    throw new Error("Image is larger than 12MB.");

  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = original;
    });
    const scale = Math.min(
      1,
      MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.fillStyle = "#ffffff"; // flatten transparency (JPEG has none)
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL("image/jpeg", 0.85);
    // Keep whichever is smaller — a tiny PNG logo can be smaller than its JPEG.
    return out.length < original.length ? out : original;
  } catch {
    // Could not decode/resize in this browser — fall back to the original if it is small enough.
    if (original.length > 4_200_000)
      throw new Error("Image is too large to upload. Try a smaller photo.");
    return original;
  }
}

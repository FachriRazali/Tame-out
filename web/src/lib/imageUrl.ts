// Server-side checks for photos that arrive as JSON (cover photo + gallery).
// Photos are base64 data: URLs produced in the browser (see lib/readImage.ts)
// and stored in TEXT columns — Vercel's filesystem is read-only, so there is
// no file upload to disk anywhere in this app.
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const HTTP_URL = /^https?:\/\/\S+$/;

// ~5.5M base64 chars ≈ 4MB of image: above what the client ever sends after
// downscaling, below Vercel's ~4.5MB request-body cap.
export const MAX_DATA_URL_CHARS = 5_500_000;

export function isValidDataImage(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.length <= MAX_DATA_URL_CHARS &&
    DATA_URL.test(url)
  );
}

export function isValidHttpImage(url: unknown): url is string {
  return typeof url === "string" && url.length <= 2000 && HTTP_URL.test(url);
}

/** Splits a validated data: URL into its mime type and raw bytes. */
export function decodeDataImage(
  url: string,
): { mime: string; bytes: Buffer } | null {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(url);
  if (!m) return null;
  return { mime: m[1], bytes: Buffer.from(m[2], "base64") };
}

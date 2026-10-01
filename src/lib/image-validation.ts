/**
 * Content-based image validation (magic-byte sniffing). Never trusts the
 * filename or the browser-reported MIME type.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_LISTING = 8;

export type AllowedImage = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: string };

export function sniffImage(bytes: Uint8Array): AllowedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) {
    return { mime: "image/png", ext: "png" };
  }
  const ascii = (s: number, e: number) => String.fromCharCode(...bytes.slice(s, e));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export type ImageCheck =
  | { ok: true; image: AllowedImage }
  | { ok: false; code: "EMPTY_FILE" | "FILE_TOO_LARGE" | "UNSUPPORTED_TYPE" };

export function validateImageBytes(bytes: Uint8Array): ImageCheck {
  if (bytes.length === 0) return { ok: false, code: "EMPTY_FILE" };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, code: "FILE_TOO_LARGE" };
  const image = sniffImage(bytes);
  if (!image) return { ok: false, code: "UNSUPPORTED_TYPE" };
  return { ok: true, image };
}

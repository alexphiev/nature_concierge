import imageCompression from "browser-image-compression";
import { MAX_PHOTO_BYTES, isPlacePhotoType } from "@/src/storage/photo-types";

const COMPRESS_ABOVE_MB = 1.5;

async function assertDecodable(file: Blob): Promise<void> {
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
  } catch {
    throw new Error("image illisible");
  }
}

export const HEIC_INPUT_TYPES = ".heic,.heif,image/heic,image/heif";

// Some browsers report an empty MIME type for .heic files.
function looksLikeHeic(file: File): boolean {
  return /^image\/hei[cf]$/.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

// Loaded only when needed: libheif (WebAssembly) is heavy.
async function heicToJpeg(file: File): Promise<File> {
  const { heicTo, isHeic } = await import("heic-to");
  if (!(await isHeic(file))) throw new Error("image illisible");
  try {
    const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
    return new File([jpeg], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
  } catch {
    throw new Error("image illisible");
  }
}

export async function compressPhoto(input: File): Promise<File> {
  const file = looksLikeHeic(input) ? await heicToJpeg(input) : input;
  if (!isPlacePhotoType(file.type)) throw new Error("format non supporté (JPEG, PNG, WebP ou HEIC)");
  if (file.size <= COMPRESS_ABOVE_MB * 1024 * 1024) {
    await assertDecodable(file);
    return file;
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: COMPRESS_ABOVE_MB,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
  });
  if (compressed.size > MAX_PHOTO_BYTES) throw new Error("trop lourde, même après compression");
  await assertDecodable(compressed);
  return compressed;
}

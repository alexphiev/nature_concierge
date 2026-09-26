import imageCompression from "browser-image-compression";
import { MAX_PHOTO_BYTES, isPlacePhotoType } from "@/src/storage/photo-types";

const COMPRESS_ABOVE_MB = 1.5;

export async function compressPhoto(file: File): Promise<File> {
  if (!isPlacePhotoType(file.type)) throw new Error("format non supporté (JPEG, PNG ou WebP)");
  if (file.size <= COMPRESS_ABOVE_MB * 1024 * 1024) return file;

  const compressed = await imageCompression(file, {
    maxSizeMB: COMPRESS_ABOVE_MB,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
  });
  if (compressed.size > MAX_PHOTO_BYTES) throw new Error("trop lourde, même après compression");
  return compressed;
}

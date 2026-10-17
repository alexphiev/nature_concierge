const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type PlacePhotoType = keyof typeof EXTENSIONS;

export const PLACE_PHOTO_TYPES = Object.keys(EXTENSIONS) as PlacePhotoType[];

// Must stay below Vercel's 4.5 MB request body limit.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export function isPlacePhotoType(type: string): type is PlacePhotoType {
  return Object.hasOwn(EXTENSIONS, type);
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

// Trusts the file's magic bytes, never the client-declared MIME type.
export function sniffPlacePhotoType(bytes: Uint8Array): PlacePhotoType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

export function photoExtension(type: PlacePhotoType): string {
  return EXTENSIONS[type];
}

// Contributor photos are resized in the browser first; these are server-side safety nets.
export const CONTRIBUTION_PHOTO_MAX_BYTES = 1024 * 1024;
export const CONTRIBUTION_PHOTOS_TOTAL_MAX_BYTES = 4 * 1024 * 1024;
export const CONTRIBUTION_PHOTOS_MAX = 6;

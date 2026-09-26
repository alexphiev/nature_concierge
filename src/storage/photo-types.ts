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

export function photoExtension(type: PlacePhotoType): string {
  return EXTENSIONS[type];
}

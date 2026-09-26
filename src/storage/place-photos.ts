import { randomUUID } from "node:crypto";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { photoExtension, type PlacePhotoType } from "./photo-types";

export const PLACE_PHOTOS_BUCKET = "place-photos";

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

let client: S3Client | undefined;

// Lazy so importing this module (tests, build, pages without uploads) never
// needs the AWS_* env vars. The SDK reads AWS_ENDPOINT_URL_S3, AWS_REGION and
// the access keys from the environment itself.
function s3(): S3Client {
  client ??= new S3Client({
    forcePathStyle: true,
    // Recent SDKs add a default checksum that Neon's S3 endpoint rejects.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return client;
}

export function placePhotoKey(placeId: string, type: PlacePhotoType): string {
  return `places/${placeId}/${randomUUID()}.${photoExtension(type)}`;
}

export function placePhotoUrl(key: string): string {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint) throw new Error("AWS_ENDPOINT_URL_S3 is not set: cannot build place photo URLs");
  return `${endpoint}/${PLACE_PHOTOS_BUCKET}/${key}`;
}

export async function putPlacePhoto(
  key: string,
  body: Uint8Array,
  contentType: PlacePhotoType,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: PLACE_PHOTOS_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }),
  );
}

export async function deletePlacePhotos(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await s3().send(
    new DeleteObjectsCommand({
      Bucket: PLACE_PHOTOS_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}

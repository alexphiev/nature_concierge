import Image from "next/image";
import type { DisplayPhoto } from "../corpus/place-photos";

export function PhotoImage({
  photo,
  sizes,
  className = "",
  preload = false,
  fit = "cover",
}: {
  photo: DisplayPhoto;
  sizes: string;
  className?: string;
  preload?: boolean;
  fit?: "cover" | "contain";
}) {
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";

  if (photo.uploaded) {
    return (
      <Image src={photo.src} alt="" fill sizes={sizes} preload={preload} className={`${fitClass} ${className}`} />
    );
  }

  // Google photos go through the /lieux/[slug]/photo redirect, which next/image can't optimize.
  return (
    <img
      src={photo.src}
      alt=""
      loading={preload ? "eager" : "lazy"}
      className={`absolute inset-0 size-full ${fitClass} ${className}`}
    />
  );
}

import Image from "next/image";
import type { DisplayPhoto } from "../corpus/place-photos";

export function PhotoImage({
  photo,
  sizes,
  className = "",
  preload = false,
}: {
  photo: DisplayPhoto;
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  if (photo.uploaded) {
    return (
      <Image src={photo.src} alt="" fill sizes={sizes} preload={preload} className={`object-cover ${className}`} />
    );
  }

  // Google photos go through the /lieux/[slug]/photo redirect, which next/image can't optimize.
  return (
    <img
      src={photo.src}
      alt=""
      loading={preload ? "eager" : "lazy"}
      className={`absolute inset-0 size-full object-cover ${className}`}
    />
  );
}

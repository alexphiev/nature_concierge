import { prisma } from "./db";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uniquePlaceSlug(name: string): Promise<string> {
  const base = slugify(name) || "lieu";
  let candidate = base;
  for (let n = 2; await prisma.place.findUnique({ where: { slug: candidate } }); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}

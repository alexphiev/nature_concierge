"use server";

import { redirect } from "next/navigation";
import { runIngestion } from "@/src/corpus/ingestion";

export async function submitCapture(formData: FormData): Promise<void> {
  const text = formData.get("text");
  const placeSlug = formData.get("placeSlug");
  const imageFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const images = await Promise.all(
    imageFiles.map(async (file) => ({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
    })),
  );

  await runIngestion({
    text: typeof text === "string" && text.trim().length > 0 ? text.trim() : undefined,
    images: images.length > 0 ? images : undefined,
    placeSlug: typeof placeSlug === "string" && placeSlug.length > 0 ? placeSlug : undefined,
  });

  redirect("/admin");
}

"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto"; // Node's built-in, no new dependency —
                                          // used only for generating stable claim ids,
                                          // NOT for cuid()-style Prisma ids (those stay
                                          // Prisma's own default)
import { prisma } from "@/src/corpus/db";
import { extractBlock, transcribeImage } from "@/src/corpus/block-extraction";
import { BlockExtractionResultSchema } from "../../../src/corpus/ingestion-schema";
import type { Prisma } from "../../../prisma/generated/client";

async function runBlockExtraction(
  placeName: string,
  input: {
    sourceHint?: string;
    sourceType?: string;
    text?: string;
    images?: { data: Buffer; mimeType: string }[];
  },
): Promise<{
  status: "PENDING_REVIEW" | "ERROR";
  transcript: string | null;
  rawModelOutput: unknown;
  draftSource: unknown;
  draftClaims: Prisma.InputJsonValue;
}> {
  let transcript: string | undefined;
  let rawText: string | undefined;

  try {
    if (input.images && input.images.length > 0) {
      const transcripts = await Promise.all(
        input.images.map((img) => transcribeImage(img.data, img.mimeType)),
      );
      transcript = transcripts.join("\n\n");
    }

    rawText = await extractBlock({
      placeName,
      sourceHint: input.sourceHint,
      sourceType: input.sourceType,
      text: input.text,
      transcript,
    });

    const parsed = JSON.parse(rawText);
    const extraction = BlockExtractionResultSchema.parse(parsed);

    return {
      status: "PENDING_REVIEW",
      transcript: transcript ?? null,
      rawModelOutput: null,
      draftSource: extraction.source,
      draftClaims: extraction.claims.map((claim) => ({
        ...claim,
        id: randomUUID(),
        resolution: "pending" as const,
      })),
    };
  } catch (err) {
    return {
      status: "ERROR",
      transcript: transcript ?? null,
      rawModelOutput: {
        error: err instanceof Error ? err.message : String(err),
        ...(rawText !== undefined ? { rawOutput: rawText } : {}),
      },
      draftSource: null,
      draftClaims: [],
    };
  }
}

export async function createCapture(formData: FormData): Promise<void> {
  const placeId = String(formData.get("placeId") ?? "");
  const place = await prisma.place.findUniqueOrThrow({ where: { id: placeId } });

  const blockCount = Number(formData.get("blockCount") ?? 0);
  const draft = await prisma.ingestionDraft.create({
    data: { placeId, status: "PENDING_REVIEW" },
  });

  for (let i = 0; i < blockCount; i++) {
    const sourceHint = String(formData.get(`block-${i}-sourceHint`) ?? "") || undefined;
    const sourceType = String(formData.get(`block-${i}-sourceType`) ?? "") || undefined;
    const text = String(formData.get(`block-${i}-text`) ?? "") || undefined;
    const imageFiles = formData
      .getAll(`block-${i}-images`)
      .filter((f): f is File => f instanceof File && f.size > 0);
    const images = await Promise.all(
      imageFiles.map(async (file) => ({
        data: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type || "application/octet-stream",
      })),
    );

    const result = await runBlockExtraction(place.name, {
      sourceHint,
      sourceType,
      text,
      images: images.length > 0 ? images : undefined,
    });

    await prisma.ingestionBlock.create({
      data: {
        draftId: draft.id,
        order: i,
        inputSourceHint: sourceHint ?? null,
        inputSourceType: sourceType ?? null,
        inputText: text ?? null,
        inputImages: images.map((img) => Uint8Array.from(img.data)),
        transcript: result.transcript,
        rawModelOutput: result.rawModelOutput ?? undefined,
        draftSource: result.draftSource ?? undefined,
        draftClaims: result.draftClaims,
        status: result.status,
      },
    });
  }

  redirect(`/admin/review/${draft.id}`);
}

export async function addBlock(draftId: string, formData: FormData): Promise<void> {
  const draft = await prisma.ingestionDraft.findUniqueOrThrow({
    where: { id: draftId },
    include: { place: true, blocks: { select: { order: true } } },
  });
  const nextOrder = draft.blocks.reduce((max, b) => Math.max(max, b.order), -1) + 1;

  const sourceHint = String(formData.get("sourceHint") ?? "") || undefined;
  const sourceType = String(formData.get("sourceType") ?? "") || undefined;
  const text = String(formData.get("text") ?? "") || undefined;
  const imageFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const images = await Promise.all(
    imageFiles.map(async (file) => ({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
    })),
  );

  const result = await runBlockExtraction(draft.place.name, {
    sourceHint,
    sourceType,
    text,
    images: images.length > 0 ? images : undefined,
  });

  await prisma.ingestionBlock.create({
    data: {
      draftId,
      order: nextOrder,
      inputSourceHint: sourceHint ?? null,
      inputSourceType: sourceType ?? null,
      inputText: text ?? null,
      inputImages: images.map((img) => Uint8Array.from(img.data)),
      transcript: result.transcript,
      rawModelOutput: result.rawModelOutput ?? undefined,
      draftSource: result.draftSource ?? undefined,
      draftClaims: result.draftClaims,
      status: result.status,
    },
  });

  redirect(`/admin/review/${draftId}`);
}

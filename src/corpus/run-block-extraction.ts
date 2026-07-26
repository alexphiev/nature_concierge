import { randomUUID } from "node:crypto"; // Node's built-in, no new dependency —
                                          // used only for generating stable claim ids,
                                          // NOT for cuid()-style Prisma ids (those stay
                                          // Prisma's own default)
import { extractBlock, transcribeImage } from "./block-extraction";
import { BlockExtractionResultSchema } from "./ingestion-schema";
import type { Prisma } from "../../prisma/generated/client";

export async function runBlockExtraction(
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

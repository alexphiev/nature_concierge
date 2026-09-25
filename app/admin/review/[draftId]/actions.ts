"use server";

import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/src/corpus/db";
import { runBlockExtraction } from "@/src/corpus/run-block-extraction";
import {
  ClaimTypeSchema,
  VerdictSchema,
  VerificationSchema,
  DecayClassSchema,
  SourceTypeSchema,
} from "@/src/corpus/schema";
import { ConditionSchema, AudienceSchema } from "@/src/corpus/taxonomy";
import type { Prisma } from "../../../../prisma/generated/client";

type DraftClaim = {
  id: string;
  resolution: "pending" | "approved" | "rejected";
  claimId?: string;
  [key: string]: unknown;
};

const EditedClaimSchema = z
  .object({
    claimText: z.string().min(1),
    claimType: ClaimTypeSchema,
    conditions: z.array(ConditionSchema),
    audience: z.array(AudienceSchema),
    verdict: VerdictSchema,
    alternativePlaceSlug: z.string().optional(),
    verification: VerificationSchema,
    decayClass: DecayClassSchema,
    verifiedOn: z.coerce.date(),
    isPublic: z.boolean().default(false),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  })
  .refine((c) => c.conditions.length > 0 || c.decayClass === "PERMANENT", {
    message: "conditions must be non-empty unless decayClass is PERMANENT",
    path: ["conditions"],
  })
  .refine((c) => c.verdict !== "ALTERNATIVE" || !!c.alternativePlaceSlug, {
    message: "verdict ALTERNATIVE requires alternativePlaceSlug",
    path: ["alternativePlaceSlug"],
  });

const EditedSourceSchema = z.object({
  type: SourceTypeSchema,
  urlOrRef: z.string().nullable().optional(),
  dateCollected: z.coerce.date(),
  reliability: z.number().int().min(1).max(3),
  notes: z.string().nullable().optional(),
});

function findClaimById(claims: DraftClaim[], claimId: string): DraftClaim {
  const claim = claims.find((c) => c.id === claimId);
  if (!claim) throw new Error(`Draft claim ${claimId} not found in block`);
  return claim;
}

async function resolveAlternativePlaceId(slug: string | undefined): Promise<string | undefined> {
  if (!slug) return undefined;
  const place = await prisma.place.findUnique({ where: { slug } });
  if (!place) throw new Error(`alternativePlaceSlug "${slug}" does not resolve to a Place`);
  return place.id;
}

async function rollupBlockAndDraft(blockId: string): Promise<void> {
  const block = await prisma.ingestionBlock.findUniqueOrThrow({ where: { id: blockId } });
  const claims = block.draftClaims as unknown as DraftClaim[];
  const anyPending = claims.some((c) => c.resolution === "pending");

  revalidatePath(`/admin/review/${block.draftId}`);

  if (anyPending) return;

  await prisma.ingestionBlock.update({
    where: { id: blockId },
    data: { status: "RESOLVED" },
  });

  const draft = await prisma.ingestionDraft.findUniqueOrThrow({
    where: { id: block.draftId },
    include: { blocks: true },
  });

  const allResolved = draft.blocks.every((b) => (b.id === blockId ? true : b.status === "RESOLVED"));
  if (!allResolved) return;

  const anyApprovedAnywhere = draft.blocks.some((b) =>
    (b.id === blockId ? claims : (b.draftClaims as unknown as DraftClaim[])).some(
      (c) => c.resolution === "approved",
    ),
  );

  await prisma.ingestionDraft.update({
    where: { id: draft.id },
    data: { status: anyApprovedAnywhere ? "APPROVED" : "REJECTED" },
  });
}

async function approveClaimNoRollup(
  blockId: string,
  claimId: string,
  editedClaim: Record<string, unknown>,
  editedSource: Record<string, unknown> | undefined,
): Promise<void> {
  const block = await prisma.ingestionBlock.findUniqueOrThrow({
    where: { id: blockId },
    include: { draft: true },
  });

  const claims = block.draftClaims as unknown as DraftClaim[];
  findClaimById(claims, claimId); // throws if claimId doesn't match any draft claim

  const parsedClaim = EditedClaimSchema.parse(editedClaim);

  if (parsedClaim.verification === "FIELD_VERIFIED" && block.inputSourceType !== "PERSONAL_VISIT") {
    throw new Error(
      "FIELD_VERIFIED requires the block's source type to be PERSONAL_VISIT",
    );
  }

  let sourceId = block.sourceId;

  if (!sourceId) {
    const parsedSource = EditedSourceSchema.parse(editedSource);
    const source = await prisma.source.create({
      data: {
        type: parsedSource.type,
        urlOrRef: parsedSource.urlOrRef ?? null,
        dateCollected: parsedSource.dateCollected,
        reliability: parsedSource.reliability,
        notes: parsedSource.notes ?? null,
      },
    });
    sourceId = source.id;
    await prisma.ingestionBlock.update({
      where: { id: blockId },
      data: { sourceId },
    });
  } else if (editedSource) {
    const parsedSource = EditedSourceSchema.parse(editedSource);
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        type: parsedSource.type,
        urlOrRef: parsedSource.urlOrRef ?? null,
        dateCollected: parsedSource.dateCollected,
        reliability: parsedSource.reliability,
        notes: parsedSource.notes ?? null,
      },
    });
  }

  const alternativePlaceId = await resolveAlternativePlaceId(parsedClaim.alternativePlaceSlug);

  const claim = await prisma.claim.create({
    data: {
      placeId: block.draft.placeId,
      claimText: parsedClaim.claimText,
      claimType: parsedClaim.claimType,
      conditions: parsedClaim.conditions,
      audience: parsedClaim.audience,
      verdict: parsedClaim.verdict,
      alternativePlaceId: alternativePlaceId ?? null,
      sourceId,
      verification: parsedClaim.verification,
      decayClass: parsedClaim.decayClass,
      verifiedOn: parsedClaim.verifiedOn,
      isPublic: parsedClaim.isPublic,
      status: parsedClaim.status,
    },
  });

  const updatedClaims: DraftClaim[] = claims.map((c) =>
    c.id === claimId ? { ...c, resolution: "approved" as const, claimId: claim.id } : c,
  );

  await prisma.ingestionBlock.update({
    where: { id: blockId },
    data: { draftClaims: updatedClaims as unknown as Prisma.InputJsonValue },
  });
}

async function rejectClaimNoRollup(blockId: string, claimId: string): Promise<void> {
  const block = await prisma.ingestionBlock.findUniqueOrThrow({ where: { id: blockId } });
  const claims = block.draftClaims as unknown as DraftClaim[];
  findClaimById(claims, claimId);

  const updatedClaims: DraftClaim[] = claims.map((c) =>
    c.id === claimId ? { ...c, resolution: "rejected" as const } : c,
  );

  await prisma.ingestionBlock.update({
    where: { id: blockId },
    data: { draftClaims: updatedClaims as unknown as Prisma.InputJsonValue },
  });
}

export async function approveClaim(
  blockId: string,
  claimId: string,
  editedClaim: Record<string, unknown>,
  editedSource?: Record<string, unknown>,
): Promise<void> {
  await approveClaimNoRollup(blockId, claimId, editedClaim, editedSource);
  updateTag("corpus");
  await rollupBlockAndDraft(blockId);
}

export async function rejectClaim(blockId: string, claimId: string): Promise<void> {
  await rejectClaimNoRollup(blockId, claimId);
  await rollupBlockAndDraft(blockId);
}

export async function retryExtraction(blockId: string): Promise<void> {
  const block = await prisma.ingestionBlock.findUniqueOrThrow({
    where: { id: blockId },
    include: { draft: { include: { place: true } } },
  });

  const claims = block.draftClaims as unknown as DraftClaim[];
  const anyResolved = claims.some((c) => c.resolution !== "pending");
  if (anyResolved) {
    throw new Error(
      "Cannot retry extraction: this block already has a resolved claim (approved or rejected)",
    );
  }

  const images = (block.inputImages ?? []).map((data) => ({
    data: Buffer.from(data),
    mimeType: "application/octet-stream",
  }));

  const result = await runBlockExtraction(block.draft.place.name, {
    sourceHint: block.inputSourceHint ?? undefined,
    sourceType: block.inputSourceType ?? undefined,
    text: block.inputText ?? undefined,
    images: images.length > 0 ? images : undefined,
  });

  await prisma.ingestionBlock.update({
    where: { id: blockId },
    data: {
      transcript: result.transcript,
      rawModelOutput: result.rawModelOutput ?? undefined,
      draftSource: result.draftSource ?? undefined,
      draftClaims: result.draftClaims,
      status: result.status,
    },
  });

  revalidatePath(`/admin/review/${block.draftId}`);
}

export async function approveAllInBlock(
  blockId: string,
  editedClaims: Record<string, unknown>[],
): Promise<void> {
  try {
    for (const editedClaim of editedClaims) {
      const claimId = editedClaim.id as string;
      const { editedSource, ...rest } = editedClaim as { editedSource?: Record<string, unknown> } & Record<
        string,
        unknown
      >;
      await approveClaimNoRollup(blockId, claimId, rest, editedSource);
    }
  } finally {
    // Claims already written for earlier claimIds in this block must still
    // be invalidated even if a later claim in the loop throws.
    updateTag("corpus");
  }
  await rollupBlockAndDraft(blockId);
}

export async function acknowledgeEmptyBlock(blockId: string): Promise<void> {
  const block = await prisma.ingestionBlock.findUniqueOrThrow({ where: { id: blockId } });
  const claims = block.draftClaims as unknown as DraftClaim[];
  if (claims.length > 0) {
    throw new Error("Cannot acknowledge a block that has draft claims");
  }
  await rollupBlockAndDraft(blockId);
}

export async function rejectAllInBlock(blockId: string): Promise<void> {
  const block = await prisma.ingestionBlock.findUniqueOrThrow({ where: { id: blockId } });
  const claims = block.draftClaims as unknown as DraftClaim[];
  const pendingIds = claims.filter((c) => c.resolution === "pending").map((c) => c.id);

  for (const claimId of pendingIds) {
    await rejectClaimNoRollup(blockId, claimId);
  }
  await rollupBlockAndDraft(blockId);
}

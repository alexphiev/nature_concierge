import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  findUniqueOrThrowBlockMock,
  updateBlockMock,
  findUniqueOrThrowDraftMock,
  updateDraftMock,
  createSourceMock,
  updateSourceMock,
  createClaimMock,
  findUniquePlaceMock,
  extractBlockMock,
  transcribeImageMock,
  updateTagMock,
} = vi.hoisted(() => ({
  findUniqueOrThrowBlockMock: vi.fn(),
  updateBlockMock: vi.fn(),
  findUniqueOrThrowDraftMock: vi.fn(),
  updateDraftMock: vi.fn(),
  createSourceMock: vi.fn(),
  updateSourceMock: vi.fn(),
  createClaimMock: vi.fn(),
  findUniquePlaceMock: vi.fn(),
  extractBlockMock: vi.fn(),
  transcribeImageMock: vi.fn(),
  updateTagMock: vi.fn(),
}));

vi.mock("@/src/corpus/db", () => ({
  prisma: {
    ingestionBlock: {
      findUniqueOrThrow: findUniqueOrThrowBlockMock,
      update: updateBlockMock,
    },
    ingestionDraft: {
      findUniqueOrThrow: findUniqueOrThrowDraftMock,
      update: updateDraftMock,
    },
    source: {
      create: createSourceMock,
      update: updateSourceMock,
    },
    claim: {
      create: createClaimMock,
    },
    place: {
      findUnique: findUniquePlaceMock,
    },
  },
}));

vi.mock("@/src/corpus/block-extraction", () => ({
  extractBlock: extractBlockMock,
  transcribeImage: transcribeImageMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: updateTagMock,
}));

import { approveClaim, rejectClaim, retryExtraction, approveAllInBlock, rejectAllInBlock } from "./actions";

const PLACE_ID = "place-1";
const DRAFT_ID = "draft-1";

function draftClaim(overrides: Record<string, unknown> = {}) {
  return {
    id: "claim-draft-1",
    resolution: "pending" as const,
    claimText: "Le sentier est fermé après 11h en été.",
    claimType: "ACCESS",
    conditions: ["ete"],
    audience: ["tous"],
    verdict: "GO",
    verification: "LOCAL_TESTIMONY",
    decayClass: "SEASONAL",
    sourceSnippet: "Le sentier est fermé après 11h en été.",
    reasoning: null,
    needsReview: false,
    placeMismatch: false,
    ...overrides,
  };
}

function draftSource(overrides: Record<string, unknown> = {}) {
  return {
    type: "LOCAL_PERSON",
    urlOrRef: null,
    dateCollected: "2026-07-20",
    reliability: 2,
    notes: null,
    ...overrides,
  };
}

function block(overrides: Record<string, unknown> = {}) {
  return {
    id: "block-1",
    draftId: DRAFT_ID,
    order: 0,
    inputSourceHint: "email OT",
    inputSourceType: "OT_CONVERSATION",
    inputText: "texte",
    inputImages: [],
    transcript: null,
    rawModelOutput: null,
    draftSource: draftSource(),
    draftClaims: [draftClaim()],
    sourceId: null,
    status: "PENDING_REVIEW",
    draft: { id: DRAFT_ID, placeId: PLACE_ID, place: { name: "Port d'Alon" } },
    ...overrides,
  };
}

function editedClaim(overrides: Record<string, unknown> = {}) {
  return {
    claimText: "Le sentier est fermé après 11h en été.",
    claimType: "ACCESS",
    conditions: ["ete"],
    audience: ["tous"],
    verdict: "GO",
    verification: "LOCAL_TESTIMONY",
    decayClass: "SEASONAL",
    verifiedOn: "2026-07-21",
    isPublic: false,
    ...overrides,
  };
}

function editedSource(overrides: Record<string, unknown> = {}) {
  return {
    type: "LOCAL_PERSON",
    urlOrRef: null,
    dateCollected: "2026-07-20",
    reliability: 2,
    notes: null,
    ...overrides,
  };
}

// In-memory fake for IngestionBlock rows keyed by id, so that
// rollupBlockAndDraft's re-fetch after an update sees the just-written state —
// mirroring what a real Prisma round-trip would see. Seeded per-test via
// seedBlocks(); findUniqueOrThrowDraftMock composes its `blocks` from this
// same store unless a test overrides it directly.
let blockStore: Map<string, ReturnType<typeof block>>;

function seedBlocks(...blocks: ReturnType<typeof block>[]): void {
  blockStore = new Map(blocks.map((b) => [b.id, b]));
}

beforeEach(() => {
  updateTagMock.mockReset();
  findUniqueOrThrowBlockMock.mockReset();
  updateBlockMock.mockReset();
  findUniqueOrThrowDraftMock.mockReset();
  updateDraftMock.mockReset();
  createSourceMock.mockReset();
  updateSourceMock.mockReset();
  createClaimMock.mockReset();
  findUniquePlaceMock.mockReset();
  extractBlockMock.mockReset();
  transcribeImageMock.mockReset();

  seedBlocks(block());

  createSourceMock.mockResolvedValue({ id: "source-1" });
  createClaimMock.mockResolvedValue({ id: "claim-1" });
  updateSourceMock.mockResolvedValue({});

  findUniqueOrThrowBlockMock.mockImplementation(async ({ where: { id } }: { where: { id: string } }) => {
    const found = blockStore.get(id);
    if (!found) throw new Error(`block ${id} not found`);
    return found;
  });

  updateBlockMock.mockImplementation(
    async ({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const current = blockStore.get(id);
      if (!current) throw new Error(`block ${id} not found`);
      const updated = { ...current, ...data };
      blockStore.set(id, updated);
      return updated;
    },
  );

  // Single-block draft, resolved by default, for rollup tests that don't override it.
  findUniqueOrThrowDraftMock.mockImplementation(async () => ({
    id: DRAFT_ID,
    blocks: Array.from(blockStore.values()),
  }));

  updateDraftMock.mockResolvedValue({});
});

describe("approveClaim", () => {
  it("creates a Source when the block has no sourceId yet, sets IngestionBlock.sourceId, creates the Claim, and marks the draft claim approved", async () => {
    seedBlocks(block());

    await approveClaim("block-1", "claim-draft-1", editedClaim(), editedSource());

    expect(createSourceMock).toHaveBeenCalledTimes(1);
    expect(createSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "LOCAL_PERSON",
          reliability: 2,
        }),
      }),
    );

    expect(createClaimMock).toHaveBeenCalledTimes(1);
    const claimArg = createClaimMock.mock.calls[0][0].data;
    expect(claimArg.placeId).toBe(PLACE_ID);
    expect(claimArg.sourceId).toBe("source-1");
    expect(claimArg.status).toBe("PUBLISHED");
    expect(claimArg.isPublic).toBe(false);
    expect(claimArg.claimText).toBe("Le sentier est fermé après 11h en été.");

    // Block updated with sourceId and the resolved draftClaims array.
    const blockUpdateCalls = updateBlockMock.mock.calls;
    const sourceIdUpdateCall = blockUpdateCalls.find((c) => c[0].data.sourceId === "source-1");
    expect(sourceIdUpdateCall).toBeTruthy();

    const finalDraftClaims = blockUpdateCalls.find((c) => c[0].data.draftClaims)![0].data
      .draftClaims as Array<Record<string, unknown>>;
    const updatedClaim = finalDraftClaims.find((c) => c.id === "claim-draft-1")!;
    expect(updatedClaim.resolution).toBe("approved");
    expect(updatedClaim.claimId).toBe("claim-1");
    expect(updateTagMock).toHaveBeenCalledWith("corpus");
  });

  it("reuses the existing sourceId for a second approveClaim in the same block — does not call prisma.source.create again", async () => {
    const secondClaim = draftClaim({ id: "claim-draft-2", claimText: "Deuxième claim." });
    const blockWithSource = block({
      sourceId: "source-existing",
      draftClaims: [draftClaim({ resolution: "approved", claimId: "claim-1" }), secondClaim],
    });
    seedBlocks(blockWithSource);

    await approveClaim("block-1", "claim-draft-2", editedClaim({ claimText: "Deuxième claim." }));

    expect(createSourceMock).not.toHaveBeenCalled();
    expect(createClaimMock).toHaveBeenCalledTimes(1);
    expect(createClaimMock.mock.calls[0][0].data.sourceId).toBe("source-existing");
  });

  it("creates its own, separate Source for a claim approval in a different block of the same draft", async () => {
    const blockA = block({ id: "block-A", sourceId: "source-A" });
    const blockB = block({
      id: "block-B",
      sourceId: null,
      draftClaims: [draftClaim({ id: "claim-B1" })],
    });

    seedBlocks(blockA, blockB);

    await approveClaim("block-B", "claim-B1", editedClaim(), editedSource());

    expect(createSourceMock).toHaveBeenCalledTimes(1);
    const blockUpdateCalls = updateBlockMock.mock.calls;
    const sourceIdUpdateCall = blockUpdateCalls.find((c) => c[0].where.id === "block-B" && c[0].data.sourceId);
    expect(sourceIdUpdateCall).toBeTruthy();
    expect(sourceIdUpdateCall![0].data.sourceId).not.toBe(blockA.sourceId);
  });

  it("rejects approval when editedClaim.verification is FIELD_VERIFIED but the block's inputSourceType is not PERSONAL_VISIT", async () => {
    seedBlocks(block({ inputSourceType: "OT_CONVERSATION" }));

    await expect(
      approveClaim("block-1", "claim-draft-1", editedClaim({ verification: "FIELD_VERIFIED" }), editedSource()),
    ).rejects.toThrow();

    expect(createClaimMock).not.toHaveBeenCalled();
    expect(createSourceMock).not.toHaveBeenCalled();
  });

  it("allows FIELD_VERIFIED when the block's inputSourceType is PERSONAL_VISIT", async () => {
    seedBlocks(block({ inputSourceType: "PERSONAL_VISIT" }));

    await expect(
      approveClaim("block-1", "claim-draft-1", editedClaim({ verification: "FIELD_VERIFIED" }), editedSource()),
    ).resolves.toBeUndefined();

    expect(createClaimMock).toHaveBeenCalledTimes(1);
  });

  it("rejects approval when the block has no sourceId yet and editedSource is incomplete/missing", async () => {
    seedBlocks(block({ sourceId: null }));

    await expect(approveClaim("block-1", "claim-draft-1", editedClaim(), undefined)).rejects.toThrow();
    await expect(
      approveClaim("block-1", "claim-draft-1", editedClaim(), { type: "LOCAL_PERSON" }),
    ).rejects.toThrow();

    expect(createSourceMock).not.toHaveBeenCalled();
    expect(createClaimMock).not.toHaveBeenCalled();
  });

  it("updates the existing Source row (not a new one) when editedSource differs on a second approval in a block whose sourceId is already set", async () => {
    const secondClaim = draftClaim({ id: "claim-draft-2", claimText: "Deuxième claim." });
    const blockWithSource = block({
      sourceId: "source-existing",
      draftClaims: [draftClaim({ resolution: "approved", claimId: "claim-1" }), secondClaim],
    });
    seedBlocks(blockWithSource);

    await approveClaim(
      "block-1",
      "claim-draft-2",
      editedClaim({ claimText: "Deuxième claim." }),
      editedSource({ notes: "correction ajoutée à la relecture" }),
    );

    expect(createSourceMock).not.toHaveBeenCalled();
    expect(updateSourceMock).toHaveBeenCalledTimes(1);
    expect(updateSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "source-existing" },
        data: expect.objectContaining({ notes: "correction ajoutée à la relecture" }),
      }),
    );
  });

  it("resolves the claim by its stable id, not array index, even when draftClaims has been reordered", async () => {
    const claimA = draftClaim({ id: "claim-A", claimText: "Claim A." });
    const claimB = draftClaim({ id: "claim-B", claimText: "Claim B." });
    // Reordered: claim-B is now at index 0, claim-A at index 1.
    const reorderedBlock = block({ draftClaims: [claimB, claimA] });
    seedBlocks(reorderedBlock);

    await approveClaim("block-1", "claim-A", editedClaim({ claimText: "Claim A edited." }), editedSource());

    expect(createClaimMock.mock.calls[0][0].data.claimText).toBe("Claim A edited.");

    const finalDraftClaims = updateBlockMock.mock.calls.at(-1)![0].data.draftClaims as Array<
      Record<string, unknown>
    >;
    const updatedA = finalDraftClaims.find((c) => c.id === "claim-A")!;
    const untouchedB = finalDraftClaims.find((c) => c.id === "claim-B")!;
    expect(updatedA.resolution).toBe("approved");
    expect(untouchedB.resolution).toBe("pending");
  });

  it("rolls up: approving the last pending claim in a block sets IngestionBlock.status to RESOLVED", async () => {
    seedBlocks(block());

    await approveClaim("block-1", "claim-draft-1", editedClaim(), editedSource());

    const statusUpdateCall = updateBlockMock.mock.calls.find((c) => c[0].data.status === "RESOLVED");
    expect(statusUpdateCall).toBeTruthy();
  });

  it("rolls up the draft to APPROVED once all blocks are RESOLVED and at least one claim was approved anywhere in the draft", async () => {
    // block-1 has the one pending claim we're about to approve (last one, block resolves after);
    // block-2 is already RESOLVED with a previously-rejected claim, no approvals of its own.
    seedBlocks(
      block({ id: "block-1", status: "PENDING_REVIEW" }),
      block({
        id: "block-2",
        status: "RESOLVED",
        draftClaims: [draftClaim({ id: "c2", resolution: "rejected" })],
      }),
    );

    await approveClaim("block-1", "claim-draft-1", editedClaim(), editedSource());

    expect(updateDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DRAFT_ID }, data: { status: "APPROVED" } }),
    );
  });

  it("rolls up the draft to REJECTED once all blocks are RESOLVED and no claim anywhere was approved", async () => {
    seedBlocks(
      block({ id: "block-1", status: "PENDING_REVIEW" }),
      block({
        id: "block-2",
        status: "RESOLVED",
        draftClaims: [draftClaim({ id: "c2", resolution: "rejected" })],
      }),
    );

    await rejectClaim("block-1", "claim-draft-1");

    expect(updateDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DRAFT_ID }, data: { status: "REJECTED" } }),
    );
  });

  it("does not roll up the draft while any block still has a pending claim", async () => {
    seedBlocks(
      block({ id: "block-1", status: "PENDING_REVIEW" }),
      block({
        id: "block-2",
        status: "PENDING_REVIEW",
        draftClaims: [draftClaim({ id: "c2" })],
      }),
    );

    await approveClaim("block-1", "claim-draft-1", editedClaim(), editedSource());

    expect(updateDraftMock).not.toHaveBeenCalled();
  });
});

describe("rejectClaim", () => {
  it("only updates the draft claim's JSON resolution to rejected — zero Claim/Source writes", async () => {
    seedBlocks(block());

    await rejectClaim("block-1", "claim-draft-1");

    expect(createClaimMock).not.toHaveBeenCalled();
    expect(createSourceMock).not.toHaveBeenCalled();
    expect(updateSourceMock).not.toHaveBeenCalled();

    const finalDraftClaims = updateBlockMock.mock.calls.find((c) => c[0].data.draftClaims)![0].data
      .draftClaims as Array<Record<string, unknown>>;
    const updated = finalDraftClaims.find((c) => c.id === "claim-draft-1")!;
    expect(updated.resolution).toBe("rejected");
  });

  it("resolves the claim by stable id, not array index, even when draftClaims has been reordered", async () => {
    const claimA = draftClaim({ id: "claim-A" });
    const claimB = draftClaim({ id: "claim-B" });
    seedBlocks(block({ draftClaims: [claimB, claimA] }));

    await rejectClaim("block-1", "claim-A");

    const finalDraftClaims = updateBlockMock.mock.calls.find((c) => c[0].data.draftClaims)![0].data
      .draftClaims as Array<Record<string, unknown>>;
    expect(finalDraftClaims.find((c) => c.id === "claim-A")!.resolution).toBe("rejected");
    expect(finalDraftClaims.find((c) => c.id === "claim-B")!.resolution).toBe("pending");
  });
});

describe("retryExtraction", () => {
  it("re-runs extraction and overwrites the block's draftClaims/draftSource/rawModelOutput/status on an untouched PENDING_REVIEW block", async () => {
    seedBlocks(
      block({
        status: "ERROR",
        rawModelOutput: { error: "boom" },
        draftClaims: [],
        draftSource: null,
      }),
    );
    extractBlockMock.mockResolvedValue(
      JSON.stringify({
        source: draftSource(),
        claims: [
          {
            claimText: "Nouvelle claim retentée.",
            claimType: "ACCESS",
            conditions: ["ete"],
            audience: ["tous"],
            verdict: "GO",
            verification: "LOCAL_TESTIMONY",
            decayClass: "SEASONAL",
            sourceSnippet: "Nouvelle claim retentée.",
            reasoning: null,
            needsReview: false,
            placeMismatch: false,
          },
        ],
      }),
    );

    await retryExtraction("block-1");

    expect(extractBlockMock).toHaveBeenCalledTimes(1);
    const updateCall = updateBlockMock.mock.calls.at(-1)![0];
    expect(updateCall.data.status).toBe("PENDING_REVIEW");
    expect(updateCall.data.draftClaims).toHaveLength(1);
    expect(updateCall.data.draftClaims[0].claimText).toBe("Nouvelle claim retentée.");
    expect(updateCall.data.draftClaims[0].resolution).toBe("pending");
    expect(typeof updateCall.data.draftClaims[0].id).toBe("string");
    expect(updateCall.data.draftSource).toEqual(expect.objectContaining({ type: "LOCAL_PERSON" }));
  });

  it("is refused when any claim in the block already has resolution !== pending", async () => {
    seedBlocks(
      block({
        draftClaims: [draftClaim({ resolution: "approved", claimId: "claim-1" }), draftClaim({ id: "c2" })],
      }),
    );

    await expect(retryExtraction("block-1")).rejects.toThrow();
    expect(extractBlockMock).not.toHaveBeenCalled();
    expect(updateBlockMock).not.toHaveBeenCalled();
  });

  it("passes the block's stored raw input (sourceHint/sourceType/text) and place name to extraction", async () => {
    seedBlocks(
      block({
        inputSourceHint: "photo panneau",
        inputSourceType: "PERSONAL_VISIT",
        inputText: "texte du panneau",
        draft: { id: DRAFT_ID, placeId: PLACE_ID, place: { name: "Port d'Alon" } },
      }),
    );
    extractBlockMock.mockResolvedValue(
      JSON.stringify({ source: null, claims: [] }),
    );

    await retryExtraction("block-1");

    expect(extractBlockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        placeName: "Port d'Alon",
        sourceHint: "photo panneau",
        sourceType: "PERSONAL_VISIT",
        text: "texte du panneau",
      }),
    );
  });
});

describe("approveAllInBlock", () => {
  it("approves each pending claim using the same per-claim logic and rolls up after", async () => {
    const claimA = draftClaim({ id: "claim-A", claimText: "Claim A." });
    const claimB = draftClaim({ id: "claim-B", claimText: "Claim B." });
    seedBlocks(block({ draftClaims: [claimA, claimB] }));

    await approveAllInBlock("block-1", [
      { id: "claim-A", ...editedClaim({ claimText: "Claim A." }), editedSource: editedSource() },
      { id: "claim-B", ...editedClaim({ claimText: "Claim B." }) },
    ]);

    expect(createClaimMock).toHaveBeenCalledTimes(2);
    // Second claim reuses the source created by the first.
    expect(createSourceMock).toHaveBeenCalledTimes(1);

    const statusUpdateCall = updateBlockMock.mock.calls.find((c) => c[0].data.status === "RESOLVED");
    expect(statusUpdateCall).toBeTruthy();
    expect(updateTagMock).toHaveBeenCalledWith("corpus");
  });

  it("still invalidates the corpus tag when a later claim in the block throws", async () => {
    const claimA = draftClaim({ id: "claim-A", claimText: "Claim A." });
    const claimB = draftClaim({ id: "claim-B", claimText: "Claim B." });
    seedBlocks(block({ draftClaims: [claimA, claimB] }));

    createClaimMock.mockResolvedValueOnce({ id: "claim-1" }).mockRejectedValueOnce(new Error("db down"));

    await expect(
      approveAllInBlock("block-1", [
        { id: "claim-A", ...editedClaim({ claimText: "Claim A." }), editedSource: editedSource() },
        { id: "claim-B", ...editedClaim({ claimText: "Claim B." }) },
      ]),
    ).rejects.toThrow("db down");

    expect(updateTagMock).toHaveBeenCalledWith("corpus");
  });
});

describe("rejectAllInBlock", () => {
  it("rejects every pending claim in the block and rolls up", async () => {
    const claimA = draftClaim({ id: "claim-A" });
    const claimB = draftClaim({ id: "claim-B" });
    seedBlocks(block({ draftClaims: [claimA, claimB] }));

    await rejectAllInBlock("block-1");

    expect(createClaimMock).not.toHaveBeenCalled();
    const finalDraftClaims = updateBlockMock.mock.calls.filter((c) => c[0].data.draftClaims).at(-1)![0].data
      .draftClaims as Array<Record<string, unknown>>;
    expect(finalDraftClaims.every((c) => c.resolution === "rejected")).toBe(true);

    const statusUpdateCall = updateBlockMock.mock.calls.find((c) => c[0].data.status === "RESOLVED");
    expect(statusUpdateCall).toBeTruthy();
  });

  it("does not reject claims that are already resolved", async () => {
    const claimA = draftClaim({ id: "claim-A", resolution: "approved", claimId: "claim-1" });
    const claimB = draftClaim({ id: "claim-B" });
    seedBlocks(block({ draftClaims: [claimA, claimB] }));

    await rejectAllInBlock("block-1");

    const finalDraftClaims = updateBlockMock.mock.calls.filter((c) => c[0].data.draftClaims).at(-1)![0].data
      .draftClaims as Array<Record<string, unknown>>;
    expect(finalDraftClaims.find((c) => c.id === "claim-A")!.resolution).toBe("approved");
    expect(finalDraftClaims.find((c) => c.id === "claim-B")!.resolution).toBe("rejected");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  createDraftMock,
  findUniqueOrThrowDraftMock,
  createBlockMock,
  findUniqueOrThrowPlaceMock,
  extractBlockMock,
  transcribeImageMock,
  redirectMock,
} = vi.hoisted(() => ({
  createDraftMock: vi.fn(),
  findUniqueOrThrowDraftMock: vi.fn(),
  createBlockMock: vi.fn(),
  findUniqueOrThrowPlaceMock: vi.fn(),
  extractBlockMock: vi.fn(),
  transcribeImageMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/src/corpus/db", () => ({
  prisma: {
    place: {
      findUniqueOrThrow: findUniqueOrThrowPlaceMock,
    },
    ingestionDraft: {
      create: createDraftMock,
      findUniqueOrThrow: findUniqueOrThrowDraftMock,
    },
    ingestionBlock: {
      create: createBlockMock,
    },
  },
}));

vi.mock("@/src/corpus/block-extraction", () => ({
  extractBlock: extractBlockMock,
  transcribeImage: transcribeImageMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { createCapture, addBlock } from "./actions";

const PLACE = { id: "place-1", name: "Port d'Alon" };

function validExtractionResult(claimText: string) {
  return JSON.stringify({
    source: {
      type: "LOCAL_PERSON",
      urlOrRef: null,
      dateCollected: "2026-07-20",
      reliability: 2,
      notes: null,
    },
    claims: [
      {
        claimText,
        claimType: "ACCESS",
        conditions: ["ete"],
        audience: ["tous"],
        verdict: "GO",
        verification: "LOCAL_TESTIMONY",
        decayClass: "SEASONAL",
        sourceSnippet: claimText,
        reasoning: null,
        needsReview: false,
        placeMismatch: false,
      },
    ],
  });
}

beforeEach(() => {
  createDraftMock.mockReset();
  findUniqueOrThrowDraftMock.mockReset();
  createBlockMock.mockReset();
  findUniqueOrThrowPlaceMock.mockReset();
  extractBlockMock.mockReset();
  transcribeImageMock.mockReset();
  redirectMock.mockReset();

  findUniqueOrThrowPlaceMock.mockResolvedValue(PLACE);
  createDraftMock.mockResolvedValue({ id: "draft-1", placeId: PLACE.id, status: "PENDING_REVIEW" });
  createBlockMock.mockResolvedValue({ id: "block-1" });
});

function formDataWithBlock(fields: Record<string, string>, index = 0): FormData {
  const fd = new FormData();
  fd.set("placeId", PLACE.id);
  fd.set("blockCount", String(index + 1));
  for (const [key, value] of Object.entries(fields)) {
    fd.set(`block-${index}-${key}`, value);
  }
  return fd;
}

describe("createCapture", () => {
  it("creates one IngestionDraft and one IngestionBlock (order 0) for a single text-only block", async () => {
    extractBlockMock.mockResolvedValue(validExtractionResult("Le sentier est fermé après 11h en été."));
    const formData = formDataWithBlock({
      sourceHint: "email OT Saint-Cyr",
      text: "Le sentier est fermé après 11h en été.",
    });

    await createCapture(formData);

    expect(createDraftMock).toHaveBeenCalledWith({
      data: { placeId: PLACE.id, status: "PENDING_REVIEW" },
    });

    expect(extractBlockMock).toHaveBeenCalledTimes(1);
    expect(extractBlockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        placeName: PLACE.name,
        sourceHint: "email OT Saint-Cyr",
        text: "Le sentier est fermé après 11h en été.",
      }),
    );

    expect(createBlockMock).toHaveBeenCalledTimes(1);
    const callArg = createBlockMock.mock.calls[0][0];
    expect(callArg.data.draftId).toBe("draft-1");
    expect(callArg.data.order).toBe(0);
    expect(callArg.data.status).toBe("PENDING_REVIEW");
    expect(callArg.data.draftSource).toEqual(
      expect.objectContaining({ type: "LOCAL_PERSON" }),
    );
    expect(callArg.data.draftClaims).toHaveLength(1);
    expect(callArg.data.draftClaims[0]).toEqual(
      expect.objectContaining({
        claimText: "Le sentier est fermé après 11h en été.",
        resolution: "pending",
      }),
    );
    expect(typeof callArg.data.draftClaims[0].id).toBe("string");
    expect(callArg.data.draftClaims[0].id.length).toBeGreaterThan(0);

    expect(redirectMock).toHaveBeenCalledWith("/admin/review/draft-1");
  });

  it("creates two IngestionBlocks (order 0, order 1) for a text block and an image block, and extracts each independently with block-specific content only", async () => {
    extractBlockMock.mockImplementation(async (input: { text?: string; transcript?: string }) => {
      if (input.text) {
        return validExtractionResult("Claim from block 0 text.");
      }
      return validExtractionResult("Claim from block 1 image.");
    });
    transcribeImageMock.mockResolvedValue("Panneau: accès interdit après 20h.");

    const fd = new FormData();
    fd.set("placeId", PLACE.id);
    fd.set("blockCount", "2");
    fd.set("block-0-sourceHint", "email OT");
    fd.set("block-0-text", "Le parking ferme à 19h.");
    fd.set("block-1-sourceHint", "photo panneau");
    const imageFile = new File([new Uint8Array([1, 2, 3, 4])], "sign.jpg", { type: "image/jpeg" });
    fd.append("block-1-images", imageFile);

    await createCapture(fd);

    expect(createBlockMock).toHaveBeenCalledTimes(2);
    const orders = createBlockMock.mock.calls.map((c) => c[0].data.order).sort();
    expect(orders).toEqual([0, 1]);

    expect(extractBlockMock).toHaveBeenCalledTimes(2);
    const call0Input = extractBlockMock.mock.calls[0][0];
    const call1Input = extractBlockMock.mock.calls[1][0];

    // Prove no cross-block combination: each call's content is specific to
    // its own block, never a concatenation of both blocks' text.
    expect(call0Input.text).toBe("Le parking ferme à 19h.");
    expect(call0Input.transcript).toBeUndefined();
    expect(call0Input.text).not.toContain("panneau");

    expect(call1Input.text).toBeUndefined();
    expect(call1Input.transcript).toBe("Panneau: accès interdit après 20h.");
    expect(call1Input.transcript).not.toContain("parking");

    expect(call0Input.sourceHint).not.toBe(call1Input.sourceHint);

    // Image block's transcription must have been derived only from that block's own image.
    expect(transcribeImageMock).toHaveBeenCalledTimes(1);
    expect(transcribeImageMock).toHaveBeenCalledWith(expect.any(Buffer), "image/jpeg");

    const block0Data = createBlockMock.mock.calls.find((c) => c[0].data.order === 0)![0].data;
    const block1Data = createBlockMock.mock.calls.find((c) => c[0].data.order === 1)![0].data;
    expect(block0Data.draftClaims[0].claimText).toBe("Claim from block 0 text.");
    expect(block1Data.draftClaims[0].claimText).toBe("Claim from block 1 image.");

    expect(block1Data.inputImages).toHaveLength(1);
    expect(block1Data.inputImages[0]).toBeInstanceOf(Uint8Array);
    expect(Array.from(block1Data.inputImages[0] as Uint8Array)).toEqual([1, 2, 3, 4]);
  });

  it("sets a block's status to ERROR with rawModelOutput populated when extraction throws, without affecting other blocks", async () => {
    extractBlockMock.mockImplementation(async (input: { text?: string }) => {
      if (input.text === "bad block") {
        throw new Error("Gemini call failed");
      }
      return validExtractionResult("Good claim.");
    });

    const fd = new FormData();
    fd.set("placeId", PLACE.id);
    fd.set("blockCount", "2");
    fd.set("block-0-text", "bad block");
    fd.set("block-1-text", "good block");

    await createCapture(fd);

    expect(createBlockMock).toHaveBeenCalledTimes(2);
    const block0Data = createBlockMock.mock.calls.find((c) => c[0].data.order === 0)![0].data;
    const block1Data = createBlockMock.mock.calls.find((c) => c[0].data.order === 1)![0].data;

    expect(block0Data.status).toBe("ERROR");
    expect(block0Data.rawModelOutput).toBeTruthy();
    expect(block0Data.draftClaims).toEqual([]);

    expect(block1Data.status).toBe("PENDING_REVIEW");
    expect(block1Data.draftClaims).toHaveLength(1);
  });

  it("sets a block's status to ERROR with rawModelOutput populated when extraction returns malformed JSON", async () => {
    extractBlockMock.mockResolvedValue("not valid json {{{");

    const fd = new FormData();
    fd.set("placeId", PLACE.id);
    fd.set("blockCount", "1");
    fd.set("block-0-text", "some text");

    await createCapture(fd);

    const block0Data = createBlockMock.mock.calls[0][0].data;
    expect(block0Data.status).toBe("ERROR");
    expect(block0Data.rawModelOutput).toBeTruthy();
    expect(block0Data.draftClaims).toEqual([]);
  });
});

describe("addBlock", () => {
  it("appends a new IngestionBlock with the next order value and runs extraction the same way", async () => {
    findUniqueOrThrowDraftMock.mockResolvedValue({
      id: "draft-1",
      place: PLACE,
      blocks: [{ order: 0 }, { order: 1 }],
    });
    extractBlockMock.mockResolvedValue(validExtractionResult("New block claim."));

    const fd = new FormData();
    fd.set("sourceHint", "post reddit");
    fd.set("text", "Le sentier est boueux.");

    await addBlock("draft-1", fd);

    expect(findUniqueOrThrowDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "draft-1" } }),
    );

    expect(extractBlockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        placeName: PLACE.name,
        sourceHint: "post reddit",
        text: "Le sentier est boueux.",
      }),
    );

    expect(createBlockMock).toHaveBeenCalledTimes(1);
    const callArg = createBlockMock.mock.calls[0][0];
    expect(callArg.data.draftId).toBe("draft-1");
    expect(callArg.data.order).toBe(2);
    expect(callArg.data.status).toBe("PENDING_REVIEW");

    expect(redirectMock).toHaveBeenCalledWith("/admin/review/draft-1");
  });

  it("uses order 0 when the draft has no existing blocks", async () => {
    findUniqueOrThrowDraftMock.mockResolvedValue({
      id: "draft-2",
      place: PLACE,
      blocks: [],
    });
    extractBlockMock.mockResolvedValue(validExtractionResult("First block claim."));

    const fd = new FormData();
    fd.set("text", "Texte quelconque.");

    await addBlock("draft-2", fd);

    const callArg = createBlockMock.mock.calls[0][0];
    expect(callArg.data.order).toBe(0);
  });
});

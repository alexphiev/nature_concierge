import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock, createDraftMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  createDraftMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { interactions: { create: createMock } };
  }),
}));

vi.mock("./db", () => ({
  prisma: {
    ingestionDraft: { create: createDraftMock },
  },
}));

import { runIngestion } from "./ingestion";

beforeEach(() => {
  createMock.mockReset();
  createDraftMock.mockReset();
});

describe("runIngestion", () => {
  it("writes a PENDING_REVIEW draft on a successful text-only extraction", async () => {
    createMock.mockResolvedValueOnce({
      output_text: JSON.stringify({
        place: null,
        claims: [],
        needsPlaceSelection: false,
      }),
    });
    createDraftMock.mockResolvedValueOnce({ id: "draft-1", status: "PENDING_REVIEW" });

    const result = await runIngestion({ text: "Une observation de terrain." });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING_REVIEW",
        inputText: "Une observation de terrain.",
        draftClaims: [],
      }),
    });
    expect(result.status).toBe("PENDING_REVIEW");
  });

  it("writes an ERROR draft when the model returns malformed JSON", async () => {
    createMock.mockResolvedValueOnce({ output_text: "not valid json {{{" });
    createDraftMock.mockResolvedValueOnce({ id: "draft-2", status: "ERROR" });

    const result = await runIngestion({ text: "Une observation de terrain." });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "ERROR",
        rawModelOutput: expect.anything(),
      }),
    });
    expect(result.status).toBe("ERROR");
  });

  it("writes an ERROR draft when the model output fails zod validation", async () => {
    createMock.mockResolvedValueOnce({
      output_text: JSON.stringify({
        place: null,
        claims: [{ claimText: "no sourceSnippet or other required fields" }],
        needsPlaceSelection: false,
      }),
    });
    createDraftMock.mockResolvedValueOnce({ id: "draft-3", status: "ERROR" });

    const result = await runIngestion({ text: "Une observation de terrain." });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "ERROR" }),
    });
    expect(result.status).toBe("ERROR");
  });

  it("writes an ERROR draft when the Gemini API call throws", async () => {
    createMock.mockRejectedValueOnce(new Error("network timeout"));
    createDraftMock.mockResolvedValueOnce({ id: "draft-4", status: "ERROR" });

    const result = await runIngestion({ text: "Une observation de terrain." });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "ERROR",
        rawModelOutput: expect.objectContaining({ error: expect.stringContaining("network timeout") }),
      }),
    });
    expect(result.status).toBe("ERROR");
  });

  it("concatenates image transcripts and includes them in the extraction input", async () => {
    createMock
      .mockResolvedValueOnce({ output_text: "Panneau : accès interdit après 20h." })
      .mockResolvedValueOnce({
        output_text: JSON.stringify({
          place: null,
          claims: [],
          needsPlaceSelection: false,
        }),
      });
    createDraftMock.mockResolvedValueOnce({ id: "draft-5", status: "PENDING_REVIEW" });

    await runIngestion({
      images: [{ data: Buffer.from("fake-image-bytes"), mimeType: "image/jpeg" }],
    });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transcript: expect.stringContaining("Panneau : accès interdit après 20h."),
      }),
    });
  });

  it("writes 'aucun texte exploitable détecté' when image transcription is empty", async () => {
    createMock
      .mockResolvedValueOnce({ output_text: "" })
      .mockResolvedValueOnce({
        output_text: JSON.stringify({
          place: null,
          claims: [],
          needsPlaceSelection: false,
        }),
      });
    createDraftMock.mockResolvedValueOnce({ id: "draft-6", status: "PENDING_REVIEW" });

    await runIngestion({
      images: [{ data: Buffer.from("fake-blurry-image"), mimeType: "image/jpeg" }],
    });

    expect(createDraftMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transcript: expect.stringContaining("aucun texte exploitable détecté"),
      }),
    });
  });
});

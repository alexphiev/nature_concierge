import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { interactions: { create: createMock } };
  }),
}));

import { transcribeImage, extractBlock } from "./block-extraction";
import { BLOCK_EXTRACTION_JSON_SCHEMA } from "./ingestion-schema";

beforeEach(() => {
  createMock.mockReset();
});

describe("transcribeImage", () => {
  it("returns the model's output_text trimmed", async () => {
    createMock.mockResolvedValueOnce({
      output_text: "  Panneau : accès interdit après 20h.  ",
    });

    const result = await transcribeImage(Buffer.from("fake-image-bytes"), "image/jpeg");

    expect(result).toBe("Panneau : accès interdit après 20h.");
  });

  it("returns the fallback when output_text is empty or whitespace", async () => {
    createMock.mockResolvedValueOnce({ output_text: "   " });

    const result = await transcribeImage(Buffer.from("fake-blurry-image"), "image/jpeg");

    expect(result).toBe("aucun texte exploitable détecté");
  });
});

describe("extractBlock", () => {
  it("calls client.interactions.create with response_format set to BLOCK_EXTRACTION_JSON_SCHEMA", async () => {
    createMock.mockResolvedValueOnce({ output_text: "{}" });

    await extractBlock({ placeName: "Calanque de Sormiou", text: "Le sentier est fermé l'été." });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: BLOCK_EXTRACTION_JSON_SCHEMA,
        },
      }),
    );
  });

  it("includes placeName in the prompt/input text", async () => {
    createMock.mockResolvedValueOnce({ output_text: "{}" });

    await extractBlock({ placeName: "Calanque de Sormiou", text: "Le sentier est fermé l'été." });

    const call = createMock.mock.calls[0][0];
    expect(call.system_instruction).toContain("Calanque de Sormiou");
  });

  it("returns raw text without parsing it", async () => {
    const rawOutput = JSON.stringify({ source: null, claims: [] });
    createMock.mockResolvedValueOnce({ output_text: rawOutput });

    const result = await extractBlock({ placeName: "Calanque de Sormiou", text: "Some text." });

    expect(result).toBe(rawOutput);
    expect(typeof result).toBe("string");
  });
});

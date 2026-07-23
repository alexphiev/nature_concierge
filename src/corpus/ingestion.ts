import { GoogleGenAI } from "@google/genai";
import { prisma } from "./db";
import { CONDITIONS, AUDIENCES } from "./taxonomy";
import { ExtractionResultSchema, EXTRACTION_JSON_SCHEMA } from "./ingestion-schema";
import { Prisma, type IngestionDraft } from "../../prisma/generated/client";

const client = new GoogleGenAI({});
const MODEL = process.env.GEMINI_MODEL ?? "";

const EXTRACTION_SYSTEM_INSTRUCTION = `Tu extrais des affirmations ("claims") structurées à partir d'un texte de terrain, pour un carnet de lieux nature.

Règles non négociables :
1. Une claim ne mérite d'être extraite que si elle est falsifiable et précise (un chiffre, une heure, un lieu nommé, un seuil concret). Si le texte ne permet qu'une affirmation générique ("c'est fréquenté l'été"), n'émets AUCUNE claim — une généralité vaut moins qu'aucune claim.
2. Chaque claim doit avoir des "conditions" et une "audience" tirées de la taxonomie fournie, sauf si la claim est un fait permanent (topographie, exposition) — dans ce cas decayClass = PERMANENT et conditions peut être vide, mais tu dois le justifier explicitement dans le champ "reasoning".
3. Classe "verification" de façon conservatrice : un texte venant d'une source officielle (préfecture, mairie) → OFFICIAL. Un post Reddit/Instagram ou un texte de seconde main → LOCAL_TESTIMONY au maximum, jamais FIELD_VERIFIED (réservé aux visites personnelles de l'opérateur, jamais déduit par toi).
4. "sourceSnippet" est obligatoire pour chaque claim — la citation exacte ou le paraphrase proche du texte source qui justifie la claim.
5. "claimType" et "verdict" doivent venir uniquement des valeurs fixes fournies ; en cas d'ambiguïté réelle, utilise verdict = GO_IF et needsReview = true plutôt que de deviner GO ou AVOID.
6. Préfère sous-extraire. Il vaut mieux zéro claim depuis un texte faible qu'une claim plausible mais inventée. Ne remplis pas la sortie pour paraître exhaustif.
7. N'invente jamais de lieu si le texte est ambigu sur le lieu concerné — renvoie place: null et needsPlaceSelection: true.

Taxonomie disponible :
- conditions : ${CONDITIONS.join(", ")}
- audience : ${AUDIENCES.join(", ")}
- claimType : ACCESS, CROWDING, SUITABILITY, TIP, AVOID, ALTERNATIVE, DECODING
- verdict : GO, GO_IF, AVOID, ALTERNATIVE
- verification : FIELD_VERIFIED, OFFICIAL, LOCAL_TESTIMONY, HEURISTIC
- decayClass : PERMANENT, SEASONAL, ANNUAL_CHECK`;

export async function transcribeImage(
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const interaction = await client.interactions.create({
    model: MODEL,
    input: [
      {
        type: "text",
        text: "Transcris ou décris tout texte pertinent visible sur cette image (panneau, document, capture d'écran). Réponds uniquement avec le texte pertinent, sans commentaire.",
      },
      {
        type: "image",
        data: data.toString("base64"),
        mime_type: mimeType,
      },
    ],
  });

  const text = interaction.output_text?.trim();
  return text && text.length > 0 ? text : "aucun texte exploitable détecté";
}

async function extractFromText(combinedText: string): Promise<string> {
  const interaction = await client.interactions.create({
    model: MODEL,
    input: combinedText,
    system_instruction: EXTRACTION_SYSTEM_INSTRUCTION,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: EXTRACTION_JSON_SCHEMA,
    },
  });

  return interaction.output_text ?? "";
}

export async function runIngestion(input: {
  text?: string;
  images?: { data: Buffer; mimeType: string }[];
  placeSlug?: string;
}): Promise<IngestionDraft> {
  let transcript: string | undefined;
  let rawExtractionText: string | undefined;

  try {
    if (input.images && input.images.length > 0) {
      const transcripts = await Promise.all(
        input.images.map((img) => transcribeImage(img.data, img.mimeType)),
      );
      transcript = transcripts.join("\n\n");
    }

    const combinedText = [input.text, transcript].filter(Boolean).join("\n\n");
    rawExtractionText = await extractFromText(combinedText);
    const parsed = JSON.parse(rawExtractionText);
    const extraction = ExtractionResultSchema.parse(parsed);

    return prisma.ingestionDraft.create({
      data: {
        inputText: input.text ?? null,
        inputImages: input.images?.map((img) => img.data.toString("base64")) ?? [],
        transcript: transcript ?? null,
        status: "PENDING_REVIEW",
        draftPlace: extraction.place ?? Prisma.JsonNull,
        draftClaims: extraction.claims,
      },
    });
  } catch (err) {
    return prisma.ingestionDraft.create({
      data: {
        inputText: input.text ?? null,
        inputImages: input.images?.map((img) => img.data.toString("base64")) ?? [],
        transcript: transcript ?? null,
        status: "ERROR",
        rawModelOutput: {
          error: err instanceof Error ? err.message : String(err),
          ...(rawExtractionText !== undefined ? { rawOutput: rawExtractionText } : {}),
        },
        draftClaims: [],
      },
    });
  }
}

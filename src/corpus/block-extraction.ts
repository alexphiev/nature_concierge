import { GoogleGenAI } from "@google/genai";
import { CONDITIONS, AUDIENCES } from "./taxonomy";
import { BLOCK_EXTRACTION_JSON_SCHEMA } from "./ingestion-schema";

const client = new GoogleGenAI({});
const MODEL = process.env.GEMINI_MODEL ?? "";

const EXTRACTION_SYSTEM_INSTRUCTION = `Tu extrais des affirmations ("claims") structurées à partir d'un texte de terrain, pour un carnet de lieux nature. Le lieu concerné est déjà déterminé — tu ne dois jamais en inventer un autre.

Règles non négociables :
1. Une claim ne mérite d'être extraite que si elle est falsifiable et précise (un chiffre, une heure, un lieu nommé, un seuil concret). Si le texte ne permet qu'une affirmation générique ("c'est fréquenté l'été"), n'émets AUCUNE claim — une généralité vaut moins qu'aucune claim.
2. Chaque claim doit avoir des "conditions" et une "audience" tirées de la taxonomie fournie, sauf si la claim est un fait permanent (topographie, exposition) — dans ce cas decayClass = PERMANENT et conditions peut être vide, mais tu dois le justifier explicitement dans le champ "reasoning". Pour toute claim dont decayClass = SEASONAL ou ANNUAL_CHECK, "conditions" est OBLIGATOIRE et ne doit jamais être vide — indique au moins la condition qui peut invalider la claim (ex. ouverture saisonnière, fermeture hors-saison).
3. Classe "verification" de façon conservatrice : un texte venant d'une source officielle (préfecture, mairie) → OFFICIAL. Un post Reddit/Instagram ou un texte de seconde main → LOCAL_TESTIMONY au maximum, jamais FIELD_VERIFIED (réservé aux visites personnelles de l'opérateur, jamais déduit par toi).
4. "sourceSnippet" est obligatoire pour chaque claim — la citation exacte ou le paraphrase proche du texte source qui justifie la claim.
5. "claimType" et "verdict" doivent venir uniquement des valeurs fixes fournies ; en cas d'ambiguïté réelle, utilise verdict = GO_IF et needsReview = true plutôt que de deviner GO ou AVOID.
6. Préfère sous-extraire. Il vaut mieux zéro claim depuis un texte faible qu'une claim plausible mais inventée. Ne remplis pas la sortie pour paraître exhaustif.
7. La vérification "FIELD_VERIFIED" ne peut être proposée que si la source déclarée est une visite personnelle (PERSONAL_VISIT). Dans tous les autres cas, le plafond est "OFFICIAL" (source écrite institutionnelle) ou "LOCAL_TESTIMONY".
8. Si une source est indiquée ou clairement déductible du texte, structure-la dans "source" (type tiré de la taxonomie fournie, dateCollected au format ISO, reliability de 1 à 3, notes optionnelles). Si aucune source n'est identifiable, renvoie source: null — ne l'invente jamais.
9. Le lieu concerné t'est donné : "\${placeName}". Si le texte concerne clairement un AUTRE lieu, n'attribue PAS silencieusement les claims au lieu donné — renvoie-les quand même mais avec placeMismatch: true, et nomme le lieu réel dans "reasoning".

Taxonomie disponible :
- conditions : ${CONDITIONS.join(", ")}
- audience : ${AUDIENCES.join(", ")}
- claimType : ACCESS, CROWDING, SUITABILITY, TIP, AVOID, ALTERNATIVE, DECODING
- verdict : GO, GO_IF, AVOID, ALTERNATIVE
- verification : FIELD_VERIFIED, OFFICIAL, LOCAL_TESTIMONY, HEURISTIC
- decayClass : PERMANENT, SEASONAL, ANNUAL_CHECK
- sourceType : OFFICIAL, PERSONAL_VISIT, LOCAL_PERSON, OT_CONVERSATION, REDDIT_LEAD, INSTAGRAM_LEAD, FACEBOOK_LEAD, PRESS_LEAD`;

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

export async function extractBlock(input: {
  placeName: string;
  sourceHint?: string;
  sourceType?: string;
  text?: string;
  transcript?: string;
}): Promise<string> {
  const systemInstruction = EXTRACTION_SYSTEM_INSTRUCTION.replace(
    "${placeName}",
    input.placeName,
  );

  const parts = [
    input.sourceHint ? `Source déclarée : ${input.sourceHint}` : null,
    input.sourceType ? `Type de source déclaré : ${input.sourceType}` : null,
    input.text,
    input.transcript,
  ].filter(Boolean);

  const combinedText = parts.join("\n\n");

  const interaction = await client.interactions.create({
    model: MODEL,
    input: combinedText,
    system_instruction: systemInstruction,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: BLOCK_EXTRACTION_JSON_SCHEMA,
    },
  });

  return interaction.output_text ?? "";
}

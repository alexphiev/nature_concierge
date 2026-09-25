import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/src/corpus/db";
import { CONDITIONS, AUDIENCES } from "@/src/corpus/taxonomy";
import {
  ClaimTypeSchema,
  VerdictSchema,
  VerificationSchema,
  DecayClassSchema,
  SourceTypeSchema,
} from "@/src/corpus/schema";
import { addBlock } from "../../ingest/actions";
import { VerdictFields } from "./VerdictFields";
import {
  approveClaim,
  rejectClaim,
  retryExtraction,
  approveAllInBlock,
  rejectAllInBlock,
  acknowledgeEmptyBlock,
} from "./actions";

export const metadata: Metadata = {
  title: "Relecture — Admin — Guide Nature de La Ciotat",
  robots: { index: false, follow: false },
};

const inputClass = "w-full min-w-0 rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";
const cardClass = "rounded-[10px] border border-sable/40 p-4";

type DraftClaim = {
  id: string;
  resolution: "pending" | "approved" | "rejected";
  claimId?: string;
  claimText: string;
  claimType: string;
  conditions: string[];
  audience: string[];
  verdict: string;
  verification: string;
  decayClass: string;
  sourceSnippet: string;
  reasoning: string | null;
  needsReview: boolean;
  placeMismatch: boolean;
};

type DraftSource = {
  type: string;
  urlOrRef: string | null;
  dateCollected: string;
  reliability: number;
  notes: string | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Mirrors EditedSourceSchema's required fields (app/admin/review/[draftId]/actions.ts):
// type, dateCollected, reliability. "Tout approuver" sends the raw draftSource
// unedited, so bulk approval is only safe when that snapshot already satisfies
// the schema (or the block already has a resolved sourceId).
function isSourceCompleteForBulkApproval(draftSource: DraftSource | null): boolean {
  if (!draftSource) return false;
  return (
    Boolean(draftSource.type) &&
    Boolean(draftSource.dateCollected) &&
    typeof draftSource.reliability === "number" &&
    draftSource.reliability >= 1 &&
    draftSource.reliability <= 3
  );
}

// inputImages doesn't retain original mimeType (Task 6's IngestionBlock.inputImages
// is a bare Bytes[]), so we assume JPEG — the common case for phone-camera captures.
// Not reliable for e.g. PNG screenshots; a real mimeType column would fix this.
function imageDataUrl(bytes: Uint8Array): string {
  return `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
}

function ReadOnlySourceCard({ draftSource }: { draftSource: DraftSource | null }) {
  return (
    <div className={cardClass}>
      <p className="text-sm font-medium text-encre/70">Source</p>
      <p className="text-sm">{draftSource?.type}</p>
      {draftSource?.urlOrRef && <p className="text-sm">{draftSource.urlOrRef}</p>}
      <p className="text-sm text-encre/70">
        {draftSource?.dateCollected} · fiabilité {draftSource?.reliability}
      </p>
      {draftSource?.notes && <p className="text-sm text-encre/70">{draftSource.notes}</p>}
    </div>
  );
}

// Source fields are rendered inside each pending claim's own approve form
// (see ClaimCard) rather than as a single standalone card, so that a plain
// HTML form submit carries both the claim edits and any source edit in one
// request — no cross-form JS wiring needed. All pending claims in a block
// share the same defaultValues (from the block's draftSource), so editing
// the source on any one claim's approval updates the same underlying Source
// row (per spec 11, "editable until every claim in the block is resolved").
function SourceFields({ blockId, draftSource }: { blockId: string; draftSource: DraftSource | null }) {
  return (
    <div className={cardClass}>
      <p className="text-sm font-medium text-encre/70">
        Source {draftSource ? "" : "(requise avant toute approbation dans ce bloc)"}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-encre/70">Type</span>
          <select
            name={`block-${blockId}-source-type`}
            defaultValue={draftSource?.type ?? ""}
            className={inputClass}
          >
            <option value="">— choisir —</option>
            {SourceTypeSchema.options.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-encre/70">URL / référence</span>
          <input
            type="text"
            name={`block-${blockId}-source-urlOrRef`}
            defaultValue={draftSource?.urlOrRef ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-encre/70">Date de collecte</span>
          <input
            type="date"
            name={`block-${blockId}-source-dateCollected`}
            defaultValue={draftSource?.dateCollected?.slice(0, 10) ?? todayIso()}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-encre/70">Fiabilité (1-3)</span>
          <input
            type="number"
            min={1}
            max={3}
            name={`block-${blockId}-source-reliability`}
            defaultValue={draftSource?.reliability ?? 2}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-encre/70">Notes</span>
          <textarea
            name={`block-${blockId}-source-notes`}
            rows={2}
            defaultValue={draftSource?.notes ?? ""}
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}

function ClaimFields({ prefix, claim }: { prefix: string; claim: DraftClaim }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-encre/70">Texte de la revendication</span>
        <p className="text-xs italic text-encre/60">« {claim.sourceSnippet} »</p>
        <textarea name={`${prefix}-claimText`} rows={2} defaultValue={claim.claimText} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-encre/70">Type</span>
        <select name={`${prefix}-claimType`} defaultValue={claim.claimType} className={inputClass}>
          {ClaimTypeSchema.options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-encre/70">Conditions</span>
        <select
          name={`${prefix}-conditions`}
          multiple
          defaultValue={claim.conditions}
          className={inputClass}
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-encre/70">Audience</span>
        <select name={`${prefix}-audience`} multiple defaultValue={claim.audience} className={inputClass}>
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <VerdictFields
        prefix={prefix}
        defaultVerdict={claim.verdict}
        verdictOptions={VerdictSchema.options}
        inputClass={inputClass}
      />

      <label className="flex flex-col gap-1">
        <span className="text-xs text-encre/70">Vérification</span>
        <select name={`${prefix}-verification`} defaultValue={claim.verification} className={inputClass}>
          {VerificationSchema.options.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-encre/70">Classe de péremption</span>
        <select name={`${prefix}-decayClass`} defaultValue={claim.decayClass} className={inputClass}>
          {DecayClassSchema.options.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-encre/70">Vérifié le</span>
        <input type="date" name={`${prefix}-verifiedOn`} defaultValue={todayIso()} className={inputClass} />
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" name={`${prefix}-isPublic`} defaultChecked={false} />
        <span className="text-xs text-encre/70">Public (visible sur le site)</span>
      </label>

      {claim.reasoning && <p className="text-xs text-encre/60">Raisonnement : {claim.reasoning}</p>}
      <div className="flex gap-2">
        {claim.needsReview && (
          <span className="rounded-[6px] bg-amber-200 px-2 py-0.5 text-xs text-amber-900">à vérifier</span>
        )}
        {claim.placeMismatch && (
          <span className="rounded-[6px] bg-rose-200 px-2 py-0.5 text-xs text-rose-900">
            lieu potentiellement différent
          </span>
        )}
      </div>
    </div>
  );
}

function readEditedClaimFromForm(claimId: string, formData: FormData) {
  const prefix = `claim-${claimId}`;
  return {
    claimText: String(formData.get(`${prefix}-claimText`) ?? ""),
    claimType: String(formData.get(`${prefix}-claimType`) ?? ""),
    conditions: formData.getAll(`${prefix}-conditions`).map(String),
    audience: formData.getAll(`${prefix}-audience`).map(String),
    verdict: String(formData.get(`${prefix}-verdict`) ?? ""),
    alternativePlaceSlug: String(formData.get(`${prefix}-alternativePlaceSlug`) ?? "") || undefined,
    verification: String(formData.get(`${prefix}-verification`) ?? ""),
    decayClass: String(formData.get(`${prefix}-decayClass`) ?? ""),
    verifiedOn: String(formData.get(`${prefix}-verifiedOn`) ?? todayIso()),
    isPublic: formData.get(`${prefix}-isPublic`) === "on",
  };
}

function readEditedSourceFromForm(blockId: string, formData: FormData) {
  const type = String(formData.get(`block-${blockId}-source-type`) ?? "");
  if (!type) return undefined;
  return {
    type,
    urlOrRef: String(formData.get(`block-${blockId}-source-urlOrRef`) ?? "") || null,
    dateCollected: String(formData.get(`block-${blockId}-source-dateCollected`) ?? ""),
    reliability: Number(formData.get(`block-${blockId}-source-reliability`) ?? 2),
    notes: String(formData.get(`block-${blockId}-source-notes`) ?? "") || null,
  };
}

async function approveClaimFromForm(blockId: string, claimId: string, formData: FormData): Promise<void> {
  "use server";
  await approveClaim(
    blockId,
    claimId,
    readEditedClaimFromForm(claimId, formData),
    readEditedSourceFromForm(blockId, formData),
  );
}

function ClaimCard({
  blockId,
  claim,
  draftSource,
}: {
  blockId: string;
  claim: DraftClaim;
  draftSource: DraftSource | null;
}) {
  if (claim.resolution !== "pending") {
    return (
      <div className={`${cardClass} ${claim.resolution === "rejected" ? "opacity-50" : ""}`}>
        <p className="text-sm">{claim.claimText}</p>
        <p className="text-xs text-encre/70">
          {claim.resolution === "approved" ? "Approuvée" : "Rejetée"}
        </p>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <form action={approveClaimFromForm.bind(null, blockId, claim.id)} className="flex flex-col gap-3">
        <ClaimFields prefix={`claim-${claim.id}`} claim={claim} />
        <SourceFields blockId={blockId} draftSource={draftSource} />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-[10px] bg-mediterranee px-4 py-2 text-sm text-white"
          >
            Approuver
          </button>
        </div>
      </form>
      <form action={rejectClaim.bind(null, blockId, claim.id)} className="mt-2">
        <button type="submit" className="rounded-[10px] border border-sable/40 px-4 py-2 text-sm">
          Rejeter
        </button>
      </form>
    </div>
  );
}

export default async function AdminReviewDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  await connection();

  const { draftId } = await params;

  const draft = await prisma.ingestionDraft.findUnique({
    where: { id: draftId },
    include: {
      place: true,
      blocks: { orderBy: { order: "asc" } },
    },
  });
  if (!draft) notFound();

  const allClaims = draft.blocks.flatMap((b) => b.draftClaims as unknown as DraftClaim[]);
  const sourceCount = draft.blocks.filter((b) => b.sourceId).length;
  const pendingCount = allClaims.filter((c) => c.resolution === "pending").length;

  return (
    <main className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl">
          <Link href={`/admin/places/${draft.place.id}`} className="text-mediterranee underline">
            {draft.place.name}
          </Link>{" "}
          ({draft.place.commune})
        </h1>
        <p className="text-sm text-encre/70">
          Capturé le {draft.createdAt.toISOString().slice(0, 10)} · {sourceCount} source
          {sourceCount > 1 ? "s" : ""} · {allClaims.length} revendication
          {allClaims.length > 1 ? "s" : ""}, {pendingCount} en attente
        </p>
      </header>

      <p className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3 text-sm text-encre/70">
        Assez précis pour être vérifiable (heure, chiffre, lieu nommé) ? · Conditionnel (sa vérité change
        selon les circonstances) ? · A coûté quelque chose à obtenir (visite, conversation, recoupement) ? ·
        <strong> Aurais-je pu l&apos;écrire sans quitter mon bureau → supprimer.</strong>
      </p>

      {draft.blocks.map((block) => {
        const claims = block.draftClaims as unknown as DraftClaim[];
        const draftSource = block.draftSource as unknown as DraftSource | null;
        const blockPending = claims.filter((c) => c.resolution === "pending");
        const canBulkApprove = Boolean(block.sourceId) || isSourceCompleteForBulkApproval(draftSource);

        return (
          <section key={block.id} className="flex flex-col gap-4 rounded-[10px] border border-sable/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-encre/70">
                {block.inputSourceHint || "(aucun indice de source)"}
              </p>
              <span className="text-xs text-encre/50">{block.status}</span>
            </div>

            {block.status === "ERROR" ? (
              <div className="flex flex-col gap-3">
                <pre className="overflow-x-auto rounded-[10px] bg-calcaire-deep p-3 text-xs">
                  {JSON.stringify(block.rawModelOutput, null, 2)}
                </pre>
                <form action={retryExtraction.bind(null, block.id)}>
                  <button
                    type="submit"
                    className="rounded-[10px] border border-sable/40 px-4 py-2 text-sm"
                  >
                    Réessayer l&apos;extraction
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-3">
                  {block.inputText && <p className="text-sm">{block.inputText}</p>}
                  {block.inputImages.map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={imageDataUrl(img)}
                      alt={`Image ${i + 1} du bloc`}
                      className="max-w-full rounded-[10px]"
                    />
                  ))}
                  {block.transcript && <p className="text-sm text-encre/70">{block.transcript}</p>}
                </div>

                <div className="flex flex-col gap-4">
                  {blockPending.length === 0 && <ReadOnlySourceCard draftSource={draftSource} />}

                  {claims.length === 0 && block.status === "PENDING_REVIEW" && (
                    <div className={cardClass}>
                      <p className="text-sm text-encre/70">
                        Aucune revendication extraite de ce bloc.
                      </p>
                      <form action={acknowledgeEmptyBlock.bind(null, block.id)} className="mt-2">
                        <button
                          type="submit"
                          className="rounded-[10px] border border-sable/40 px-4 py-2 text-sm"
                        >
                          Marquer comme traité
                        </button>
                      </form>
                    </div>
                  )}

                  {claims.map((claim) => (
                    <ClaimCard key={claim.id} blockId={block.id} claim={claim} draftSource={draftSource} />
                  ))}

                  {blockPending.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {!canBulkApprove && (
                        <p className="text-xs text-encre/60">
                          Complétez la source ci-dessus avant d&apos;utiliser « Tout approuver ».
                        </p>
                      )}
                      <div className="flex gap-2">
                        {canBulkApprove && (
                          <form
                            action={approveAllInBlock.bind(
                              null,
                              block.id,
                              blockPending.map((claim) => ({
                                id: claim.id,
                                claimText: claim.claimText,
                                claimType: claim.claimType,
                                conditions: claim.conditions,
                                audience: claim.audience,
                                verdict: claim.verdict,
                                verification: claim.verification,
                                decayClass: claim.decayClass,
                                verifiedOn: todayIso(),
                                isPublic: false,
                                editedSource: draftSource ?? undefined,
                              })),
                            )}
                          >
                            <button
                              type="submit"
                              className="rounded-[10px] bg-mediterranee px-4 py-2 text-sm text-white"
                            >
                              Tout approuver
                            </button>
                          </form>
                        )}
                        <form action={rejectAllInBlock.bind(null, block.id)}>
                          <button
                            type="submit"
                            className="rounded-[10px] border border-sable/40 px-4 py-2 text-sm"
                          >
                            Tout rejeter
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <footer className="flex flex-col gap-3 rounded-[10px] border border-sable/40 p-4">
        <p className="text-sm font-medium text-encre/70">Ajouter une source à cette capture</p>
        <form action={addBlock.bind(null, draft.id)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-encre/70">Indice de source</span>
            <textarea name="sourceHint" rows={2} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-encre/70">Type de source (optionnel)</span>
            <select name="sourceType" defaultValue="" className={inputClass}>
              <option value="">— laisser le modèle déduire —</option>
              {SourceTypeSchema.options.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-encre/70">Texte</span>
            <textarea name="text" rows={4} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-encre/70">Images</span>
            <input type="file" name="images" multiple accept="image/*" className={inputClass} />
          </label>
          <button
            type="submit"
            className="self-start rounded-[10px] bg-mediterranee px-5 py-3 text-white"
          >
            Ajouter
          </button>
        </form>
      </footer>
    </main>
  );
}

import Link from "next/link";
import type { SessionUser } from "@/src/auth/session";
import { FOCUS_RING } from "@/src/components/landing/shared";

const INPUT = `mt-1 block w-full rounded-lg border border-encre/30 bg-white px-3 py-2 text-base ${FOCUS_RING}`;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-pin">
      {message}
    </p>
  );
}

export function IdentityFields({
  user,
  fieldErrors,
  values,
}: {
  user: SessionUser | null;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}) {
  const showIdentity = !user || !user.name.trim();

  return (
    <div className="space-y-5">
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {showIdentity ? (
        <>
          <div>
            <label htmlFor="contrib-name" className="font-semibold">
              Votre nom affiché
            </label>
            <p id="contrib-name-hint" className="text-sm text-encre/65">
              Un prénom ou un pseudo
            </p>
            <input
              id="contrib-name"
              name="name"
              required
              minLength={2}
              maxLength={40}
              autoComplete="given-name"
              aria-describedby={fieldErrors?.name ? "contrib-name-hint contrib-name-error" : "contrib-name-hint"}
              defaultValue={values?.name}
              aria-invalid={Boolean(fieldErrors?.name)}
              className={INPUT}
            />
            <FieldError id="contrib-name-error" message={fieldErrors?.name} />
          </div>
          <div>
            <label htmlFor="contrib-commune" className="font-semibold">
              Votre commune (facultatif)
            </label>
            <input
              id="contrib-commune"
              name="commune"
              maxLength={80}
              autoComplete="address-level2"
              aria-describedby={fieldErrors?.commune ? "contrib-commune-error" : undefined}
              defaultValue={values?.commune}
              aria-invalid={Boolean(fieldErrors?.commune)}
              className={INPUT}
            />
            <FieldError id="contrib-commune-error" message={fieldErrors?.commune} />
          </div>
        </>
      ) : (
        <p>
          Publié sous le nom{" "}
          <strong>
            {user.name}
            {user.commune ? ` · ${user.commune}` : ""}
          </strong>{" "}
          ·{" "}
          <Link href="/compte" className={`underline ${FOCUS_RING}`}>
            modifier
          </Link>
        </p>
      )}

      {!user && (
        <>
          <div>
            <label htmlFor="contrib-email" className="font-semibold">
              Votre email (jamais affiché)
            </label>
            <input
              id="contrib-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-describedby={fieldErrors?.email ? "contrib-email-error" : undefined}
              defaultValue={values?.email}
              aria-invalid={Boolean(fieldErrors?.email)}
              className={INPUT}
            />
            <FieldError id="contrib-email-error" message={fieldErrors?.email} />
          </div>
          <div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="consent"
                required
                aria-describedby={fieldErrors?.consent ? "contrib-consent-error" : undefined}
                aria-invalid={Boolean(fieldErrors?.consent)}
                defaultChecked={values?.consent === "on"}
                className="mt-1 size-5 shrink-0"
              />
              <span>
                J&apos;accepte la charte et la{" "}
                <Link href="/confidentialite" className={`underline ${FOCUS_RING}`}>
                  politique de confidentialité
                </Link>
              </span>
            </label>
            <FieldError id="contrib-consent-error" message={fieldErrors?.consent} />
          </div>
        </>
      )}
    </div>
  );
}

import { getSessionUser } from "@/src/auth/session";
import { getPendingContributions } from "@/src/contributions/service";
import { CONTRIBUTION_TYPE_LABELS } from "@/src/contributions/schema";
import { placePhotoUrl } from "@/src/storage/place-photos";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export async function PendingContributions({ placeIds }: { placeIds: string[] }) {
  const user = await getSessionUser();
  if (!user) return null;

  const items = await getPendingContributions(user.id, placeIds);
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Vos contributions en relecture"
      className="flex flex-col gap-3 rounded-[14px] border border-dashed border-sable p-4"
    >
      <h2 className="font-mono text-xs tracking-wider text-pin uppercase">
        En relecture · visible par vous seul
      </h2>
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2">
            <span className="font-mono text-[0.6875rem] tracking-wider text-encre/65 uppercase">
              {CONTRIBUTION_TYPE_LABELS[item.type]}
            </span>
            {item.text && <p className="leading-relaxed whitespace-pre-line">{item.text}</p>}
            {item.photoKeys.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {item.photoKeys.map((key) => (
                  <li key={key}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={placePhotoUrl(key)}
                      alt=""
                      className="size-20 rounded-[10px] object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
            <span className="text-xs text-encre/60">
              Envoyé le {dateFormat.format(item.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

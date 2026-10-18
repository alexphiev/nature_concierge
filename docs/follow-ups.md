# Follow-ups

Small fixes and open inputs collected from the reviews of the community
contributions work (parts 1–4, October 2026). Nothing here is blocking. Tick
items off or delete them as they're done.

## Needs the owner

- [ ] **Primary domain.** The site is served on `www.laciotatnature.fr`, while
      `NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_URL`, canonicals and the sitemap use
      the apex. Make the apex primary in Vercel (www → apex), or switch both
      env vars to `https://www.laciotatnature.fr`. Until then, magic-link
      sign-in may be refused by Better Auth's origin check.
- [ ] **Tipeee link.** `TIPEEE_HREF` in `src/components/landing/shared.ts` is
      still `#` (header, footer, About).
- [ ] **About portrait.** `AboutContent.tsx` shows a « Photo · portrait
      d'Alexandre » placeholder and « [lieu de la photo] » captions.
- [ ] **Email setup.** Confirm Resend has `laciotatnature.fr` verified and that
      `contact@laciotatnature.fr` (legal pages) forwards to a real inbox.
- [ ] **Success metrics** for the community phase (`spec/00-scope.md`).
- [ ] **Part 3 deploy failure.** Vercel deployment
      `dpl_9zh2XNhcx65q1GqANimKB1F87yF2` (commit `7f31198`) failed; the next
      deploy (`8ee894e`) succeeded and a clean local build passes. Check its
      logs once to rule out a recurring cause.

## Small code fixes

### Contributor-facing
- [ ] Var places (Saint-Cyr, Bandol) are governed by the Var préfecture, but
      the « carte des accès » link only points to the Bouches-du-Rhône map
      (`risque-prevention-incendie.fr/13`). Consider a per-place link based on
      `departement`.
- [ ] A very large PNG may not compress under 1 MB in the browser; the user then
      sees « trop lourde, même après compression ». Convert PNGs to JPEG when
      compressing contributor photos.
- [ ] Accounts created from `/compte` start with an empty name, so the header
      initial shows « ? » until the first contribution asks for a name.
      Consider asking for a display name on `/compte` after first sign-in.
- [ ] The « Proposer un lieu » card at the end of the `/lieux` grid has `min-h-64`, so it
      doesn't match place-card height when it sits alone on the last row.

### Admin
- [ ] Admin dates (`app/admin/contributions/ReviewParts.tsx`) use
      `toLocaleDateString("fr-FR")` without `timeZone: "Europe/Paris"`.
- [ ] « Modifier le conseil » is limited to 10–500 characters; corpus claims
      have no such limit, so a longer existing tip can't be edited from a
      correction (the admin now sees an error). Align the limit with the corpus
      rules or edit long tips in `/admin/review`.
- [ ] `createPlaceDraft` retries on any `P2002`; check `error.meta.target`
      includes `slug` to make the intent explicit.

### Robustness
- [ ] `deleteAccount` signs the user out before the deletion transaction; if
      the transaction fails, the user is signed out and the account remains.
      Run the transaction first, then clear the session.
- [ ] Caps are count-then-create (not atomic), and attaching unconfirmed
      contributions doesn't re-check the 10-pending cap. Fine at this scale.
- [ ] `src/email/send.ts` falls back to an empty `from` when `EMAIL_FROM` is
      unset (Resend then errors). Fail with a clear message instead.
- [ ] Email security scanners (e.g. Outlook Safe Links) can open the one-time
      magic link before the user does. If users report « lien expiré » right
      away, switch to a confirm-page step before verifying.

### Code hygiene
- [ ] The top-level places filter (`!p.parentId || !activeIds.has(p.parentId)`)
      is duplicated in `app/(landing)/page.tsx` and `app/(public)/lieux/page.tsx`;
      extract a helper so the two counts can't drift.
- [ ] Formatting churn and long lines: `src/components/ClaimList.tsx`
      (re-wrapped), `IdentityFields.tsx` and `PlaceLocationFields.tsx` lines
      over 100 characters, `ContributeLink.tsx` props on one line. Consider a
      Prettier config so formatting stops drifting.
- [ ] Two visual systems (landing/About vs place pages, see
      `spec/06-design.md`) and leftover `--statut-*` tokens from the removed
      status layer.

## Known, accepted
- Pending contribution photos sit in the public-read bucket under unguessable
  keys before review (spec decision).
- Photo credits are fixed strings at approval time and don't follow renames
  (spec decision).

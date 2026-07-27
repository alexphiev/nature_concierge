# 05 — Landing Page (mission → WhatsApp)

One page, one job: a stranger understands what they get in 15 seconds and opens
WhatsApp. French only. Design per `09-design.md`.

## Copy principles (the previous version violated all four)

1. **Write from the visitor's Sunday, not from our positioning.** Nobody has a
   grievance against their office de tourisme, nobody thinks in the word
   "centralisation", nobody wants to know where *not* to go as a benefit.
   Competitor-framed sections ("un OT défend sa commune", "pas de résumés du
   web") were strategy notes leaking into copy — cut.
2. **Negation is good when it describes the visitor's failure, fatal when it
   attacks a competitor.** "Parking plein, massif fermé" converts. "Un OT ne
   peut pas faire ça" is noise.
3. **Show, don't claim.** One real answer beats three value propositions. The
   sample exchange is the single highest-converting element on this page.
4. **Named and numbered beats abstract.** A local who reads "Port d'Alon, Cap
   Canaille, Figuerolles" recognises their own territory instantly; "un carnet
   de terrain vérifié" means nothing.

## Structure

### 1. Hero — the failure avoided

- Eyebrow: `Littoral Marseille — Bandol`
- H1: **« 40 minutes de route. Parking plein. Massif fermé. »**
- Sub: « Ça n'arrive plus. Dites-nous qui vient, quand, et vos contraintes — on
  vous répond avec un lieu précis, l'heure à viser, où se garer, et un plan B si
  ça ferme. Gratuit, réponse dans la journée. »
- Primary CTA: **« Demander un plan sur WhatsApp »**
- Secondary link: « Voir les lieux couverts » → `/lieux`
- **Live proof line** (dynamic, from `StatusLog`, only rendered when data exists
  for today): « Aujourd'hui : {n} massifs fermés sur les {m} qu'on suit ·
  vérifié à {heure} ». This is the product demonstrating itself above the fold
  and it costs nothing — the data is already there. If no confirmed status for
  today, render nothing (never a stale or invented count).

A/B alternative for the H1 if the negative framing tests poorly:
« Le bon spot, le bon créneau. Sans le parking plein. »

### 2. Sample exchange — the demo (this section does the selling)

Rendered as a WhatsApp-like exchange, visually distinct (see `09-design.md`).
**Must be a real exchange, verbatim, with the asker's permission** — never
invented. Shape to aim for:

> **Q.** « Dimanche aprèm avec les enfants (3 et 6 ans), on est vers Saint-Cyr,
> il annonce du mistral. Une idée ? »
>
> **R.** « Évitez Port d'Alon dimanche : le parking sature vers 10h30 et la
> calanque prend le mistral de plein fouet. Allez plutôt à la Madrague —
> abritée, sentier court, faisable avec un 3 ans. Visez avant 10h, ça tient
> jusqu'à 11h. Vérifiez quand même la carte préfecture ce soir après 18h, le
> massif peut passer en rouge. »

Caption below: « Une vraie réponse, un vrai dimanche. C'est ce que vous
recevez. »

Until a real exchange exists (day one), use the shortest real one available
rather than a fabricated ideal — an honest thin example beats a polished fake,
and the fake is unrecoverable if a user later gets a lesser answer.

### 3. Ce que vous obtenez — three benefits, visitor's POV

Each block is a *benefit with a concrete instance*, not a capability claim.

- **« L'heure à viser. »** Pas "arrivez tôt" : le créneau réel pour ce lieu, ce
  jour-là. Ex. « le parking de X bascule vers 10h30 le dimanche en juillet. »
- **« Où se garer, vraiment. »** Là où les locaux se garent, l'entrée à prendre,
  et ce que le GPS vous fait rater.
- **« Un plan B avant d'en avoir besoin. »** Si ça ferme ou si ça sature, vous
  avez déjà l'alternative — abritée du mistral, ou accessible sans restriction.

### 4. Pourquoi c'est plus juste qu'une recherche en ligne

One compact section, framed as *why the answer is better*, never as an attack.
Two reasons, both concrete:

- « Parce que quelqu'un y est allé. » Les conseils viennent de visites, de
  conversations avec des gens du coin, et de retours d'autres sorties — pas
  d'un résumé de pages web.
- « Parce que l'accès est vérifié chaque soir. » Les fermetures incendie
  changent tous les jours, sont décidées la veille avant 19h, et sont
  éparpillées entre deux préfectures. On les relève, on les décode, on affiche
  la date de vérification.

### 5. Couverture — proof by specificity

- Real counts from the DB: « {n} lieux couverts · {m} infos vérifiées ».
  **Render actual numbers, never inflated ones.** If coverage is thin, say so
  plainly: « On démarre : {n} lieux pour l'instant, entre La Ciotat et Bandol. »
  Honest thinness reads as credible; inflation is unrecoverable.
- Name 6–8 covered places as text links (Port d'Alon, Cap Canaille,
  Figuerolles…) → their `/lieux/[slug]` pages. Recognition is the conversion
  mechanism here.
- Link: « Voir tous les lieux ».

### 6. Qui je suis · pourquoi c'est gratuit (objection handling)

Free personalised service from a stranger triggers suspicion; answer it head-on.

- « Je m'appelle Alexandre, développeur et habitant de La Ciotat. » (photo)
- **Why free**: « Je construis un carnet du coin, lieu par lieu. Vos questions
  me disent quoi aller vérifier en priorité, et vos retours corrigent le
  carnet. C'est l'échange : vous avez un plan, j'ai une raison d'y aller. »
- Trust list (short, plain):
  - Sources officielles liées, date de vérification affichée
  - Quand on ne sait pas, on le dit
  - Rien à vendre, aucune commune à promouvoir *(the neutrality point survives —
    as one line inside a trust list, not as a section headline)*
  - Pas de compte, votre prénom suffit

### 7. CTA final + footer

- H2: « Dites-nous quand vous y allez. »
- Sub: « Une date, qui vient, vos contraintes. Réponse dans la journée. »
- Same primary CTA.
- Footer: contact, mentions légales, note méthodologie, `/lieux`.

## WhatsApp deep link

`https://wa.me/{E164_NUMBER}?text={encoded}`

**Bug to fix first**: the deployed page renders
`wa.me/NEXT_PUBLIC_WHATSAPP_NUMBER` — the env var isn't substituted, so both
CTAs are dead. Verify the variable is set at build time on Vercel and that the
number is in E.164 form without `+`.

Prefill — **shorter than the previous version**, which looked like a form and
raised friction in the preview. Ask for the one thing that unlocks the rest:

> « Bonjour ! Je cherche une idée de sortie nature. Je pense y aller … »

From a place page, prefix with « À propos de {place} : ». Fires
`whatsapp_click {source}`.

## Copy rules

Sentence case, plain verbs, no exclamation inflation. The word « IA » appears
nowhere. No "révolutionnaire", no "plateforme", no "solution". The register is a
knowledgeable neighbour, not a brand.

## Out of scope

No email capture, no newsletter, no fabricated testimonials, no pricing section.

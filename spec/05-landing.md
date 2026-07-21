# 05 — Landing Page (mission → WhatsApp)

One page, one job: a stranger understands the mission in 20 seconds and opens
WhatsApp. Everything else (méthodologie, honesty markers) exists to de-risk that
single action. French only. Design per `09-design.md`.

## Page structure

### 1. Hero — the thesis
- H1: **"Le guide local qui vous dit où aller. Et où ne pas aller."**
- Sub: "Sorties nature entre Marseille et Bandol, conseillées comme le ferait un
  très bon guide du coin : selon la météo, le monde, les fermetures du jour —
  et selon vous. Gratuit, réponse en quelques heures."
- Primary CTA button: "Demander un plan sur WhatsApp" → wa.me deep link.
- Secondary link: "Voir les lieux couverts" → `/lieux`.

### 2. Why this exists (structural neutrality, 3 short blocks, no icons soup)
- **"Personne ne centralise l'essentiel."** Fermetures incendie, qualité de
  l'eau, saturation des parkings : ces infos existent, éparpillées entre
  préfectures, mairies et applis par site. On les rassemble, chaque jour.
- **"Un office de tourisme défend sa commune."** Nous, on vous défend vous.
  Si Cassis sature, on vous envoie ailleurs — un OT ne peut pas faire ça.
- **"Des conseils qu'aucune IA générique ne connaît."** Nos réponses viennent
  d'un carnet de terrain vérifié : où se garer vraiment, à quelle heure ça
  bascule, quoi éviter avec une poussette. Pas de résumés du web.

### 3. How it works (3 steps, one line each)
Écrivez-nous (qui, quand, contraintes) → On prépare votre sortie sur mesure,
avec plan B → Vous y allez ; dites-nous si c'était juste, ça aide le suivant.

### 4. Trust / honesty markers
- Who: "Je m'appelle Alexandre, développeur et habitant de La Ciotat." (photo)
- Method: sources officielles liées, date de vérification affichée partout,
  "quand on ne sait pas, on le dit".
- Free, no account, no ads. Data: pas de compte, prénom suffit. (RGPD note in footer.)

### 5. Final CTA repeat + footer
Footer: contact, mentions légales, note méthodologie, lien `/lieux`.

## WhatsApp deep link spec

`https://wa.me/{E164_NUMBER}?text={encoded}` with pre-filled template that
mirrors the intake questions (see 06):

> "Bonjour ! Je cherche une idée de sortie nature.
> Quand : … / Qui : … (enfants, chien, mobilité…) / Où en gros : … /
> Contraintes : … (météo, marche, parking…)"

From a place page, the template is prefixed with "À propos de {place}: ".
Number is a dedicated WhatsApp (not personal). CTA fires `whatsapp_click
{source: "landing" | slug}`.

## Copy rules

Sentence case, plain verbs, no exclamation inflation, no "révolutionnaire/IA"
vocabulary — the word "IA" does not appear on the landing at all. The promise is
a good local guide, not a technology.

## Out of scope

No email capture, no newsletter, no testimonials section (none exist yet — add
only real ones later), no pricing section.

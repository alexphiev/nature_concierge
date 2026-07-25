# 09 — Design System & LLM Implementation Spec (Public-Facing Views)

> **FOR LLM CODING ASSISTANTS:** You are required to implement the design for this page by strictly adhering to the design rules, tokens, typography, and component structures detailed below. Do not introduce generic Tailwind components, abstract graphics, or unauthorized colors.

---

## 1. Core Brand Identity & Rules

This site is a trustworthy field logbook for the littoral between Marseille and Bandol. It is grounded in the local landscape: **calcaire blanc** (limestone), **pin d'Alep**, **Méditerranée profonde**, and the coastal **sémaphore** vernacular.

### Strict Constraints
1. **NO Red/Orange/Terracotta in Branding:** Red and orange are strictly reserved for fire-risk warnings (`--statut-rouge`, `--statut-orange`). Do NOT use warm accents for buttons, icons, or badges. Warmth must come purely from the limestone ground (`--calcaire`) and typography.
2. **One Signature Visual Element:** The **Semaphore Logbook / Relevé du Jour** status block. Everything else must remain quiet, clean, and understated.
3. **Icons & Badges:** Avoid "icon soup." Use functional, minimal icons (`lucide-react`) sparingly.
4. **Imagery & Logos:** Never use stock images or abstract geometric graphics. If a visual brand mark is needed, strictly use simple, realistic animal print/silhouette shapes.

---

## 2. Color Palette & Tailwind Mapping

Use the following strict color map. Configure these as custom Tailwind theme tokens or inline utility classes.

| Token | Hex | Tailwind Utility | Usage |
| :--- | :--- | :--- | :--- |
| `--calcaire` | `#FAF7F0` | `bg-[#FAF7F0]` | Primary Page Background (warm limestone) |
| `--calcaire-deep`| `#F1EBDE` | `bg-[#F1EBDE]` | Secondary Cards, Alternating Sections |
| `--encre` | `#1C2B33` | `text-[#1C2B33]` | Primary Text (sea-slate ink) |
| `--mediterranee` | `#0F4C5C` | `bg-[#0F4C5C]`, `text-[#0F4C5C]` | Primary Brand Accent: Links, Headings, Primary CTA |
| `--pin` | `#4A6B4D` | `text-[#4A6B4D]`, `bg-[#4A6B4D]` | Secondary Accent: Subtle tags, field notes |
| `--sable` | `#B8A98C` | `border-[#B8A98C]/40` | Muted hairlines, borders, subtle text |
| `--statut-vert` | `#2E7D46` | `text-[#2E7D46]`, `border-[#2E7D46]`| Access allowed (Authorized) |
| `--statut-orange`| `#C77419` | `text-[#C77419]`, `border-[#C77419]`| Caution / Restrictions |
| `--statut-rouge` | `#B3362B` | `text-[#B3362B]`, `border-[#B3362B]`| Restricted / Forbidden access |
| `--statut-inconnu`| `#6B7280` | `text-[#6B7280]`, `border-[#6B7280]`| Unverified status |

Status chips always pair color + icon + label — never color alone.

---

## 3. Typography Rules

- **Display / Headings (`font-serif` or `Bricolage Grotesque`):**
  - Used for: `h1`, `h2`, hero statement, place titles.
  - Style: Characterful, warm curves, used with extreme restraint (max 2 sizes on a page).
  - Class: `font-serif text-[#1C2B33] leading-[1.15]`
- **Body (`font-sans` or `Public Sans`):**
  - Used for: Paragraphs, descriptions, reading content.
  - Style: Max reading width `max-w-[65ch]`, `leading-[1.6]`, `text-[#1C2B33]`.
- **Logbook / Data (`font-mono` or `IBM Plex Mono`):**
  - Used ONLY for: Status values, datelines, timestamps, source attributions.
  - Class: `font-mono text-xs uppercase tracking-wider text-[#1C2B33]/80`.

Scale (rem): 3.0 / 2.0 hero-display · 1.5 h2 · 1.125 body-lg · 1.0 body · 0.875 meta-mono. Line-height 1.6 body, 1.15 display. Max prose width 65ch.

---

## 4. Component Architecture & Page Layout

### Layout & Spacing
- Single column, generous whitespace, max content width 720px for reading, 1040px for index grid.
- Radius 10px on cards, shadows near-zero (1px borders in `--sable` at 40% opacity: `border border-[#B8A98C]/40`). 
- No hairline-broadsheet grid, no dark mode (MVP).

---

### Landing Page Component Specifications

#### A. Hero Section
- **Headline (`h1`):** "Le guide local qui vous dit où aller. Et où ne pas aller." (`text-3xl md:text-5xl font-serif text-[#1C2B33] mb-4 tracking-tight`)
- **Subtitle:** "Sorties nature entre Marseille et Bandol..." (`text-base md:text-lg text-[#1C2B33]/80 mb-8 max-w-[60ch] leading-relaxed`)
- **Primary CTA Button:** The **ONLY** filled button on any page. 
  - Full-width on mobile (`w-full sm:w-auto`).
  - Background `--mediterranee` (`bg-[#0F4C5C] text-white hover:bg-[#0F4C5C]/90 rounded-[10px] px-6 py-3.5 flex items-center justify-center gap-2 font-medium transition-colors`).
  - Includes a WhatsApp icon.
- **Secondary Link:** "Voir les lieux couverts" (`text-[#0F4C5C] underline underline-offset-4 font-medium hover:opacity-80 transition-opacity`).

#### B. The Signature Component: "Le Relevé du Jour" (Status Block)
A bordered panel at the top of place pages or trust sections, visually distinct from all other cards: `--calcaire-deep` ground, 2px left rule in current status color, content in logbook register:

- Ground: `bg-[#F1EBDE]`
- Border: `border-l-2 border-l-[#2E7D46] border-y border-r border-[#B8A98C]/40 rounded-[10px] p-4`
- Status Line: `font-mono text-xs text-[#2E7D46] font-bold` -> "● VERT — Accès autorisé"
- Meaning Line: `font-sans text-sm text-[#1C2B33]` -> "Ouvert 8h–17h · plage principale uniquement · parking réduit"
- Meta Dateline: `font-mono text-[11px] text-[#1C2B33]/60 border-t border-[#B8A98C]/30 pt-2 mt-2` -> "Vérifié le 21 juil. 18h12 · Préfecture du Var ↗"

*Unverified state:* Uses `--statut-inconnu`, dashed border, and text "Données non vérifiées aujourd'hui — consultez la carte officielle ↗". Honesty is part of the brand identity.

#### C. Value Proposition Section (3 Pillars)
Transform the claims from plain text into a structured grid (`grid grid-cols-1 md:grid-cols-3 gap-4`):
1. **Card Ground:** `--calcaire-deep` (`bg-[#F1EBDE] border border-[#B8A98C]/40 p-5 rounded-[10px]`).
2. **Tag Header:** Top element in each card must be a small uppercase `--pin` text tag (`text-[11px] font-mono font-semibold text-[#4A6B4D] tracking-wider mb-2 block`).
    - Pillar 1 Tag: `[ CENTRALISATION ]`
    - Pillar 2 Tag: `[ INDÉPENDANCE ]`
    - Pillar 3 Tag: `[ TERRAIN ]`
3. **Format:** Render claims as short standalone paragraphs with theme tags — no icon library soup.

#### D. How It Works ("Comment ça marche")
Present as a clean step list with `--mediterranee` colored numbers:
- Use `font-mono text-lg font-bold text-[#0F4C5C]` for step indicators (`01.`, `02.`, `03.`).
- Keep UI copy concise, plain, and actionable.

#### E. Founder / Local Trust Block
- **Card Ground:** `--calcaire-deep` (`bg-[#F1EBDE] border border-[#B8A98C]/40 rounded-[10px] p-6`).
- **Avatar / Logo:** Simple 48x48 circle in `--calcaire` (`bg-[#FAF7F0] border border-[#B8A98C]/40 flex items-center justify-center rounded-full`). If an image is present, strictly render a simple, realistic animal print silhouette.
- **Trust Indicators:** Render bullet points with small checkmarks using `--pin` (`#4A6B4D`).

---

## 5. Imagery & Motion

### Imagery
Our own photos only (field visits produce them). Natural light, no filters, no stock. If no photo exists yet, render a quiet `--calcaire-deep` panel with the place type label — never a placeholder stock image.

### Motion
Almost none: 150ms ease on hover/focus states, one subtle fade-in on the status value at load. `prefers-reduced-motion` disables both. No scroll animations.

---

## 6. Voice in UI Copy

- **Case:** Sentence case throughout.
- **Forbidden Terms:** The word **"IA"** or **"AI"** appears nowhere in the UI copy or landing text.
- **Tone:** Plain verbs, direct, honest local guide ("Évitez le dimanche 11h–13h", "Dites-nous si c'était juste", "On vous défend vous"). Errors and empty states are direct, never cute.

---

## 7. Quality Floor & Accessibility

- **Mobile-first:** Test at 375px.
- **Keyboard focus:** Visible keyboard focus (`--mediterranee` 2px ring).
- **Contrast:** AA contrast on all text (checked against `--calcaire`).
- **Colorblind support:** Status always readable via combination of icon + label + color (never color alone).
- **Performance:** LCP < 2.5s.
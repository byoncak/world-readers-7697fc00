# Detritivores — Design System

_Reference: derived from the Home page (`src/pages/Index.tsx`) and its widgets._

## 1. Brand & Tone

- **Name:** Detritivores (book club). Mascot: 🪱. Currency: 🍎.
- **Aesthetic:** Cozy-game / Animal Crossing — warm, soft, tactile. Like flipping through a worn paperback in a sunlit nook.
- **Voice:** Simple, punchy, natural. No flowery or "AI" language. Emoji used sparingly for warmth (✨📚🎉👏).
- **Feel:** Generous whitespace, rounded everything, gentle shadows, subtle motion. Never sharp, never corporate.

## 2. Color Palette

All colors are HSL tokens defined in `src/index.css`. **Never hardcode** — always use semantic tokens via Tailwind classes.

### Light (default)
| Token | HSL | Role |
|---|---|---|
| `--background` | `35 33% 95%` | Warm cream page bg |
| `--foreground` | `25 30% 18%` | Deep warm brown text |
| `--card` | `35 40% 97%` | Slightly lighter cream |
| `--primary` / `--terracotta` | `15 55% 55%` | Terracotta — CTAs, accents, headings highlights |
| `--secondary` / `--sage` | `145 25% 82%` | Muted sage — success, completion |
| `--accent` / `--lavender` | `270 30% 85%` | Soft lavender — tertiary highlights |
| `--peach` | `20 80% 88%` | Warm peach — soft surfaces, post-its |
| `--soft-gold` | `40 60% 70%` | Gold — celebration, "complete!" states |
| `--muted` | `35 25% 90%` | Quiet surfaces, hover states |
| `--border` | `30 20% 85%` | Hairline dividers |

### Themes
Event-driven (decoupled from OS): `.dark`, `.theme-fireside`, `.theme-moonlit`, `.theme-candlelit`, `.theme-midnight-library` (ink + brass), `.theme-deep-forest` (pine + lantern amber), `.theme-velvet-dusk` (plum + dusty rose). All themes preserve the same token names — components never need theme-specific code. Shop previews come from `src/components/shop/themePreviews.ts` (must stay in sync with `index.css` token blocks and `useEquippedTheme.ts`).

## 3. Typography

Loaded via Google Fonts in `index.css`:

| Variable | Family | Use |
|---|---|---|
| `--font-display` | **Playfair Display** | Headings (h1–h3). Always `font-style: normal` — never italic. |
| `--font-body` | **DM Sans** | Body, UI, buttons, labels |
| `--font-serif` | **Libre Baskerville** | Subtitles, book-spine labels, accent serif moments |

Tailwind classes: `font-display`, `font-body`, `font-serif`.

**Rules**
- Headings always non-italic (explicit `not-italic` / `style={{ fontStyle: 'normal' }}` where needed).
- Book/title hero: `font-display text-2xl md:text-4xl font-bold`.
- Author/secondary: `font-body text-xs text-muted-foreground/70`.

## 4. Layout

- **Container:** `mx-auto max-w-3xl px-4 py-6` — single readable column.
- **Vertical rhythm:** widgets separated by `space-y-12`. Generous, never cramped.
- **Mobile bottom-nav offset:** `pb-20 sm:pb-6` (Dock nav lives at the bottom on mobile).
- **Shell:** `h-[100dvh]` + `overflow-hidden` outer, `.safe-top`, `.mobile-nav-offset` for safe areas.

## 5. Component Primitives

Defined in `@layer components` in `index.css`:

- **`.cozy-card`** — `rounded-2xl border bg-card p-5 shadow-md`, hover lifts `-2px` with warmer shadow. The hero container.
- **`.cozy-title`** — Playfair, 3xl, bold.
- **`.cozy-subtitle`** — Libre Baskerville, lg, muted.
- **`.cozy-badge`** — pill (`rounded-full px-3 py-1 text-xs font-semibold`). Variants: `-peach`, `-sage`, `-lavender`.
- **`.cozy-input`** — `rounded-xl` cream input with terracotta focus ring.
- **`.cozy-btn-primary`** — terracotta pill, lifts `-1px` on hover. Use for the single primary action per widget.
- **`.cozy-btn-ghost`** — transparent, muted hover.
- **`.progress-bar-watercolor`** — 3px rounded bar, sage→secondary gradient fill, 700ms ease-out. Themed variants (rose, ocean, sunset, forest, galaxy, miami…) unlocked via shop.
- **`.post-it`**, **`.speech-bubble`**, **`.book-spine`** — niche cozy primitives.

## 6. Radius, Shadow, Motion

- **Radius:** base `--radius: 1rem`. Cards `rounded-2xl`, inputs/buttons `rounded-xl`, badges `rounded-full`. Avoid sharp corners.
- **Shadow:** soft, warm-tinted (`hsl(var(--warm-brown) / 0.1)`). Lift on hover, never harsh drop shadows.
- **Motion:** `transition-all duration-200–300`. Signature animations:
  - `animate-gentle-bounce` — idle empty-state icons.
  - `animate-cheer-pulse` — "Cheer them on!" prompt.
  - `animate-float`, `animate-wiggle` — playful accents.
  - `animate-fade-in` — tab-content switch. `animate-page-in` — route change (keyed Outlet in `AuthLayout`).
  - `animate-card-in` / `animate-tile-in` — staggered grid entrances (delay via inline `--stagger`).
  - `animate-achievement-pop` + `animate-achievement-halo` — freshly unlocked achievements (tracked in `localStorage` `seenAchievements:{userId}`).
  - `.bar-celebrate` on `.progress-bar-watercolor` — one-shot sheen sweep + gold glow after saving progress.
  - `celebrate(x, y)` / `celebrateFromElement(el)` from `src/lib/celebrate.ts` — cozy confetti burst (purchases, achievements, finishing a book). Imperative, portal-layer, self-cleaning.
  - `whirl-book` — branded loading state (terracotta pages flipping). Use the `.book` markup, not generic spinners.
  - `gold-glow` — pulsing text-shadow for top-tier name styling.
- **Reduced motion:** all decorative animation (confetti, staggers, pops, sheens, sparkles, dark-magic frame) respects `prefers-reduced-motion`.

## 7. Home Page Composition (`src/pages/Index.tsx`)

Order top → bottom, each separated by `space-y-12`:

1. **`CurrentBookWidget`** — hero `.cozy-card`. Cover (h-72 w-52 mobile, h-64 w-44 md+), Playfair title, tiny author line, optional meeting date row, your-progress slider + page input + Save, then a member leaderboard with watercolor bars. Completed readers float to top with `ring-soft-gold` glow + Trophy. ≤3 days to meeting unlocks the pulsing "👏 Cheer them on! 👏" CTA.
2. **`NextMeetupWidget`** — quieter section: `rounded-2xl` with `border-border/60 bg-muted/20`. Inside 5 days: switches to `border-2 border-terracotta/60 bg-terracotta/10`. Collapsible mini-calendar; meetup day shows a Coffee icon on a primary-filled cell.
3. **`BookWishlistWidget`** (lazy) — terracotta `+` FAB, heart-vote column, scrollable list with `[mask-image:linear-gradient(...)]` fade. One suggestion per cycle per user.
4. **`ReadingJourneyWidget`** (lazy) — archive of past reads.

Lazy widgets fall back to the branded `.book` whirl loader, never a spinner.

## 8. Patterns & Rules

- **Confirmations:** custom `ConfirmDialog` — never `window.confirm`.
- **Mentions:** `@[Name](userId)` everywhere; rendered by `<MentionText>`.
- **Names:** always render through `<StyledName>` so cosmetics (frames, gold pulse) apply.
- **Icons:** Lucide, `h-4 w-4` inline with text, terracotta tint for active/branded, muted-foreground otherwise.
- **Empty states:** centered, soft-gold icon + Playfair title + Libre Baskerville subtitle. Warm and inviting, never apologetic.
- **Celebration UI:** soft-gold ring + Trophy + "Done!" / "Complete! 🎉". 100% completers sort to the top of leaderboards.
- **Global animations** (points, cheers, rewards): rendered via React Portals at `z-index: 99999` so they escape any clip.
- **Performance:** Canvas 2D / CSS for high-instance cosmetics (avatar frames). Avoid WebGL shaders.

## 9. Don'ts

- ❌ Hardcoded hex colors in components.
- ❌ Italic headings.
- ❌ Sharp corners or hard black shadows.
- ❌ Generic spinners (use `.book` whirl).
- ❌ Flowery copy ("Embark on your literary journey…"). Keep it short and human.
- ❌ `window.confirm` / `alert`.
- ❌ Mixing OS dark mode with event themes — themes are explicit, not preference-driven.

## 10. Lounge Page (`/lounge` → `src/pages/Community.tsx`)

The social hub. Three tabs share a single underline indicator.

### Shell
- `mx-auto flex h-full max-w-5xl flex-col overflow-hidden px-4 pt-1 sm:py-6` — fills viewport so inner panels can scroll independently.
- Tab content area: `min-h-0 flex-1 overflow-y-auto overflow-x-hidden animate-fade-in pb-2`, keyed on `tab` so each switch fades in.

### Tab bar pattern (shared with Reflect)
- Row of equal-width buttons under a `border-b border-border/50`.
- Active: `font-semibold text-foreground`. Inactive: `font-medium text-muted-foreground hover:text-foreground`.
- Animated indicator: absolutely-positioned `h-0.5 rounded-full bg-primary` that slides via `transition-all duration-300 ease-out`, position computed from the active button's `offsetLeft`/`offsetWidth`.
- Labels: short, sentence-case, single word when possible (`Discuss`, `Vote`, `Members`).

### Tabs
1. **Discuss** (`DiscussionWidget`) — full-bleed flex column (`flex h-full min-h-0 flex-col overflow-hidden`). Threaded chat-style discussion for the current book.
2. **Vote** (`PollWidget`) — stacked poll cards: `rounded-xl border border-border bg-card p-4 space-y-3`. Question in **Libre Baskerville** (`font-serif`). Options are buttons with a terracotta-tinted progress fill (`bg-terracotta/10` overlay), terracotta radio dot when selected, percentage on the right after voting. Empty state: centered single line, no card.
3. **Members** — stacks three cards with `space-y-4 pt-2`:
   - **My Messages** entry — full-width `.cozy-card` link to `/inbox` with a primary `Mail` icon, `cozy-title text-2xl`, and "Open inbox →" hint.
   - **`MembersPanel`** — `.cozy-card` + `.cozy-title text-2xl` "Members".
   - **`ActivityFeed`** — `.cozy-card` + `.cozy-title text-2xl` "Recent Activity".

### Rules
- Only the Members tab uses `.cozy-card` containers; Discuss/Vote render edge-to-edge inside the tab area for breathing room.
- Empty states stay one short line + an emoji (📊, etc.) — never a full empty-state card.

## 11. Reflect Page (`/journal` → `src/pages/Journal.tsx`)

Personal reading journal. Same tab-bar pattern as Lounge, no `overflow-hidden` shell (page scrolls naturally).

### Shell
- `mx-auto max-w-5xl px-4 pt-1 pb-6 sm:py-6` — narrower vertical rhythm than Lounge since cards manage their own scroll.
- Tab labels: `Quotes`, `Ratings`, `Notes`.

### Shared sub-patterns
- **Book selector chip row** (Quotes + Ratings): `flex gap-2 overflow-x-auto pb-1`. Chips are `rounded-lg px-3 py-1.5 text-xs font-semibold font-body`. Active = `bg-primary text-primary-foreground`, inactive = `bg-muted text-muted-foreground hover:text-foreground`. Titles run through `shortenTitle()`.
- **Composer card**: `rounded-lg border border-border/50 bg-card p-3`. Borderless inline `Textarea` (no ring, transparent bg, italic for quotes). Footer row separated by `border-t border-border/30`. Submit is a ghost terracotta button (`text-primary hover:bg-primary/10`) — never a filled CTA inside the composer.

### Quotes tab (`QuoteWall`)
- 4-step compact composer (Quote → Spoiler? → Page → Character) — only one field visible at a time, with "Step N of 4" label and a `Back` link. Composer only appears for the **current** book; archive books are read-only.
- Quote card: `rounded-xl border border-border/60 bg-card overflow-hidden`. Decorative `Quote` lucide icon at 6% opacity in the top-right corner, plus a thin `bg-primary/30` vertical rule next to the quote text. Body in `text-sm italic font-body leading-relaxed`.
- **Spoilers**: hidden by default if `myProgress < page_number`. Reveal flow uses a Popover with two buttons (`Nevermind` / `Reveal`) — never reveals on first tap.
- Attribution row: `UserAvatar` + `StyledName` + page/character/time meta in `text-[10px] text-muted-foreground`.

### Ratings tab (`RatingsReviews`)
- Star control: 5 × `Star` icons, `h-4 w-4`. Filled = `fill-amber-400 text-amber-400`; empty = `text-muted-foreground/30`. Hover scales 110%.
- Average row: stars + bold average + `(N reviews)` muted count, no card.
- "My rating" uses shadcn `Card` with a collapsed read-only state and a `Pencil` "Edit" toggle.
- Reviews list: `Card` per review, avatar + StyledName + stars on one row, review body underneath in `text-foreground/80`.

### Notes tab (`PersonalNotes`)
- Privacy hint at the top: `Lock` icon (50% muted) + "Private to you · {book title}" in `text-[11px]`.
- Composer mirrors Quotes (borderless textarea + small page input + ghost "+ Add" button).
- **Notes grid**: `grid grid-cols-2 gap-2`. Each note is a soft post-it: `rounded-md bg-accent/40 border border-border/20 p-3 shadow-sm`, min-height 80px. Body in `text-xs text-foreground/85`. Page + relative time in tiny muted meta. Trash icon appears on hover only.
- Empty states centered in remaining space, single muted line — no illustration.

### Reflect-specific rules
- Composer submits are always ghost + terracotta (never filled) so the page stays calm.
- Spoiler-gated content respects per-user reading progress; archive books are treated as fully-read.
- All time stamps use `formatDistanceToNow(..., { addSuffix: true })` — never absolute dates inline.
- Notes are RLS-secured and **never** appear in any feed or other user's view.

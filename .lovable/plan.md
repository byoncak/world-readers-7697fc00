
# World Readers — UX & Accessibility Audit

Read-only pass across `src/pages/*`, `src/components/*`, `src/hooks/*`. Findings cite specific files. No code changed.

## Journey-by-journey findings

### 1. Sign in / sign up / recovery — `src/pages/Auth.tsx`, `src/hooks/useAuth.tsx`
- Login uses a synthetic `name → name.replace(/\s+/g,'.')@bookclub.local` email. Trivial typos ("brett" vs "Brett S") silently create/hit different accounts. No hint of the normalization; error is only "Invalid name or password".
- Password rule is `minLength={6}` and nothing else. No confirm-password on sign-up, no show/hide toggle, no strength meter.
- Sign-up errors surface `error.message` raw (technical wording); sign-in errors are always the same string even for network failures.
- Recovery is admin-mediated (`request-password-reset` edge function). This is fine but the copy ("An admin will reset your password soon") gives no ETA, no cancel path, and no way to change your mind after submit.
- Loading uses `<div className="loader"/>` — a class not used elsewhere; the rest of the app uses the `.book` spinner. Inconsistent brand.
- Success/error banners rely on color-only differentiation (no leading icon), and mode toggles ("Sign in ↔ Create account ↔ Forgot") aren't announced (no `aria-live` region), so screen-reader users don't hear form context change.
- No first-run onboarding after sign-up: new users land on `/` → `HomeRedirect` with no club, no prompt to set display name/avatar or discover clubs.

### 2. Header & navigation — `src/components/AppHeader.tsx`, `src/components/MobileBottomNav.tsx`, `src/App.tsx`
- Header title dropdown trigger has no `aria-label`; worm icon uses `alt="Worm"` (should be `alt=""` — decorative next to the title text).
- Mobile bottom nav is 4 items (Home, Activity, Journal, Lounge). Shop, Inbox, and Notes are only reachable through Home shortcuts or the Lounge sub-tab — Shop in particular is a first-class currency loop yet buried.
- Bottom-nav active state is color-only (`text-primary`) with no shape/underline; labels are `text-[10px]` — below comfortable minimum.
- The Home tile has an oversized custom "chip" (`h-10 w-14`, `h-7 w-7` icon) that visually competes with the header — it reads as a badge rather than a nav item.
- Header on mobile stacks Points, NotificationBell, Admin, and Avatar; on very long club names the title truncates hard against the chevron with no room to breathe.

### 3. Dashboard hierarchy — `src/pages/Index.tsx`
- The three round shortcuts (Shop / Notes / Messages) are icon-only with `title` (invisible on touch) and different destinations mixed together: top-level `/shop`, a sub-tab `/journal?tab=notes`, and a sub-tab of a *different* section `/lounge?tab=messages`. **Notes duplicates the Journal bottom-nav tab and Messages duplicates both `/inbox` and the Lounge Messages tab** — three routes to one feature.
- `showLivePoll` query fetches `polls` where `active=true` **with no `club_id` filter** — a cross-club leak that pings the Home indicator for polls belonging to other clubs.
- Loading fallback uses `<div className="book">` while other widgets use `LoadingBlock`, `Sparkles + text`, or nothing — no consistent skeleton language.

### 4. Current book & reading progress — `src/components/CurrentBookWidget.tsx`
- The progress control is a **triple**: slider, editable numeric pill, and Save button. Dragging the slider does not save; you must remember to press Save. On 320–375px this row overflows visually or wraps awkwardly.
- Meeting date only renders inside the hero when it is 0–5 days out, so most of the time the *hero* silently omits the date and the answer moves to `NextMeetupWidget` below — surprising.
- Member progress rows use `w-24 truncate` on names + `text-xs` `text-muted-foreground` → most display names ellipsize even at desktop widths, harming social readability.
- Fallback `'Reader'` still appears briefly when profiles haven't hydrated for members.
- PDF affordance is a `px-2.5 py-1` badge overlaid on the cover — small tap target and easy to miss.

### 5. Proposing / voting on books — `src/components/BookWishlistWidget.tsx`
- Vocabulary drift: the UI says "Wishlist", the table is `book_votes`, the row copy says "suggestions", and "vote" is expressed with a `Heart` icon — the same icon used elsewhere for "cheer on".
- Adding a book, up-voting, and threaded commenting are all crammed into one card, so the primary action ("What should we read next?") isn't obviously call-to-action.
- Google Books autocomplete list isn't a proper combobox (no `role="combobox"` / `aria-activedescendant`), so keyboard users can't arrow through results.
- One-suggestion-per-cycle rule is enforced client-side (`userAlreadySuggested`) — the button silently disappears with no explanation of *why*.

### 6. Discussions & replies — `src/components/DiscussionWidget.tsx`, `src/pages/Community.tsx`
- Timestamp uses `text-[10px] text-muted-foreground/50` on cream — WCAG contrast fail.
- Replies flatten via `flattenReplies` into a single visual stream with only a "replied to X" line — deep threads lose hierarchy.
- Community tabs (Discuss / Messages) and Journal tabs (Quotes / Ratings / Notes) are hand-rolled `<button>` rows without `role="tablist"` / `role="tab"` / arrow-key navigation.

### 7. Messages / Inbox — `src/components/inbox/InboxView.tsx`, `src/pages/Inbox.tsx`, Community "Messages" tab
- **Three entry points to the same DM feature**: `/c/:id/inbox`, `/c/:id/lounge?tab=messages` (embedded), and the Home "Messages" shortcut (which points to the Lounge sub-tab, not the standalone Inbox). Behavior is subtly different (embedded vs full-page). This is the largest consolidation opportunity in the app.

### 8. Meetings — `NextMeetupWidget.tsx` + `MeetingRsvpHud.tsx` + `MeetingRsvpWidget.tsx`
- Meeting date can appear in up to four places on one screen: CurrentBook badge, NextMeetup card, RSVP HUD, and RSVP widget. Users see the same date/time repeated with slightly different framing.

### 9. Loading / error / empty consistency
- `StateBlock.tsx` (LoadingBlock/ErrorBlock/EmptyBlock) already exists but only ~half of widgets use it. CurrentBook, BookWishlist, Discussion, Inbox all roll their own.

### 10. Contrast, targets, focus
- Repeated `text-muted-foreground/50–/70` + `text-[10px|11px]` on cream backgrounds; likely below AA. Places: DiscussionWidget bubble metadata, Index shortcut labels (none visible), CurrentBookWidget "by author" line, ChatBubble usernames.
- Icon-only Home shortcuts, PDF badge on cover, and Home bottom-nav "chip" have no visible text — rely on aria-label.
- Custom tab strips lack keyboard tablist semantics.
- Avatar link in header has only `title="View profile"` — no `aria-label`.

## Prioritized improvement set (UI/UX only, cozy identity preserved)

### P0 — correctness & safety
1. **Scope the Home live-poll indicator to the current club** — add `.eq('club_id', clubId)` to `polls` and `poll_votes` queries in `src/pages/Index.tsx`.
2. **Fix Auth loader** to use the shared `.book` spinner (or `LoadingBlock`) for brand consistency.
3. **Header/worm alt fix**: `alt=""` on the decorative worm, real `aria-label` on the club-switcher trigger and avatar link.

### P1 — consolidate redundancy
4. **Unify DM surface**: pick one canonical route (recommend `/c/:id/inbox`), remove the Lounge "Messages" tab OR remove the standalone Inbox page, and repoint the Home "Messages" shortcut to the survivor. `src/pages/Community.tsx`, `src/pages/Inbox.tsx`, `src/pages/Index.tsx`, `src/components/AppHeader.tsx`.
5. **Rework Home shortcuts row**: drop the Notes shortcut (duplicates Journal bottom-nav) and replace with **Shop** as a labeled tile (icon + visible "Shop" text), since Shop is otherwise buried. Keep the shortcuts row to 2 labeled tiles + the live-poll pill.
6. **Reading progress control**: slider + numeric editor + Save is one control too many. Options: (a) slider auto-saves on `onValueCommit` with a "Saved ✓" toast, keep the numeric pill as a tap-to-type shortcut, drop the standalone Save button; or (b) hide the slider and keep the numeric editor + Save. Pick (a) for cozy immediacy.
7. **De-duplicate the meeting date**: keep the CurrentBook hero *always* showing meeting date (drop the 0–5 day gate), and make NextMeetup a lightweight countdown/calendar aside instead of a second full card.

### P2 — hierarchy & clarity
8. **Rename "Wishlist" surface to "Next book" (proposal + vote)** in copy; replace `Heart` vote icon with a distinct icon (e.g. `ThumbsUp` or `Bookmark`) to disambiguate from Cheers; add an inline hint when the "Suggest" button is hidden ("You already suggested this cycle").
9. **Bottom nav polish**: add a subtle active-state dot/underline instead of color-only, bump labels to `text-[11px]`, and reduce the Home "chip" back to icon parity with siblings.
10. **Widget state consistency**: route CurrentBook / BookWishlist / Discussion / Inbox loading & error paths through `StateBlock` (LoadingBlock / ErrorBlock / EmptyBlock).

### P3 — accessibility polish
11. **Contrast pass**: raise timestamp/metadata text from `/50 /60 /70` opacities to solid `text-muted-foreground` and from `text-[10px]/[11px]` to `text-xs`. Files: DiscussionWidget ChatBubble, CurrentBookWidget author line, Index shortcuts, MobileBottomNav labels.
12. **Tablist semantics**: wrap Community and Journal tab strips in `role="tablist"` with `role="tab"`, `aria-selected`, and Left/Right arrow navigation (extract a small `<Tabs>` primitive or use shadcn's).
13. **Book autocomplete combobox**: apply `role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant` on the search input in BookWishlistWidget.
14. **Auth ergonomics**: add password show/hide toggle, confirm-password on sign-up, an inline hint under Name explaining that names are unique per club, and pipe sign-in failures through a friendlier error mapper. Add an `aria-live="polite"` region for mode/success/error announcements.
15. **First-run onboarding**: after sign-up with no club membership, land on `/clubs` with a 1-screen prompt: "Set your display name + avatar → discover or create a club."

## Verification checklist (post-implementation)
- 320 / 375 / 390 / 430 / desktop: no horizontal overflow on Home, CurrentBook row, Community/Journal tabs, Inbox message row.
- Keyboard: Tab reaches every actionable control in Auth, Home shortcuts, Header dropdown, Community/Journal tabs, DM composer, book autocomplete; arrow keys traverse tablists and combobox options; visible focus ring on all.
- Screen reader: header trigger, avatar link, worm icon, Home shortcut tiles, live-poll pill, and reading-progress Save state read as intended; Auth mode changes announce.
- Contrast: run automated (axe/pa11y) on Home, Community/Discuss, Journal, Inbox, CurrentBook; every text ≥ AA (4.5:1) on cream and dark themes.
- Cross-club isolation: switch clubs; confirm Home poll indicator, CurrentBook, NextMeetup, BookWishlist, DM inbox all refetch and never show a foreign club's data.
- Redundancy removed: exactly one DM route, exactly one Journal→Notes entry, exactly one meeting-date "source of truth" in the hero.
- Full test suite green; add tests for club-scoped poll indicator, unified DM route redirect, auto-save reading progress semantics, and tablist keyboard navigation.
- Manual: reading-progress auto-save fires on release only (not on every drag tick), Saved ✓ badge appears, undo path (drag back) still saves.
- Not published.

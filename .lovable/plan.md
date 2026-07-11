
# All Clubs redesign

Focus: `/clubs` and the immediately adjacent club-navigation surfaces (header switcher, HomeRedirect, invite entry). No auth, DB, RLS, MCP, shop, or unrelated route changes.

## 1. Current problems (from code audit)

- **Three tabs of unequal weight.** `Clubs.tsx` renders `My Clubs / Discover / Create` as peer tabs. "Create" is a whole tab containing a single button that opens a modal — wasted space, cognitive tax.
- **Discover is a wall.** Community totals card, all public clubs, and popular books stack vertically with no filter, search, sort, or empty-state art. Same visual weight as "your" clubs.
- **Duplicated actions.** "All clubs" + club switcher + "Manage" all live in the AppHeader dropdown; on `/clubs` the same set is repeated inline. Users don't know which is canonical.
- **Broken invite flow.** `ClubManage.createInvite` produces `origin/clubs?invite=CODE`, but `Clubs.tsx` never reads `?invite=` — the link lands on a normal browse page and silently no-ops. `club_invites` table is queried by admins but never consumed.
- **Weak state handling.** `memberships.length === 0` shows one line of grey text. No onboarding art, no "browse public clubs" CTA, no pending-request state, no rejected/full feedback beyond a toast.
- **Cards fight for attention.** Every card uses the same padding, same border, same font weight. "My Clubs" tiles look identical to public discovery tiles, so the current membership doesn't feel like home.
- **Mobile issues.** Long club names truncate mid-word next to lock/globe icons; join button and metadata compete for the same row; the bottom Dock nav is hidden on `/clubs` (correctly — no active club) but nothing tells the user why the nav disappeared.
- **No search or filter** across public clubs, and no way to sort "your clubs" once a user has more than a handful.
- **Confusing header title.** On `/clubs` the header shows "Your clubs" with a chevron, but the dropdown itself already links to "All clubs" — recursive.
- **HomeRedirect UX.** Users land straight in their last club with no way back to a lightweight "clubs home"; combined with the busy /clubs page this makes the hub feel like a settings screen rather than a home.

## 2. Information architecture

Reframe `/clubs` as **"Clubs Home"** — the calm lobby users pass through, not a settings dashboard.

Primary sections, in order:

1. **Your clubs** — always first, richer tiles, sorted by recent activity. Includes a "pinned/last visited" affordance.
2. **Pending** — join requests you've sent (currently invisible). Small, only when non-empty.
3. **Discover** — collapsed by default into a single "Find a club" panel with search + filters; expands inline. Not a tab.
4. **Start something new** — single ghost tile at end of "Your clubs" grid: "+ Create a club". No dedicated tab.
5. **Redeem invite** — subtle link ("Have an invite code?") that opens a small dialog and calls a new client-side handler for `?invite=CODE` (URL param already produced by ClubManage).

Community totals + popular books move to a lightweight footer strip — ambient, not the headline.

Header switcher stays but becomes the canonical "switch active club" surface; `/clubs` page removes its own switcher chrome.

## 3. Responsive layout

Desktop (≥ md):

```text
┌───────────────────────────────────────────────────────────┐
│  Clubs                                    [+ New club]    │
│  A quiet place to keep your reading crews.                │
├───────────────────────────────────────────────────────────┤
│  YOUR CLUBS                                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ Club A │ │ Club B │ │ Club C │ │  + New │              │
│  │ cover  │ │ cover  │ │ cover  │ │  club  │              │
│  │ 12 mem │ │ 8 mem  │ │ 4 mem  │ │        │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                           │
│  ─ Pending (1) ─────────────────────────────── ▾          │
│                                                           │
│  ─ Find a club ────────────────────────────────           │
│  [🔍 Search public clubs        ]   [any size ▾] [sort ▾] │
│  ┌────────────────────────────┐ ┌────────────────────────┐│
│  │ Public club card (compact) │ │ Public club card       ││
│  └────────────────────────────┘ └────────────────────────┘│
│                                                           │
│  ─ Community pulse ─── 12k pages · 340 books · 45 clubs ─ │
│  Popular books row (horizontal scroll, small)             │
│                                                           │
│  Have an invite code? · Return to <last club>             │
└───────────────────────────────────────────────────────────┘
```

Mobile:

- Single column, same order.
- "Your clubs" as a vertical stack of larger tiles (cover image, name, role chip, member count, small "Open" chevron; whole tile is the link).
- Discover collapsed behind a section header with count badge; expand shows sticky search input.
- Community pulse becomes a single compact strip.
- Sticky bottom-safe CTA: "+ Create a club" fab (only when scrolled), so the primary action stays reachable without competing with tiles.

## 4. Interaction details

- **Enter a club:** entire "Your clubs" tile is a link to `/c/:id`. No secondary "Open" button (removes the duplicate action in the current design).
- **Switch active club:** AppHeader chevron dropdown remains canonical; on `/clubs` we hide the "All clubs" item because we're already there, and rename the header title to just "Clubs" (no chevron chip) when on this route.
- **Create:** top-right `+ New club` button and end-of-grid ghost tile both open the existing `CreateClubDialog` unchanged. The old "Create" tab and its wrapper Card are removed.
- **Join public:** existing `handleJoin` preserved. Button label becomes `Join` / `Request to join` / `Full` / `Joined → Open`. Toasts unchanged.
- **Invite redemption:** `Clubs.tsx` reads `?invite=` on mount; if present, look up `club_invites` by code (existing table, existing RLS), then insert into `club_members` and navigate to `/c/:id`, or show a friendly error if code is revoked/expired. Also expose a "Redeem invite code" dialog for manually pasted codes. No schema/RLS change — uses existing tables the admin flow already populates.
- **Pending requests:** query `club_join_requests` for `user_id = me AND status = 'pending'`, show as a small row with `Cancel request` (delete own row) — RLS permits owner delete/select already; if not accessible, degrade gracefully to hiding the section.
- **Sort & filter (Discover):** client-side: search by name/description, filter by size (`any / <10 / <50 / open now`), sort by newest / members. No new endpoints.
- **Empty states:** first-time user sees an illustrated card ("You're not in any clubs yet") with two buttons: `Browse public clubs` (scrolls to Discover) and `Create a club`.
- **Return-to-club:** subtle footer link "Back to <lastClubId name>" when `lastClubId` resolves to a current membership — reduces feeling of dead-end.

## 5. Visual direction (cozy, calmer)

- Reuse existing tokens (cream/peach/sage/terracotta, Playfair headings, DM Sans body, warm-brown shadows). No new palette.
- **Your clubs tiles**: card with cover image band on top (or accent-color gradient if no cover), name in Playfair, role/owner chip (sage for member, terracotta for owner/admin), small "12 members · reading X" line in Libre Baskerville italic. Larger hover lift than public cards → clear hierarchy.
- **Public tiles**: flat, muted-border, no shadow. Compact.
- **Section headers**: small caps DM Sans, hairline divider, chevron for collapsible sections. Preserves the "editorial almanac" feel from the rest of the app.
- **Community pulse strip**: single-row inline stats in muted foreground, no big number tiles.
- Use existing `animate-page-in` for entry; add subtle 60ms stagger on Your Clubs tiles only.

## 6. Accessibility & states

- Every tile: link with accessible name = club name + role + membership count via `aria-label`.
- Collapsible sections use `<button aria-expanded>` + `role="region"`.
- Focus order: heading → primary CTA → Your Clubs → Pending → Discover controls → Discover results → footer.
- Touch targets ≥ 44px; the mobile fab uses `safe-bottom` and doesn't overlap the (hidden) Dock nav.
- Loading: skeleton tiles for Your Clubs and Discover instead of blank flash.
- Errors: inline destructive text within each section, never a global banner.
- Respects `prefers-reduced-motion` (no stagger when set).
- Invite dialog: labeled input, autofocus, submit on Enter, clear success/failure messaging.

## 7. Files likely to change

- `src/pages/Clubs.tsx` — main rewrite: remove Tabs, split into `YourClubsSection`, `PendingSection`, `DiscoverSection`, `CommunityPulseStrip`, `InviteRedeemer`. Keep `CreateClubDialog` inside the file (or extract to `src/components/clubs/CreateClubDialog.tsx` — small win).
- `src/components/AppHeader.tsx` — hide "All clubs" item when already on `/clubs`; conditionally suppress the chevron/title switcher chrome on `/clubs` (title becomes plain "Clubs"). Minor.
- `src/components/HomeRedirect.tsx` — unchanged behavior, but add a check for `?invite=` and forward it to `/clubs?invite=` before choosing lastClub.
- New: `src/components/clubs/YourClubCard.tsx`, `PublicClubCard.tsx`, `InviteRedeemDialog.tsx`, `CommunityPulseStrip.tsx` (small, focused, reused by mobile/desktop).
- `src/index.css` — one or two utility classes for the club tile cover gradient (only if not expressible in Tailwind).
- No changes to routes, `ClubContext`, `ClubGate`, `MobileBottomNav`, `useRole`, or any DB/RLS/RPC.

## 8. Risks & validation

Risks:

- Invite redemption depends on existing `club_invites` and `club_members` RLS allowing an authenticated user to (a) select their invite row by code and (b) insert their own membership. If RLS is stricter than expected, the feature degrades to "code accepted, ask an admin" rather than blocking the page. No schema change either way.
- Pending join-request query may be restricted by RLS to admins; if so, hide the section gracefully.
- Header switcher change must not regress non-`/clubs` routes — guard purely on `useLocation().pathname === '/clubs'`.
- Any perceived-performance regression: tiles use existing queries, no new N+1s; member counts already fetched once.

Validation:

- `tsgo --noEmit`, `bun run build`, `vitest run` (54 tests) all clean.
- Playwright smoke at 1280×1800 and 390×844:
  - `/clubs` signed-in with ≥1 club → Your Clubs visible, Discover collapsible, Create dialog opens, header switcher unchanged.
  - `/clubs?invite=<known-code>` → redeemed, navigated to `/c/:id`; bad code → inline error.
  - Signed-in with 0 clubs → empty state with two CTAs.
  - Public club Join / Request / Full states render correctly.
  - Keyboard tab order verified; screen-reader labels inspected via ARIA snapshot.
- Manual visual pass against cozy palette in light theme.

Deliverable is `/clubs` transformed into a calm, single-scroll home for club navigation, with the broken invite flow finally wired up.

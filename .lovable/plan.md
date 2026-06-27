
# Multi-Club Platform Plan

Transform the app from a single-club experience ("Detritivores") into a platform where anyone can sign up, browse public clubs, join with approval rules set by the admin, or create their own private/public club with a member cap.

---

## 1. Signup & onboarding

- Keep open email/password signup as today. No invite required.
- After first login, land on a new **Clubs** page instead of the current dashboard:
  - Tabs: **My Clubs** · **Discover** (public clubs) · **Create**
  - Empty state nudges the user to either join a featured club (Detritivores) or create their own.
- A user must have an **active club** selected to see club-scoped pages (Dashboard, Community, Shop, Inbox stay the same, but scoped to that club).
- Add a club switcher in the header (replaces current static branding when inside a club).

## 2. Clubs: data model

New tables (per-club isolation, RLS via membership):

- `clubs` — name, description, cover image, accent color, `visibility` ('public' | 'private'), `member_cap` (nullable), `join_policy` ('instant' | 'approval'), `owner_id`.
- `club_members` — (club_id, user_id, role: 'owner' | 'admin' | 'member', joined_at). Unique on (club_id, user_id).
- `club_join_requests` — pending requests for approval-required public clubs.
- `club_invites` — shareable invite codes for private clubs (optional, simple version).

Every existing club-scoped table gets a `club_id` column (NOT NULL, FK to clubs):
- `books`, `discussions`, `discussion_reactions`, `meeting_rsvps`, `polls`, `poll_votes`, `book_votes`, `book_quotes`, `book_ratings`, `book_recommendations`, `suggestion_comments`, `vote_likes`, `cheers`, `direct_messages`, `messages`, `announcements`, `announcement_reads`, `activity_reactions`, `point_transactions`, `user_points`, `user_inventory`, `user_achievements`, `user_streaks`, `reading_progress`, `notifications`, `password_reset_requests`, `shop_items`, `app_settings`, `personal_notes` (stay user-private but tied to club context where relevant).

Stays global (unchanged): `profiles`, `user_roles` (app-level admin), `push_subscriptions`, `personal_books`, `personal_book_completions`.

## 3. Per-club vs global scope

**Per club (isolated):**
- Books, discussions, meetups, polls, suggestions, RSVPs, cheers, announcements
- Points, inventory, shop, achievements, streaks, leaderboards
- Notifications and DMs are scoped to the active club (you can only DM people you share the *current* club with)

**Global (everyone contributes):**
- A **Community Totals** widget on the Discover page: total pages read, total books finished, total members, total clubs across the whole app.
- **Global book popularity**: an aggregated view of most-rated / most-recommended books across all clubs (book title + author normalized), shown on Discover.
- User profile basics (display name, avatar, cosmetics) stay global.

## 4. Club admin controls

Owner/admin of a club can:
- Toggle **public / private**
- Set / change **member cap** (blocks new joins past the cap)
- Choose **join policy**: instant vs approval-required (public clubs only)
- Approve / decline pending join requests
- Edit club name, description, cover image, accent color
- Remove members, promote a member to admin
- Generate / revoke invite codes (for private clubs)

App-level admin role (existing `user_roles`) stays for platform moderation.

## 5. Joining flows

- **Public + instant**: click Join → membership row created if under cap.
- **Public + approval**: click Join → request row → admin approves → membership row.
- **Private**: only reachable via invite code/link → on accept, membership row created (still respects cap).

## 6. Migration of existing data

Single migration step, no data loss:
1. Create new tables.
2. Insert one club row: "Detritivores" (public, instant-join, owner = first existing admin).
3. Add `club_id` to all club-scoped tables, backfill every existing row with the Detritivores club id, then mark NOT NULL.
4. Insert a `club_members` row for every existing profile, role = 'member' (existing admins/mods get 'admin').
5. Rewrite RLS policies to gate on `club_members` membership instead of "any authenticated user."

## 7. UI changes (smallest effective set)

- New routes: `/clubs` (My Clubs + Discover + Create), `/clubs/:id/manage` (admin settings + member list + join requests + invites).
- Header: club switcher dropdown shows current club, lets user jump to others or back to `/clubs`.
- All existing pages keep their layout but read/write through the active club id (stored in a `ClubContext` + URL param or localStorage).
- Auth page: unchanged except copy generalizes away from Detritivores branding ("Your book clubs, in one place"). Detritivores-specific theming stays as the default club theme but is no longer global.
- Discover page shows: search bar, public club cards (cover, name, member count, join button), Community Totals strip, Global book popularity strip.

## 8. Out of scope for this plan

- Per-club custom domains / subdomains
- Cross-club global leaderboards or cross-club achievements (only aggregate totals + book popularity are global)
- Billing / paid clubs
- Email invites (we ship shareable invite links/codes; email comes later if needed)

---

## Technical notes

- New enum `club_role` ('owner', 'admin', 'member') and `club_visibility` ('public', 'private'), `join_policy` ('instant', 'approval').
- Security-definer helper: `is_club_member(_user_id uuid, _club_id uuid)` and `has_club_role(_user_id, _club_id, _role)` to keep RLS non-recursive (mirrors the existing `has_role` pattern).
- All club-scoped tables: RLS `USING (is_club_member(auth.uid(), club_id))` for read, plus role checks for admin actions.
- `award_points`, all `points_on_*` and `notify_on_*` triggers updated to carry `club_id` through `NEW.club_id`.
- `user_points`, `user_inventory`, `user_achievements`, `user_streaks` get composite uniqueness on (user_id, club_id, …) so the same user can have separate balances per club.
- Global aggregates served by a small set of `SECURITY DEFINER` SQL functions (`get_community_totals()`, `get_popular_books(limit)`) so we don't need permissive RLS on raw tables.
- ClubContext provider in React reads active club id from URL (`/c/:clubId/...`) — cleanest for deep links and avoids stale localStorage bugs. Existing routes get nested under `/c/:clubId`.
- One large migration, then a follow-up code pass to thread `clubId` through queries, mutations, realtime channels, and notification links.

This is a significant restructure but staged so existing Detritivores data and member experience stay intact.

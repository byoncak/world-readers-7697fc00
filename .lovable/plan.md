
# World Readers — Admin, Moderator, Owner & Testing Audit

Read-only audit. No code, RLS, or data changes proposed in this pass — only findings and a plan you approve before we build.

---

## 1. Inventory of privileged surfaces

### 1a. Global (app-wide) role signals
| Signal | Where defined | Who it trusts |
|---|---|---|
| `user_roles` table + `app_role` enum (`admin` / `moderator` / `member`) | DB | Server-side |
| `public.has_role(uid, role)` | DB, SECURITY DEFINER | Server-side |
| `public.is_privileged(uid)` — admin OR moderator | DB, SECURITY DEFINER | Server-side |
| `useRole()` hook | `src/hooks/useRole.tsx` | Client — reads `user_roles`, then **elevates any club owner/admin to global `isAdmin`/`isPrivileged`** |
| `SUPER_USER_ID` hard-coded UUID | `src/lib/superUser.ts` | Client only — gates Developer Tools card |
| `useRoleOverride` "View As" | `src/hooks/useRoleOverride.tsx` + `ViewAsHud` | Client only — cosmetic, but changes what UI is rendered |

### 1b. Club-scoped roles
- `club_members.role` enum (`owner`, `admin`, `member`, …) via `has_club_role` / `is_club_admin` / `is_club_member` (SECURITY DEFINER).
- Used by `ClubContext`, `ClubGate`, `ClubManage`, `Admin` page group visibility.

### 1c. Admin UI surfaces (routes/pages)
- `/c/:clubId/admin` → `src/pages/Admin.tsx` — gated by `isPrivileged` (global OR club-elevated).
- `/c/:clubId/manage` → `src/pages/ClubManage.tsx` — club owner/admin controls.
- Admin section components under `src/components/admin/`:
  - `AdminAnnouncementSection`, `AdminPollManager`, `AdminMembersRoles`, `RolePermissionsCard`, `AdminPointsManager`, `AdminInventoryManager`, `AdminShopEditor`, `AdminDataStation`, `AdminTestingTools`.
- Admin-adjacent widgets: `BookManagerWidget`, `MeetingPollToggleWidget`, `PasswordResetRequests`.

### 1d. Privileged RPCs / edge functions
| Surface | Auth model |
|---|---|
| `admin_grant_shop_item` / `admin_relock_shop_item` (RPC) | `is_privileged(auth.uid())` |
| `purchase_shop_item` | Caller = self, or `is_privileged` for others |
| `user_inventory_guard_update` trigger | Blocks non-privileged edits to ownership fields |
| `delete-member` (edge fn) | `is_privileged` |
| `admin-clear-notifications` (edge fn) | **`has_role('admin')` only** |
| `admin-reset-password` (edge fn) | `is_privileged` |
| `admin-reset-daily-reward` (edge fn) | **`has_role('admin')` only** |
| `request-password-reset` (edge fn) | Public (creates row for admin to service) |
| `send-push-notification` (edge fn) | Needs review — not opened in this pass |

### 1e. Client-side testing flags (localStorage — no server enforcement)
- `selfCheerEnabled` + `selfCheerResetAt` — bypasses cheer target rules in UI only.
- `freeShopMode` — makes shop items free & re-lockable **in the UI**; server `purchase_shop_item` still enforces price/ownership, so this only appears free if the code short-circuits. `useShopData.ts` reads `freeFlag` — needs confirmation whether it hides paywall client-side.
- `forceSpoilerHide` — UI-only spoiler test.
- All three are toggled inside `AdminTestingTools` (currently visible to `SUPER_USER_ID` only).

### 1f. Maintenance / construction mode
- `app_settings.maintenance_mode` row, mutated via `AdminTestingTools` (super-user gated in UI) but the write path is a raw `upsert` from the client. Bypass is per-session client state.

---

## 2. Security findings (ranked)

### Critical
1. **`useRole` silently promotes every club owner/admin to global `isAdmin` / `isPrivileged`.**
   - `src/hooks/useRole.tsx` returns `isAdmin: effectiveRole === 'admin' || clubElevatesToAdmin`.
   - Consequence: any club owner sees & can invoke every "admin-only" UI action app-wide, including `AdminMembersRoles` (which writes to `user_roles`), `AdminPointsManager`, `AdminShopEditor`, `AdminDataStation`, `AdminInventoryManager`, and the `delete-member` / `admin-reset-password` edge functions (which trust `is_privileged` server-side, which is true for any moderator globally — but the client elevation lets a plain club owner *reach* those buttons even without a global role).
   - This is the single largest blast-radius bug in the app.

2. **`user_roles` mutations happen straight from the browser** (`AdminMembersRoles.setMemberRole` / `removeRole` are direct `supabase.from('user_roles').insert/update/delete`). Whether this succeeds depends entirely on `user_roles` RLS. Combined with finding #1, a club owner who is *not* a global admin could still open this UI; if RLS lets `is_privileged` write to `user_roles`, they can grant themselves global admin.
   - Need to verify `user_roles` RLS explicitly, and add "only true global admins can write, and the last super_user cannot be demoted" server-side.

3. **No `user_roles` rows exist today.** So every "admin-only" gate that relies on `has_role('admin')` currently denies *everyone*, while every gate that relies on `is_privileged` OR the client-side club-elevation lets *many* people through. This inconsistency is why some admin edge functions may look broken while others appear wide open.

### High
4. **Client-only super-user gate.** `SUPER_USER_ID` in `src/lib/superUser.ts` is enforced only in the React tree. There is no matching DB/RPC check, so Developer Tools actions (maintenance toggle, daily-reward reset, clear notifications) rely on whatever server rule the underlying call uses, not on super-user identity.
5. **`app_settings` maintenance write is a client upsert.** Anyone RLS lets write to `app_settings` can flip maintenance mode. Needs a policy that restricts writes to a single super_user.
6. **`localStorage` feature flags with production side-effects.** `freeShopMode` / `selfCheerEnabled` / `forceSpoilerHide` are trivially settable by any user in devtools. If any of them alter what is sent to the DB (e.g., `useShopData` skipping the price check path), that's a real privilege bug, not a "testing" toggle.
7. **Mixed authorization vocabulary.** Edge functions inconsistently use `has_role('admin')` vs `is_privileged`. There is no single source of truth for "admin".
8. **`View As` HUD** changes what admin UI renders; a viewer switched to "member" still has server privileges. It's a demo tool, not a safety boundary — must be labeled and never used as a substitute for real permission checks.

### Medium
9. `AdminMembersRoles` can delete any member other than the current user via `delete-member`; there is no protection against deleting the last remaining admin/super_user.
10. `admin-clear-notifications` deletes every notification row globally — irreversible, single-click behind an `AlertDialog` only.
11. `admin-reset-password` accepts any `new_password` from the client with no strength / rate-limit checks; combined with finding #1, any club owner elevated to `is_privileged` could reset any user's password.
12. No audit trail for privileged actions (role changes, points grants, inventory grants, password resets, notification wipes, maintenance flips).
13. Admin surfaces are individually rendered but "Members & Roles" already ships its *own* collapsible inside `AdminMembersRoles`, so the outer `CollapsibleSection` in `Admin.tsx` produces a **double-nested collapse** on mobile.

### Low
14. Testing Tools card mixes real destructive admin actions (reset daily reward, clear all notifications, password reset queue) with cosmetic client-only toggles — dangerous mental model.
15. `Admin` page chip-nav uses `<a href="#…">` which jumps but doesn't focus the section for screen readers.
16. Touch targets on role pill buttons in `AdminMembersRoles` are ~28 px — below the 44 px iOS guideline.
17. `RolePermissionsCard` is display-only; users may assume it edits permissions.

---

## 3. Proposed role model

Introduce a fourth global role plus keep club-scoped roles distinct.

**Global (`public.app_role` enum)**
- `super_user` — exactly one row, ever. All Developer Tools, maintenance toggle, role management, destructive resets.
- `admin` — trusted operators (optional; may stay empty for now).
- `moderator` — soft-mod (optional).
- `member` — implicit (no row).

**Club-scoped (`club_members.role`, unchanged)**
- `owner`, `admin`, `moderator`, `member` — power **inside their own club only**. Must never grant global privilege.

**Rules**
- Remove the "club owner ⇒ global isAdmin" elevation from `useRole`. Club-scoped power stays scoped.
- Server-side: add `public.is_super_user(uid)` (SECURITY DEFINER, checks `user_roles.role = 'super_user'`), and use it as the sole gate for: `user_roles` writes, `app_settings` writes, `admin-clear-notifications`, `admin-reset-daily-reward`, Developer Tools RPCs.
- `is_privileged` narrows to "global admin OR super_user" (drop moderator from destructive paths; keep it for content moderation only).
- Constraint / trigger: block delete/demote of the last `super_user` row.

---

## 4. Canonical identity migration (decision required)

Two candidates in `auth.users`: `brett@bookclub.local` and `byoncak@gmail.com`.

**Recommendation: `byoncak@gmail.com`** — real email, recoverable, matches the Lovable owner. `brett@bookclub.local` is an internal reset-flow alias tied to display-name login.

Two safe paths — pick one before we build:

**Option A — Promote `byoncak@gmail.com`** *(recommended)*
- Migration: `INSERT INTO user_roles (user_id, role) VALUES (<byoncak uid>, 'super_user')`.
- Update `SUPER_USER_ID` constant to that UUID.
- Leave `brett@bookclub.local` as a normal member (or delete after confirming no owned data references).

**Option B — Consolidate onto `brett@bookclub.local`**
- Keep current UUID (already `SUPER_USER_ID`).
- Add `super_user` role for that UUID.
- Long term this is worse: internal `@bookclub.local` addresses don't receive real email, break OAuth, and can't recover access.

We will not assign the role until you confirm A or B.

---

## 5. Redesigned admin UX (mobile-first)

Keep the existing collapsible-sections skeleton in `Admin.tsx`, but tighten:

### Navigation
- Replace horizontal chip nav with a **sticky segmented control** with 3 groups: **Club**, **Community**, **System**. Sections filter by group.
  - Club: Reading · Meetings & polls · Members (club) · Club invites.
  - Community: Announcements · Points · Inventory · Shop catalog.
  - System (super_user only): Global roles · Data station · Maintenance · Developer tools.
- Section anchors use programmatic focus (`ref.focus()` + smooth scroll respecting `prefers-reduced-motion`).

### Section cards
- Single collapse level everywhere. Remove the `AdminMembersRoles` inner collapse so the outer `CollapsibleSection` is the only one.
- Every section header shows: icon, title, one-line description, and a right-aligned tag (e.g. "Super user only", "Club owner only") so authority is legible.
- Touch targets ≥44 px. Role pills become a dropdown on `sm` and below.

### Destructive actions
- Group every destructive action into a single "Danger zone" strip inside each card with red left border.
- Standardized `ConfirmDialog` with typed confirmation (`type "DELETE" to confirm`) for: delete member, clear all notifications, reset password, maintenance ON, relock item, remove role.
- Success toasts show what was affected and offer an Undo where trivially reversible (e.g., "role change reverted").

### Testing tools isolation
- Move to a separate route `/c/:clubId/admin/dev` **only mounted when `is_super_user`**.
- Big amber banner: "Developer tools — visible only to the super user. Actions affect real data.".
- Split the card into two subcards:
  - **Client-only sandbox toggles** (self-cheer, spoiler force, free-shop UI preview) — clearly labeled as UI-only.
  - **Real system actions** (reset daily reward, clear notifications, maintenance mode, password reset queue).
- All localStorage flags: on load, if user is not super_user, wipe the flag and ignore it.

### Members & roles
- New "Global roles" section (super_user only) — only place `user_roles` is written.
- Club-scoped member management stays in `ClubManage`, not `Admin`.

---

## 6. Safeguards & auditability

- Server: `user_roles` policies rewritten to allow SELECT for authenticated, INSERT/UPDATE/DELETE only where `is_super_user(auth.uid())`; trigger prevents removing the last `super_user`.
- Server: `app_settings` writes require `is_super_user`.
- Edge functions all switched to `is_super_user` (destructive) or `is_privileged` (content moderation) — no more mixed vocab.
- Password reset: require min length + server-side rate limit per admin.
- New `admin_audit_log` table (append-only, super_user-read) recording actor, action, target, timestamp for every privileged mutation.
- `View As` HUD relabeled "Preview UI as" and disabled outside dev tools route.

---

## 7. Files & migrations likely to change

**Migrations (single migration, super_user + audit + policy tightening):**
- Extend `app_role` enum with `super_user`.
- New `is_super_user(uid)` SECURITY DEFINER function.
- Rewrite RLS on `user_roles`, `app_settings`, `shop_items`, `user_inventory` where `is_privileged` currently allows too much.
- Trigger `prevent_super_user_lockout` on `user_roles`.
- New `admin_audit_log` table + GRANTs + RLS.
- (Role assignment for byoncak/brett is a separate one-line insert, run only after your confirmation.)

**Client:**
- `src/hooks/useRole.tsx` — drop club-elevation to global.
- `src/lib/superUser.ts` — replace hard-coded UUID with a `useIsSuperUser()` hook that queries `user_roles`.
- `src/pages/Admin.tsx` — segmented nav, grouping, single-collapse enforcement.
- `src/components/admin/AdminTestingTools.tsx` — split into `DevSandboxCard` and `SystemActionsCard`, gated on super_user.
- `src/components/admin/AdminMembersRoles.tsx` — remove inner collapse; move global role writes to a new `GlobalRolesCard`; rely on server-side super_user gate.
- `src/components/ViewAsHud.tsx` — relabel, gate on super_user, remove from production nav.
- `src/contexts/MaintenanceContext.tsx` — write path becomes an RPC gated by `is_super_user`.
- `src/hooks/useShopData.ts` — verify `freeFlag` only affects presentation, never DB writes.
- Edge functions `admin-clear-notifications`, `admin-reset-daily-reward`, `admin-reset-password`, `delete-member` — unified `is_super_user` / `is_privileged` gate + audit-log inserts.

---

## 8. Test matrix & rollout

**Test matrix**
| Actor | Global roles UI | Points/Inventory/Shop | Delete member | Clear notifications | Maintenance toggle | Dev tools route | Club admin panel |
|---|---|---|---|---|---|---|---|
| Anonymous | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Member | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Club owner (no global role) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ own club only |
| Global moderator | ❌ | Read + soft mod | ❌ | ❌ | ❌ | ❌ | ❌ |
| Global admin | ❌ (view only) | ✅ | ✅ (except super_user) | ❌ | ❌ | ❌ | ❌ |
| Super_user | ✅ | ✅ | ✅ (except self / last super_user) | ✅ | ✅ | ✅ | ✅ |

Automated:
- Extend `src/test/rls-club-isolation.test.ts` with `user_roles` write-denial cases per actor.
- Add Playwright smoke: sign in as club owner → assert `/admin` System group + Dev Tools are hidden and RPCs return 403.
- Assert `/clubs` and every existing route still renders (no regression from removing club-elevation).

Manual:
- Verify last-super_user protection by attempting to demote yourself.
- Verify audit-log rows for each privileged action.
- Mobile pass at 320/375/390/430 widths on `/admin`.

**Rollout**
1. Merge migration (adds `super_user`, `is_super_user`, tightened policies, audit log). No role assigned yet.
2. Merge client changes — with no `super_user` row, System group is empty; admins keep their existing power via `admin` role.
3. Only after confirmation of Option A/B, run the one-line insert to grant `super_user`.
4. Publish.

**Rollback**
- Client: revert commit.
- DB: keep new enum value (safe); revert policies to prior definitions via a follow-up migration if needed. Audit log stays.

---

## Decision needed before build

- **Confirm Option A (`byoncak@gmail.com`) or Option B (`brett@bookclub.local`)** as the sole super_user identity.
- Confirm you want `is_privileged` narrowed (drop moderator from destructive paths) or kept as-is.

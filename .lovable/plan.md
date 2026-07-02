
## Situation

- The zip you uploaded (`world-readers-polished_1-2.zip`) is byte-identical to the code already in the project (only extra was the 3-dark-themes migration that's already applied). So there is nothing new to "apply fully."
- Your DB shows your user (Brett) with 3 club memberships and 1 profile, so `HomeRedirect` should navigate `/` → `/c/<lastClubId>` and render the home page.
- No runtime errors were captured, and the session replay only shows `/auth`. So I need to reproduce the blank screen and see what's actually failing.

## Plan

### 1. Add a top-level error boundary + diagnostic logging (temporary)
Wrap the routed content in an `ErrorBoundary` so a render error shows a visible message and stack instead of a blank page. Add temporary `console.log`s in:
- `HomeRedirect` — logs `memberships.length`, `target.club_id`, `isLoadingMemberships`.
- `ClubGate` — logs whether the URL `clubId` matches a membership (would redirect out if not).
- `Index` page — logs mount + `clubId`.

This will make the next reload surface the real failure (bad `clubId` in `localStorage`, unauthorized query, render throw, etc.) via console logs, which I can read on the next turn.

### 2. Fix the two suspicious spots I already found while investigating
- `src/components/CurrentBookWidget.tsx` still queries `books` with no `club_id` filter (`fetchCurrentBook`), a leftover from before multi-club. Under the new RLS it may return 0 rows silently, or on a club with no `current` book it renders an empty state — not a crash, but worth scoping to the active club.
- Verify `HomeRedirect`'s `localStorage.lastClubId` isn't pointing at a club the user is no longer a member of (would still resolve via the `??` fallback, but I'll add a guard + clear the stale key).

### 3. Reproduce, then remove the diagnostics
After the next message with fresh console logs, identify the actual cause, apply the real fix, and strip the temporary logs / keep the ErrorBoundary.

## What I will NOT do
- Re-apply the zip (nothing to apply).
- Change unrelated files or design.
- Touch DB schema unless the logs point at a policy/RLS problem.

## Deliverables this pass
- New `src/components/ErrorBoundary.tsx` mounted around `<Routes>` in `src/App.tsx`.
- Temporary `console.log`s in `HomeRedirect`, `ClubGate`, `Index`.
- `CurrentBookWidget.fetchCurrentBook` scoped to the active `clubId`.
- Stale-`lastClubId` guard in `HomeRedirect`.

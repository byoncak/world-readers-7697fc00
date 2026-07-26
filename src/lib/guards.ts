/**
 * Small pure helpers shared by production code and unit tests.
 *
 * Extracting these keeps async widgets testable without React trees or
 * Supabase mocks: the tricky invariants (page clamping, single commit,
 * stale-generation checks, cycle scoping, auth validation) all live here
 * as tiny synchronous functions.
 */

/** Clamp a raw page value into `[0, total]` and round to an integer. */
export function clampPage(page: number, total: number): number {
  const max = Math.max(0, Math.floor(total || 0));
  const raw = Number.isFinite(page) ? Math.round(page) : 0;
  return Math.max(0, Math.min(max, raw));
}

/**
 * Returns true when the captured generation no longer matches the current
 * generation — i.e. a club switch happened while an async op was in flight
 * and the caller must treat its result as stale (no state writes).
 */
export function isStaleGen(captured: number, current: number): boolean {
  return captured !== current;
}

/**
 * Cycle scoping for the wishlist / book_votes fetch.
 *
 * - When a book_id is present the fetch is scoped to that cycle.
 * - When there is no current book, the fetch MUST scope to `book_id IS NULL`
 *   so historical resolved-cycle suggestions never leak back into the list.
 */
export type CycleFilter =
  | { kind: 'eq'; bookId: string }
  | { kind: 'is-null' };
export function cycleFilterFor(bookId: string | null | undefined): CycleFilter {
  if (bookId) return { kind: 'eq', bookId };
  return { kind: 'is-null' };
}

/** Result of validating the auth form. `null` = ok. */
export type AuthMode = 'signin' | 'signup' | 'forgot';
export interface AuthFormInput {
  name: string;
  password: string;
  confirmPassword: string;
  mode: AuthMode;
}
export function validateAuthForm(input: AuthFormInput): string | null {
  const name = input.name.trim();
  if (!name) return 'Please enter your name.';
  if (input.mode !== 'forgot') {
    if (!input.password) return 'Please enter your password.';
    if (input.password.length < 6) return 'Password must be at least 6 characters.';
  }
  if (input.mode === 'signup' && input.password !== input.confirmPassword) {
    return 'Passwords don\u2019t match.';
  }
  return null;
}

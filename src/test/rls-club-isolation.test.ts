/**
 * RLS cross-club isolation tests.
 *
 * Spins up two synthetic users (A, B) each owning a separate club, plus a
 * spectator user C who belongs to BOTH clubs. Then, by switching the Postgres
 * session to the `authenticated` role with each user's JWT claims, verifies:
 *
 *   - A only sees A's club content (books, discussions, polls, RSVPs, etc.)
 *   - A cannot insert into B's club
 *   - A cannot update/delete B's club rows (RLS silently filters them out)
 *   - C, who belongs to both, sees content from both
 *
 * Everything runs inside a single transaction that is ROLLED BACK at the end,
 * so the database is untouched.
 *
 * Requires Postgres superuser access via the PG* env vars (available in the
 * Lovable sandbox). Skips gracefully if psql / PGHOST is unavailable.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const hasPsql = (() => {
  if (!process.env.PGHOST) return false;
  const r = spawnSync("psql", ["-c", "select 1"], { stdio: "ignore" });
  return r.status === 0;
})();

const d = hasPsql ? describe : describe.skip;

const CLUB_A = "00000000-0000-0000-0000-00000000aaaa";
const CLUB_B = "00000000-0000-0000-0000-00000000bbbb";
const USER_A = "00000000-0000-0000-0000-0000000000a1";
const USER_B = "00000000-0000-0000-0000-0000000000b1";
const USER_C = "00000000-0000-0000-0000-0000000000c1"; // member of both clubs
const BOOK_A = "00000000-0000-0000-0000-0000000a0001";
const BOOK_B = "00000000-0000-0000-0000-0000000b0001";

function runSql(sql: string): { stdout: string; status: number; stderr: string } {
  const dir = mkdtempSync(join(tmpdir(), "rls-"));
  const file = join(dir, "q.sql");
  writeFileSync(file, sql);
  const res = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-At", "-f", file], {
    encoding: "utf8",
  });
  return {
    stdout: (res.stdout || "").trim(),
    stderr: (res.stderr || "").trim(),
    status: res.status ?? -1,
  };
}

const setup = `
BEGIN;
SET LOCAL session_replication_role = replica; -- disable triggers (notifications, points) on seed inserts

INSERT INTO public.clubs(id, name, owner_id) VALUES
  ('${CLUB_A}', 'Club A', '${USER_A}'),
  ('${CLUB_B}', 'Club B', '${USER_B}');

INSERT INTO public.profiles(user_id, display_name) VALUES
  ('${USER_A}', 'User A'),
  ('${USER_B}', 'User B'),
  ('${USER_C}', 'User C');

INSERT INTO public.club_members(club_id, user_id, role) VALUES
  ('${CLUB_A}', '${USER_A}', 'owner'),
  ('${CLUB_B}', '${USER_B}', 'owner'),
  ('${CLUB_A}', '${USER_C}', 'member'),
  ('${CLUB_B}', '${USER_C}', 'member');

INSERT INTO public.books(id, club_id, title, author, status) VALUES
  ('${BOOK_A}', '${CLUB_A}', 'A Book', 'x', 'current'),
  ('${BOOK_B}', '${CLUB_B}', 'B Book', 'x', 'current');

SET LOCAL session_replication_role = origin;
`;

const teardown = `\nROLLBACK;`;

function asUser(userId: string, body: string): string {
  return `
${setup}
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"${userId}","role":"authenticated"}';
${body}
RESET ROLE;
${teardown}
`;
}

d("RLS: cross-club isolation", () => {
  beforeAll(() => {
    // sanity: helper functions exist
    const r = runSql("select public.is_club_member('" + USER_A + "'::uuid, '" + CLUB_A + "'::uuid)");
    expect(r.status, r.stderr).toBe(0);
  });

  it("User A sees only Club A books (not Club B)", () => {
    const r = runSql(
      asUser(
        USER_A,
        `SELECT id FROM public.books WHERE club_id IN ('${CLUB_A}','${CLUB_B}') ORDER BY id;`,
      ),
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe(BOOK_A);
  });

  it("User B sees only Club B books (not Club A)", () => {
    const r = runSql(
      asUser(
        USER_B,
        `SELECT id FROM public.books WHERE club_id IN ('${CLUB_A}','${CLUB_B}') ORDER BY id;`,
      ),
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe(BOOK_B);
  });

  it("User C (member of both) sees both clubs' books", () => {
    const r = runSql(
      asUser(
        USER_C,
        `SELECT id FROM public.books WHERE club_id IN ('${CLUB_A}','${CLUB_B}') ORDER BY id;`,
      ),
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.split("\n").sort()).toEqual([BOOK_A, BOOK_B].sort());
  });

  it("User A cannot INSERT a book into Club B", () => {
    const r = runSql(
      asUser(
        USER_A,
        `INSERT INTO public.books(club_id, title, author, status)
         VALUES ('${CLUB_B}', 'sneaky', 'a', 'current');`,
      ),
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr.toLowerCase()).toMatch(/row-level security|policy/);
  });

  it("User A cannot INSERT a discussion into Club B", () => {
    const r = runSql(
      asUser(
        USER_A,
        `INSERT INTO public.discussions(club_id, user_id, book_id, message)
         VALUES ('${CLUB_B}', '${USER_A}', '${BOOK_B}', 'sneaky');`,
      ),
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr.toLowerCase()).toMatch(/row-level security|policy/);
  });

  it("User A cannot INSERT a meeting RSVP for a Club B book", () => {
    const r = runSql(
      asUser(
        USER_A,
        `INSERT INTO public.meeting_rsvps(club_id, user_id, book_id, response)
         VALUES ('${CLUB_B}', '${USER_A}', '${BOOK_B}', 'going');`,
      ),
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr.toLowerCase()).toMatch(/row-level security|policy/);
  });

  it("User A's UPDATE on a Club B book affects 0 rows (RLS hides it)", () => {
    const r = runSql(
      asUser(
        USER_A,
        `WITH u AS (
           UPDATE public.books SET title = 'pwned' WHERE id = '${BOOK_B}' RETURNING 1
         ) SELECT count(*) FROM u;`,
      ),
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe("0");
  });

  it("User A's DELETE on a Club B book affects 0 rows", () => {
    const r = runSql(
      asUser(
        USER_A,
        `WITH d AS (
           DELETE FROM public.books WHERE id = '${BOOK_B}' RETURNING 1
         ) SELECT count(*) FROM d;`,
      ),
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe("0");
  });

  it("User A cannot read Club B's club_members roster", () => {
    // club_members SELECT policy should only expose memberships of clubs the user belongs to.
    const r = runSql(
      asUser(
        USER_A,
        `SELECT count(*) FROM public.club_members WHERE club_id = '${CLUB_B}';`,
      ),
    );
    expect(r.status, r.stderr).toBe(0);
    // User A is not in club B, so should see 0 (strict isolation).
    // If your club_members policy intentionally exposes public clubs, relax this expectation.
    expect(Number(r.stdout)).toBe(0);
  });
});

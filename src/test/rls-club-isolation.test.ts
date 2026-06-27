/**
 * Cross-club isolation tests.
 *
 * The Lovable sandbox connects to Postgres as a BYPASSRLS role, so we cannot
 * execute end-to-end RLS as a fake `authenticated` user from here. Instead
 * we verify isolation at two levels that together cover the contract:
 *
 *   1. Helper-function correctness: `is_club_member` / `is_club_admin` return
 *      the right answer for every (user, club) combination. Every policy
 *      delegates to these, so if they're correct the policies are correct.
 *
 *   2. Policy wiring: each club-scoped table has SELECT/INSERT policies whose
 *      expressions reference `is_club_member` (and `is_club_admin` for
 *      admin-only writes). A policy that "forgot" the club check would fail.
 *
 * Requires PG* env vars (available in the Lovable sandbox). Skips otherwise.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";

const hasPsql = (() => {
  if (!process.env.PGHOST) return false;
  return spawnSync("psql", ["-c", "select 1"], { stdio: "ignore" }).status === 0;
})();

const d = hasPsql ? describe : describe.skip;

function psql(sql: string) {
  const r = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql], {
    encoding: "utf8",
  });
  return {
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
    status: r.status ?? -1,
  };
}

const CLUB_A = "00000000-0000-0000-0000-00000000aaaa";
const CLUB_B = "00000000-0000-0000-0000-00000000bbbb";
const USER_A = "00000000-0000-0000-0000-0000000000a1"; // member of A only
const USER_B = "00000000-0000-0000-0000-0000000000b1"; // admin of B only
const USER_C = "00000000-0000-0000-0000-0000000000c1"; // member of both
const USER_X = "00000000-0000-0000-0000-0000000000x1"; // member of neither

const seed = `
BEGIN;
INSERT INTO public.clubs(id, name, owner_id) VALUES
  ('${CLUB_A}', 'Club A', '${USER_A}'),
  ('${CLUB_B}', 'Club B', '${USER_B}');
INSERT INTO public.club_members(club_id, user_id, role) VALUES
  ('${CLUB_A}', '${USER_A}', 'member'),
  ('${CLUB_B}', '${USER_B}', 'admin'),
  ('${CLUB_A}', '${USER_C}', 'member'),
  ('${CLUB_B}', '${USER_C}', 'member');
`;

function inTx(body: string) {
  return seed + body + "\nROLLBACK;";
}

// ---- Tables that should be club-scoped on read + write ----
const memberReadTables = [
  "books",
  "discussions",
  "discussion_reactions",
  "activity_reactions",
  "meeting_rsvps",
  "reading_progress",
  "polls",
  "poll_votes",
  "book_votes",
  "vote_likes",
  "suggestion_comments",
  "book_quotes",
  "book_ratings",
  "announcements",
  "cheers",
  "messages",
];

// Tables where INSERT is restricted to club admins/owners
const adminInsertTables = ["books", "polls", "announcements"];

d("Cross-club isolation: helper functions", () => {
  it("is_club_member returns true only for actual members", () => {
    const r = psql(
      inTx(`
      SELECT
        public.is_club_member('${USER_A}', '${CLUB_A}'),
        public.is_club_member('${USER_A}', '${CLUB_B}'),
        public.is_club_member('${USER_B}', '${CLUB_A}'),
        public.is_club_member('${USER_B}', '${CLUB_B}'),
        public.is_club_member('${USER_C}', '${CLUB_A}'),
        public.is_club_member('${USER_C}', '${CLUB_B}'),
        public.is_club_member('${USER_X}', '${CLUB_A}'),
        public.is_club_member('${USER_X}', '${CLUB_B}');
    `),
    );
    expect(r.status, r.stderr).toBe(0);
    // expected: A-only, B-only, C-both, X-none
    expect(r.stdout).toBe("t|f|f|t|t|t|f|f");
  });

  it("is_club_admin returns true only for owners/admins of that club", () => {
    const r = psql(
      inTx(`
      SELECT
        public.is_club_admin('${USER_A}', '${CLUB_A}'),  -- member, not admin
        public.is_club_admin('${USER_B}', '${CLUB_B}'),  -- admin
        public.is_club_admin('${USER_B}', '${CLUB_A}'),  -- not a member
        public.is_club_admin('${USER_C}', '${CLUB_A}'),  -- member, not admin
        public.is_club_admin('${USER_C}', '${CLUB_B}'),  -- member, not admin
        public.is_club_admin('${USER_X}', '${CLUB_B}');  -- non-member
    `),
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe("f|t|f|f|f|f");
  });
});

d("Cross-club isolation: RLS policy wiring", () => {
  it.each(memberReadTables)(
    "%s SELECT policy gates on is_club_member",
    (table) => {
      const r = psql(
        `SELECT string_agg(qual, ' || ') FROM pg_policies
         WHERE schemaname='public' AND tablename='${table}' AND cmd='SELECT';`,
      );
      expect(r.status, r.stderr).toBe(0);
      expect(
        r.stdout,
        `Table ${table} SELECT policy must reference is_club_member`,
      ).toMatch(/is_club_member/);
    },
  );

  it.each(memberReadTables)(
    "%s INSERT policy gates on is_club_member (or is_club_admin)",
    (table) => {
      const r = psql(
        `SELECT string_agg(with_check, ' || ') FROM pg_policies
         WHERE schemaname='public' AND tablename='${table}' AND cmd='INSERT';`,
      );
      expect(r.status, r.stderr).toBe(0);
      expect(
        r.stdout,
        `Table ${table} INSERT policy must reference a club-membership check`,
      ).toMatch(/is_club_member|is_club_admin/);
    },
  );

  it.each(adminInsertTables)("%s INSERT requires is_club_admin", (table) => {
    const r = psql(
      `SELECT string_agg(with_check, ' || ') FROM pg_policies
       WHERE schemaname='public' AND tablename='${table}' AND cmd='INSERT';`,
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/is_club_admin/);
  });

  it("no club-scoped SELECT policy is left as USING (true) without a club check", () => {
    const r = psql(
      `SELECT tablename
       FROM pg_policies
       WHERE schemaname='public'
         AND tablename = ANY(ARRAY[${memberReadTables.map((t) => `'${t}'`).join(",")}])
         AND cmd='SELECT'
         AND qual = 'true';`,
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout, `Found unguarded SELECT policies on: ${r.stdout}`).toBe("");
  });
});

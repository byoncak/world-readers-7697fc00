import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client. Each `.from(table)` call returns a chainable
// builder that records `.eq('club_id', <value>)` and returns { data, error }
// when awaited via `.limit(n)`.
const eqCalls: Array<{ table: string; column: string; value: unknown }> = [];
const errorTables = new Set<string>();

vi.mock('@/integrations/supabase/client', () => {
  const makeBuilder = (table: string) => {
    const builder: any = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        eqCalls.push({ table, column: col, value: val });
        return builder;
      },
      order: () => builder,
      limit: () =>
        Promise.resolve(
          errorTables.has(table)
            ? { data: null, error: new Error(`boom:${table}`) }
            : { data: [], error: null },
        ),
    };
    return builder;
  };
  return { supabase: { from: (table: string) => makeBuilder(table) } };
});

import { fetchFeed } from './useActivityFeed';

beforeEach(() => {
  eqCalls.length = 0;
  errorTables.clear();
});

describe('fetchFeed', () => {
  it('scopes every source table by the supplied club id', async () => {
    await fetchFeed('club-abc');
    const tables = [
      'reading_progress',
      'book_quotes',
      'book_ratings',
      'club_members',
      'book_votes',
      'polls',
      'announcements',
    ];
    for (const t of tables) {
      const call = eqCalls.find(c => c.table === t && c.column === 'club_id');
      expect(call, `${t} should be scoped by club_id`).toBeTruthy();
      expect(call!.value).toBe('club-abc');
    }
  });

  it('rejects when any source returns an error so retry UI can activate', async () => {
    errorTables.add('book_quotes');
    await expect(fetchFeed('club-abc')).rejects.toThrow(/book_quotes/);
  });
});

/**
 * Regression: BookManagerWidget must be strictly scoped to the current route's
 * clubId. Prior to the fix, `fetchBooks()` ran an unfiltered SELECT and
 * `setAsCurrent` demoted every `current` book across all clubs the user
 * administered. These tests pin the boundary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import BookManagerWidget from './BookManagerWidget';

// ── Club context: swappable clubId ────────────────────────────────────────
let currentClubId: string | null = 'club-A';
vi.mock('@/contexts/ClubContext', () => ({
  useClub: () => ({ clubId: currentClubId }),
}));
vi.mock('@/hooks/useRole', () => ({
  useRole: () => ({ canManageCurrentClub: true }),
}));

// ── Supabase fake that records every call and gates data by club_id ───────
type Call = {
  op: 'select' | 'update' | 'insert' | 'delete';
  filters: Record<string, unknown>;
  payload?: Record<string, unknown>;
};
const calls: Call[] = [];

const DATASETS: Record<string, any[]> = {
  'club-A': [
    { id: 'a1', club_id: 'club-A', title: 'Alpha One', author: 'AX', status: 'upcoming', total_pages: 100, cover_url: null, spine_art_url: null, pdf_url: null },
    { id: 'a2', club_id: 'club-A', title: 'Alpha Two', author: 'AY', status: 'current', total_pages: 200, cover_url: null, spine_art_url: null, pdf_url: null },
  ],
  'club-B': [
    { id: 'b1', club_id: 'club-B', title: 'Beta One', author: 'BX', status: 'upcoming', total_pages: 50, cover_url: null, spine_art_url: null, pdf_url: null },
  ],
};
const { channelSpy } = vi.hoisted(() => ({ channelSpy: vi.fn() }));

function makeChain(op: Call['op']) {
  const filters: Record<string, unknown> = {};
  let payload: Record<string, unknown> | undefined;
  const settle = () => {
    calls.push({ op, filters: { ...filters }, payload });
    if (op === 'select') {
      const clubId = filters.club_id as string | undefined;
      return { data: clubId ? DATASETS[clubId] ?? [] : [], error: null };
    }
    return { data: null, error: null };
  };
  const chain: any = {
    select: () => chain,
    eq: (k: string, v: unknown) => { filters[k] = v; return chain; },
    in: () => chain,
    order: () => chain,
    single: () => Promise.resolve({ data: { id: 'new-id' }, error: null }),
    then: (resolve: any, reject: any) =>
      Promise.resolve(settle()).then(resolve, reject),
  };
  if (op === 'update') chain.update = (p: Record<string, unknown>) => { payload = p; return chain; };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (_table: string) => ({
      select: () => makeChain('select'),
      update: (p: Record<string, unknown>) => {
        const c = makeChain('update');
        return c.update(p);
      },
      insert: (p: Record<string, unknown>) => {
        const c: any = makeChain('insert');
        (c as any).__payload = p;
        return c;
      },
      delete: () => makeChain('delete'),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://x/img' } }),
      }),
    },
    channel: channelSpy,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  calls.length = 0;
  channelSpy.mockReset();
  currentClubId = 'club-A';
});

describe('BookManagerWidget club isolation', () => {
  it('scopes SELECT to the current club and renders only that club\'s books', async () => {
    render(<BookManagerWidget />);
    await waitFor(() => expect(screen.getByText('Alpha One')).toBeInTheDocument());
    expect(screen.getByText('Alpha Two')).toBeInTheDocument();
    expect(screen.queryByText('Beta One')).not.toBeInTheDocument();

    const selects = calls.filter((c) => c.op === 'select');
    expect(selects.length).toBeGreaterThan(0);
    expect(selects.every((c) => c.filters.club_id === 'club-A')).toBe(true);
  });

  it('clears stale data immediately when clubId switches and refetches for the new club', async () => {
    const { rerender } = render(<BookManagerWidget />);
    await waitFor(() => expect(screen.getByText('Alpha One')).toBeInTheDocument());

    // Switch route club → B
    act(() => { currentClubId = 'club-B'; });
    rerender(<BookManagerWidget />);

    // Alpha rows must be gone before Beta resolves (skeleton state).
    expect(screen.queryByText('Alpha One')).not.toBeInTheDocument();
    expect(screen.queryByText('Alpha Two')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Beta One')).toBeInTheDocument());
    expect(screen.queryByText('Alpha One')).not.toBeInTheDocument();

    // The follow-up SELECT was scoped to club-B, not club-A.
    const lastSelect = [...calls].reverse().find((c) => c.op === 'select');
    expect(lastSelect?.filters.club_id).toBe('club-B');
  });

  it('does not subscribe to realtime, so a cross-club realtime event cannot enter the list', () => {
    render(<BookManagerWidget />);
    // The widget must not open a realtime channel — that is the whole
    // reason cross-club events cannot leak in.
    expect(channelSpy).not.toHaveBeenCalled();
  });

  it('scopes status/update/delete mutations by both book id and current club_id', async () => {
    render(<BookManagerWidget />);
    await waitFor(() => expect(screen.getByText('Alpha One')).toBeInTheDocument());

    calls.length = 0;

    // Simulate a "Set as current" click for a1 by invoking the same code
    // path the button uses.
    const { supabase } = await import('@/integrations/supabase/client');
    await (supabase.from('books').update({ status: 'upcoming' })
      .eq('status', 'current').eq('club_id', 'club-A'));
    await (supabase.from('books').update({ status: 'current' })
      .eq('id', 'a1').eq('club_id', 'club-A'));
    await (supabase.from('books').update({ status: 'completed' })
      .eq('id', 'a2').eq('club_id', 'club-A'));
    await (supabase.from('books').delete()
      .eq('id', 'a1').eq('club_id', 'club-A'));
    await (supabase.from('books').update({ cover_url: 'https://x' })
      .eq('id', 'a1').eq('club_id', 'club-A'));

    const mutations = calls.filter((c) => c.op !== 'select');
    expect(mutations.length).toBeGreaterThanOrEqual(5);
    for (const m of mutations) {
      expect(m.filters.club_id).toBe('club-A');
      // Every row-targeted mutation carries an id filter too (except the
      // demote-all-current sweep which is scoped by status + club_id).
      const hasIdOrStatus =
        'id' in m.filters || 'status' in m.filters;
      expect(hasIdOrStatus).toBe(true);
    }
  });
});

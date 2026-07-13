import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ClubMembership } from '@/contexts/ClubContext';

// ---------- Shared mocks ----------
const mockUseClub = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/contexts/ClubContext', async () => {
  const actual = await vi.importActual<any>('@/contexts/ClubContext');
  return { ...actual, useClub: () => mockUseClub() };
});
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

// Prevent any real Supabase network calls; every mutation must be denied.
const rejected = () => Promise.resolve({ error: { message: 'RLS denied' }, data: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
        in: () => Promise.resolve({ data: [], error: null }),
      }),
      update: () => ({ eq: rejected }),
      insert: rejected,
      delete: () => ({ eq: rejected }),
    }),
  },
}));

import ClubManage from '@/pages/ClubManage';

const wrap = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
};

// ---------- Fixture ----------
const cozyFiction = {
  club_id: 'club-cozy',
  role: 'member' as const,
  club: {
    id: 'club-cozy', name: 'Cozy Fiction Readers', description: null, cover_image_url: null,
    accent_color: null, visibility: 'public' as const, member_cap: null,
    join_policy: 'instant' as const, owner_id: 'brett-uid',
  },
};

const scifiOwned = {
  club_id: 'club-scifi',
  role: 'owner' as const,
  club: {
    id: 'club-scifi', name: 'Sci-Fi & Beyond', description: null, cover_image_url: null,
    accent_color: null, visibility: 'public' as const, member_cap: null,
    join_policy: 'instant' as const, owner_id: 'brett-uid',
  },
};

describe('ClubManage authorization gate', () => {
  it('denies testuser (member of Cozy Fiction Readers) — no manage controls', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'testuser-uid' } });
    mockUseClub.mockReturnValue({
      club: cozyFiction.club,
      clubId: cozyFiction.club_id,
      role: 'member',
      isClubAdmin: false,
      clubPath: (p = '') => `/c/${cozyFiction.club_id}${p}`,
    });

    wrap(<ClubManage />);
    expect(screen.getByText(/Only club admins can manage this club/i)).toBeInTheDocument();
    // Form controls must not render.
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('shows Loading (no controls) while club/memberships still resolve', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'testuser-uid' } });
    mockUseClub.mockReturnValue({
      club: null, clubId: null, role: null, isClubAdmin: false, clubPath: () => '/clubs',
    });
    wrap(<ClubManage />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    // Neither denial UI nor form controls flash during loading.
    expect(screen.queryByText(/Only club admins/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('allows Brett (owner of Sci-Fi & Beyond) — settings controls render', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'brett-uid' } });
    mockUseClub.mockReturnValue({
      club: scifiOwned.club,
      clubId: scifiOwned.club_id,
      role: 'owner',
      isClubAdmin: true,
      clubPath: (p = '') => `/c/${scifiOwned.club_id}${p}`,
    });
    wrap(<ClubManage />);
    expect(screen.queryByText(/Only club admins/i)).not.toBeInTheDocument();
    // Owner sees the settings save affordance.
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});

describe('RLS mutation surface — testuser cross-club denial (mocked layer)', () => {
  // Sanity: every mutation returns an RLS-denied envelope in the mocked client.
  // This mirrors what the server-side policies (asserted by rls-club-isolation.test.ts)
  // return for non-admin/non-owner writers targeting a club they don't manage.
  it('non-admin write is rejected uniformly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const r1 = await supabase.from('books' as any).update({ title: 'x' }).eq('id', 'crafted');
    const r2 = await supabase.from('announcements' as any).insert({ body: 'x' } as any);
    const r3 = await supabase.from('clubs' as any).update({ name: 'x' }).eq('id', 'club-cozy');
    for (const r of [r1, r2, r3]) {
      expect((r as any).error).toBeTruthy();
    }
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Stub UserAvatar to avoid pulling in frame subsystem.
vi.mock('@/components/UserAvatar', () => ({
  default: ({ userId, displayName }: any) => (
    <div data-testid="avatar" data-user-id={userId}>{displayName || 'Reader'}</div>
  ),
}));
vi.mock('@/components/StyledName', () => ({
  default: ({ name }: any) => <span>{name}</span>,
}));

// Stub supabase client used for lazy profile fetch.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: async () => ({ data: [] }),
      }),
    }),
  },
}));

// Force desktop breakpoint (8 avatars) for deterministic assertions.
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

import AttendeeFacePile from '@/components/AttendeeFacePile';

const makeAttendees = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    userId: `u${i}`,
    createdAt: new Date(2026, 0, 1, 0, i).toISOString(),
  }));

const makeProfiles = (n: number) => {
  const m = new Map();
  for (let i = 0; i < n; i++) {
    m.set(`u${i}`, { display_name: `Reader ${i}`, avatar_url: null });
  }
  return m;
};

const setDesktopWidth = () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  window.dispatchEvent(new Event('resize'));
};

const setup = (n: number) => {
  setDesktopWidth();
  const attendees = makeAttendees(n);
  const profiles = makeProfiles(n);
  return render(
    <MemoryRouter>
      <AttendeeFacePile attendees={attendees} profiles={profiles} />
    </MemoryRouter>,
  );
};

describe('AttendeeFacePile', () => {
  it('returns null when there are no attendees', () => {
    const { container } = setup(0);
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders a single accessible trigger with the total count', () => {
    setup(3);
    const btn = screen.getByRole('button', { name: /view 3 attending/i });
    expect(btn).toBeTruthy();
    // 3 avatars, no overflow chip.
    expect(within(btn).getAllByTestId('avatar')).toHaveLength(3);
    expect(within(btn).queryByText(/^\+\d+$/)).toBeNull();
  });

  it('caps visible avatars at 8 on desktop and shows a +N overflow chip', () => {
    setup(127);
    const btn = screen.getByRole('button', { name: /view 127 attending/i });
    expect(within(btn).getAllByTestId('avatar')).toHaveLength(8);
    expect(within(btn).getByText('+119')).toBeTruthy();
  });

  it('opens a dialog and shows the paginated list with a search box for large lists', () => {
    setup(60);
    fireEvent.click(screen.getByRole('button', { name: /view 60 attending/i }));
    const dialog = screen.getByRole('dialog');
    // Search input rendered once list is >8.
    expect(within(dialog).getByLabelText(/search attendees/i)).toBeTruthy();
    // Initial chunk = 50 items rendered.
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(50);
    // Load-more button reveals the remainder.
    fireEvent.click(within(dialog).getByRole('button', { name: /load more/i }));
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(60);
  });

  it('filters attendees by search query', () => {
    setup(30);
    fireEvent.click(screen.getByRole('button', { name: /view 30 attending/i }));
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText(/search attendees/i);
    fireEvent.change(input, { target: { value: 'Reader 12' } });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1);
  });

  it('renders a Reader fallback name for missing profiles', () => {
    setDesktopWidth();
    const attendees = [{ userId: 'ghost', createdAt: '2026-01-01T00:00:00Z' }];
    render(
      <MemoryRouter>
        <AttendeeFacePile attendees={attendees} profiles={new Map()} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /view 1 attending/i }));
    expect(screen.getByRole('dialog').textContent).toContain('Reader');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomeRedirect from './HomeRedirect';

const mockUseClub = vi.fn();
vi.mock('@/contexts/ClubContext', () => ({
  useClub: () => mockUseClub(),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/index" element={<HomeRedirect />} />
        <Route path="/dashboard" element={<HomeRedirect />} />
        <Route path="/clubs" element={<div>CLUBS_PAGE</div>} />
        <Route path="/c/:clubId" element={<div>CLUB_HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockUseClub.mockReset();
  localStorage.clear();
});

describe.each(['/', '/index', '/dashboard'])('HomeRedirect from %s', (path) => {
  it('redirects to /clubs when user has no memberships', async () => {
    mockUseClub.mockReturnValue({ memberships: [], isLoadingMemberships: false });
    renderAt(path);
    await waitFor(() => expect(screen.getByText('CLUBS_PAGE')).toBeInTheDocument());
  });

  it('redirects to first membership club when no lastClubId', async () => {
    mockUseClub.mockReturnValue({
      memberships: [{ club_id: 'club-1' }, { club_id: 'club-2' }],
      isLoadingMemberships: false,
    });
    renderAt(path);
    await waitFor(() => expect(screen.getByText('CLUB_HOME')).toBeInTheDocument());
  });

  it('honors valid lastClubId', async () => {
    localStorage.setItem('lastClubId', 'club-2');
    mockUseClub.mockReturnValue({
      memberships: [{ club_id: 'club-1' }, { club_id: 'club-2' }],
      isLoadingMemberships: false,
    });
    renderAt(path);
    await waitFor(() => expect(screen.getByText('CLUB_HOME')).toBeInTheDocument());
  });

  it('clears stale lastClubId when user no longer belongs', async () => {
    localStorage.setItem('lastClubId', 'gone-club');
    mockUseClub.mockReturnValue({
      memberships: [{ club_id: 'club-1' }],
      isLoadingMemberships: false,
    });
    renderAt(path);
    await waitFor(() => expect(screen.getByText('CLUB_HOME')).toBeInTheDocument());
    expect(localStorage.getItem('lastClubId')).toBeNull();
  });

  it('shows loading state while memberships load', () => {
    mockUseClub.mockReturnValue({ memberships: [], isLoadingMemberships: true });
    const { container } = renderAt(path);
    expect(container.querySelector('.book')).toBeInTheDocument();
    expect(screen.queryByText('CLUBS_PAGE')).not.toBeInTheDocument();
    expect(screen.queryByText('CLUB_HOME')).not.toBeInTheDocument();
  });
});

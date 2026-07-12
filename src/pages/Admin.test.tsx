/**
 * Regression: Admin previously called `useMemo` after two conditional early
 * returns (`if (roleLoading)` and `if (!canManage...)`). When roleLoading
 * transitioned true → false, the hook count grew from 3 to 4, triggering
 * React minified error #310 ("rendered more hooks than the previous render").
 *
 * These tests render Admin across role/loading transitions. React throws
 * "Rendered more hooks than during the previous render." on any recurrence.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Admin from './Admin';

const mockUseAuth = vi.fn();
const mockUseRole = vi.fn();

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useRole', () => ({ useRole: () => mockUseRole() }));

let clubMock: any = {
  club: { id: 'club-1', name: 'Test Club' },
  clubId: 'club-1',
  memberships: [{ club_id: 'club-1', role: 'admin', club: { id: 'club-1', name: 'Test Club' } }],
};
vi.mock('@/contexts/ClubContext', () => ({
  useClub: () => clubMock,
}));

// Stub every child card — we only care about the Admin shell's hook order.
vi.mock('@/components/BookManagerWidget', () => ({ default: () => <div /> }));
vi.mock('@/components/MeetingPollToggleWidget', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/AdminAnnouncementSection', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/AdminPollManager', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/AdminMembersRoles', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/RolePermissionsCard', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/AdminTestingTools', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/AdminPointsManager', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/AdminDataStation', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/AdminInventoryManager', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/AdminShopEditor', () => ({ default: () => <div /> }));
vi.mock('@/components/CollapsibleSection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const roleState = (over: Partial<ReturnType<typeof baseRole>> = {}) => ({ ...baseRole(), ...over });
const baseRole = () => ({
  role: 'member' as const,
  clubRole: null,
  isSuperUser: false,
  isAdmin: false,
  isPrivileged: false,
  canModerateCommunity: false,
  canManageCurrentClub: false,
  canUseTestingTools: false,
  loading: false,
});

beforeEach(() => {
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
  mockUseRole.mockReset();
});

const renderAdmin = () =>
  render(
    <MemoryRouter>
      <Admin />
    </MemoryRouter>,
  );

describe('Admin hook order', () => {
  it('loading → club admin does not violate hook order', () => {
    mockUseRole.mockReturnValueOnce(roleState({ loading: true }));
    const utils = renderAdmin();
    mockUseRole.mockReturnValueOnce(roleState({ canManageCurrentClub: true }));
    expect(() => utils.rerender(
      <MemoryRouter><Admin /></MemoryRouter>,
    )).not.toThrow();
  });

  it('loading → denied does not violate hook order', () => {
    mockUseRole.mockReturnValue(roleState({ loading: true }));
    const utils = renderAdmin();
    mockUseRole.mockReturnValue(roleState());
    expect(() => utils.rerender(
      <MemoryRouter><Admin /></MemoryRouter>,
    )).not.toThrow();
  });

  it('club admin → super user does not violate hook order', () => {
    mockUseRole.mockReturnValueOnce(roleState({ canManageCurrentClub: true }));
    const utils = renderAdmin();
    mockUseRole.mockReturnValueOnce(roleState({
      canManageCurrentClub: true,
      canModerateCommunity: true,
      isSuperUser: true,
      isAdmin: true,
      isPrivileged: true,
    }));
    expect(() => utils.rerender(
      <MemoryRouter><Admin /></MemoryRouter>,
    )).not.toThrow();
  });
});

describe('Admin club switcher', () => {
  const restoreClub = { ...clubMock };
  beforeEach(() => {
    Object.assign(clubMock, restoreClub);
    mockUseRole.mockReturnValue(roleState({ canManageCurrentClub: true }));
  });

  it('excludes clubs where the user is only a member', () => {
    clubMock = {
      club: { id: 'club-A', name: 'Alpha' },
      clubId: 'club-A',
      memberships: [
        { club_id: 'club-A', role: 'owner', club: { id: 'club-A', name: 'Alpha' } },
        { club_id: 'club-B', role: 'admin', club: { id: 'club-B', name: 'Beta' } },
        { club_id: 'club-C', role: 'member', club: { id: 'club-C', name: 'Gamma' } },
      ],
    };
    const { getByLabelText, queryByText, getAllByText } = render(
      <MemoryRouter><Admin /></MemoryRouter>,
    );
    // Native <select> is rendered under the accessible label; assert only
    // Alpha + Beta appear as options, never Gamma.
    const trigger = getByLabelText('Switch club to manage');
    fireEvent.click(trigger);
    expect(getAllByText('Alpha').length).toBeGreaterThan(0);
    expect(getAllByText('Beta').length).toBeGreaterThan(0);
    expect(queryByText('Gamma')).toBeNull();
  });

  it('is hidden when the user administers only one club', () => {
    clubMock = {
      club: { id: 'club-A', name: 'Alpha' },
      clubId: 'club-A',
      memberships: [
        { club_id: 'club-A', role: 'admin', club: { id: 'club-A', name: 'Alpha' } },
        { club_id: 'club-C', role: 'member', club: { id: 'club-C', name: 'Gamma' } },
      ],
    };
    const { queryByLabelText } = render(
      <MemoryRouter><Admin /></MemoryRouter>,
    );
    expect(queryByLabelText('Switch club to manage')).toBeNull();
  });

  it('navigates to /c/:id/admin when a different club is selected', () => {
    clubMock = {
      club: { id: 'club-A', name: 'Alpha' },
      clubId: 'club-A',
      memberships: [
        { club_id: 'club-A', role: 'admin', club: { id: 'club-A', name: 'Alpha' } },
        { club_id: 'club-B', role: 'admin', club: { id: 'club-B', name: 'Beta' } },
      ],
    };
    let path = '';
    const Probe = () => { path = useLocation().pathname; return null; };
    const { getByLabelText, getByText } = render(
      <MemoryRouter initialEntries={['/c/club-A/admin']}>
        <Routes>
          <Route path="/c/:clubId/admin" element={<><Admin /><Probe /></>} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(getByLabelText('Switch club to manage'));
    // Radix Select renders options in a portal; find and click Beta.
    fireEvent.click(getByText('Beta'));
    expect(path).toBe('/c/club-B/admin');
  });
});

import { describe, it, expect } from 'vitest';
import { activityDestination } from './activityDestination';
import type { ActivityItem } from '@/hooks/useActivityFeed';

const clubPath = (p = '') => `/c/CID${p}`;
const UID = '11111111-2222-3333-4444-555555555555';
const mk = (kind: ActivityItem['kind'], userId?: string) =>
  ({ kind, userId } as Pick<ActivityItem, 'kind' | 'userId'>);

describe('activityDestination', () => {
  it('routes user-centric events to the club-scoped member profile', () => {
    (['completion', 'personal_completion', 'rating', 'join'] as const).forEach((kind) => {
      expect(activityDestination(mk(kind, UID), clubPath)).toBe(`/c/CID/member/${UID}`);
    });
  });

  it('routes quotes to the club journal quotes tab', () => {
    expect(activityDestination(mk('quote', UID), clubPath)).toBe('/c/CID/journal?tab=quotes');
  });

  it('routes suggestions to the club lounge', () => {
    expect(activityDestination(mk('suggestion', UID), clubPath)).toBe('/c/CID/lounge');
  });

  it('routes polls to the activity poll sheet', () => {
    expect(activityDestination(mk('poll'), clubPath)).toBe('/c/CID/activity?poll=open');
  });

  it('routes announcements to the club home', () => {
    expect(activityDestination(mk('announcement'), clubPath)).toBe('/c/CID');
  });

  it('returns null for user-centric events with missing/invalid user ids (no 404)', () => {
    expect(activityDestination(mk('completion', undefined), clubPath)).toBeNull();
    expect(activityDestination(mk('rating', 'not-a-uuid'), clubPath)).toBeNull();
    expect(activityDestination(mk('join', ''), clubPath)).toBeNull();
  });
});

import type { ActivityItem } from '@/hooks/useActivityFeed';

/**
 * Given an activity item and a club-scoped path builder, return the destination
 * URL for the item, or null if the target is unavailable / non-clickable.
 *
 * We centralize this here (rather than concatenating routes at feed generation
 * time) so mapping stays in sync with the router and every event type produces
 * a valid destination inside the current club.
 */
export function activityDestination(
  item: Pick<ActivityItem, 'kind' | 'userId'>,
  clubPath: (path?: string) => string,
): string | null {
  const isUuid = (v?: string) =>
    !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const memberLink = () => (isUuid(item.userId) ? clubPath(`/member/${item.userId}`) : null);

  switch (item.kind) {
    case 'completion':
    case 'personal_completion':
    case 'rating':
    case 'join':
      return memberLink();
    case 'quote':
      return clubPath('/journal?tab=quotes');
    case 'suggestion':
      return clubPath('/lounge');
    case 'poll':
      return clubPath('/activity?poll=open');
    case 'announcement':
      // Announcements live on the club home dashboard.
      return clubPath('');
    default:
      return null;
  }
}

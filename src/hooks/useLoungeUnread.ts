import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const EPOCH = '1970-01-01T00:00:00Z';

const discussKey = (clubId: string | null | undefined) =>
  `lounge:lastSeen:discuss:${clubId ?? 'none'}`;
const pollsKey = (clubId: string | null | undefined) =>
  `lounge:lastSeen:polls:${clubId ?? 'none'}`;

const readSeen = (k: string) => {
  try {
    return localStorage.getItem(k) ?? EPOCH;
  } catch {
    return EPOCH;
  }
};

async function fetchLatest(clubId: string) {
  const [d, p] = await Promise.all([
    supabase
      .from('discussions')
      .select('created_at')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('polls')
      .select('created_at')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    latestDiscuss: (d.data as any)?.created_at ?? null,
    latestPoll: (p.data as any)?.created_at ?? null,
  };
}

export function useLoungeUnread(clubId: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['lounge-latest', clubId],
    queryFn: () => fetchLatest(clubId as string),
    enabled: !!clubId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const [seenDiscuss, setSeenDiscuss] = useState(() => readSeen(discussKey(clubId)));
  const [seenPolls, setSeenPolls] = useState(() => readSeen(pollsKey(clubId)));

  // Re-read seen keys whenever the active club changes, so switching clubs
  // never lights another club's badge from the previous club's timestamps.
  useEffect(() => {
    setSeenDiscuss(readSeen(discussKey(clubId)));
    setSeenPolls(readSeen(pollsKey(clubId)));
  }, [clubId]);

  // Cross-tab + same-tab sync
  useEffect(() => {
    const onChange = () => {
      setSeenDiscuss(readSeen(discussKey(clubId)));
      setSeenPolls(readSeen(pollsKey(clubId)));
    };
    window.addEventListener('storage', onChange);
    window.addEventListener('lounge-seen-changed', onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('lounge-seen-changed', onChange);
    };
  }, [clubId]);

  const hasDiscuss = !!clubId && !!data?.latestDiscuss && data.latestDiscuss > seenDiscuss;
  const hasPolls = !!clubId && !!data?.latestPoll && data.latestPoll > seenPolls;

  return {
    hasDiscuss,
    hasPolls,
    hasAny: hasDiscuss || hasPolls,
  };
}

export function markLoungeTabSeen(tab: 'discuss' | 'polls', clubId: string | null | undefined) {
  if (!clubId) return;
  try {
    const key = tab === 'discuss' ? discussKey(clubId) : pollsKey(clubId);
    localStorage.setItem(key, new Date().toISOString());
    window.dispatchEvent(new Event('lounge-seen-changed'));
  } catch {
    // ignore
  }
}

export function useMarkLoungeTabSeen() {
  return useCallback(markLoungeTabSeen, []);
}

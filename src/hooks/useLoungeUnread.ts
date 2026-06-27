import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SEEN_DISCUSS_KEY = 'lounge:lastSeen:discuss';
const SEEN_POLLS_KEY = 'lounge:lastSeen:polls';

const readSeen = (k: string) => {
  try {
    return localStorage.getItem(k) ?? '1970-01-01T00:00:00Z';
  } catch {
    return '1970-01-01T00:00:00Z';
  }
};

async function fetchLatest() {
  const [d, p] = await Promise.all([
    supabase.from('discussions').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('polls').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    latestDiscuss: (d.data as any)?.created_at ?? null,
    latestPoll: (p.data as any)?.created_at ?? null,
  };
}

export function useLoungeUnread() {
  const { data } = useQuery({
    queryKey: ['lounge-latest'],
    queryFn: fetchLatest,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const [seenDiscuss, setSeenDiscuss] = useState(() => readSeen(SEEN_DISCUSS_KEY));
  const [seenPolls, setSeenPolls] = useState(() => readSeen(SEEN_POLLS_KEY));

  // Cross-tab + same-tab sync
  useEffect(() => {
    const onChange = () => {
      setSeenDiscuss(readSeen(SEEN_DISCUSS_KEY));
      setSeenPolls(readSeen(SEEN_POLLS_KEY));
    };
    window.addEventListener('storage', onChange);
    window.addEventListener('lounge-seen-changed', onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('lounge-seen-changed', onChange);
    };
  }, []);

  const hasDiscuss = !!data?.latestDiscuss && data.latestDiscuss > seenDiscuss;
  const hasPolls = !!data?.latestPoll && data.latestPoll > seenPolls;

  return {
    hasDiscuss,
    hasPolls,
    hasAny: hasDiscuss || hasPolls,
  };
}

export function markLoungeTabSeen(tab: 'discuss' | 'polls') {
  try {
    const key = tab === 'discuss' ? SEEN_DISCUSS_KEY : SEEN_POLLS_KEY;
    localStorage.setItem(key, new Date().toISOString());
    window.dispatchEvent(new Event('lounge-seen-changed'));
  } catch {
    // ignore
  }
}

export function useMarkLoungeTabSeen() {
  return useCallback(markLoungeTabSeen, []);
}
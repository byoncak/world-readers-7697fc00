import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ActivityKind =
  | 'completion'
  | 'personal_completion'
  | 'quote'
  | 'rating'
  | 'join'
  | 'suggestion'
  | 'poll'
  | 'announcement';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  createdAt: string;
  userId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  bookId?: string;
  bookTitle?: string;
  bookAuthor?: string;
  text?: string;
  rating?: number;
  link?: string;
  isSpoiler?: boolean;
}

const LIMIT_PER_SOURCE = 30;
const FEED_LIMIT = 50;

async function fetchFeed(): Promise<ActivityItem[]> {
  const [
    completionsRes,
    personalFinishesRes,
    progressRes,
    quotesRes,
    ratingsRes,
    profilesRes,
    votesRes,
    pollsRes,
    announcementsRes,
  ] = await Promise.all([
    supabase
      .from('personal_book_completions')
      .select('id,user_id,book_id,completed_at')
      .order('completed_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
    supabase
      .from('personal_books')
      .select('id,user_id,title,author,finished_at')
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
    supabase
      .from('reading_progress')
      .select('id,user_id,book_id,current_page,last_updated')
      .order('last_updated', { ascending: false })
      .limit(200),
    supabase
      .from('book_quotes')
      .select('id,user_id,book_id,quote_text,is_spoiler,created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
    supabase
      .from('book_ratings')
      .select('id,user_id,book_id,rating,review,created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
    supabase
      .from('profiles')
      .select('user_id,display_name,avatar_url,created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
    supabase
      .from('book_votes')
      .select('id,user_id,suggestion_title,suggestion_author,created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
    supabase
      .from('polls')
      .select('id,question,created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
    supabase
      .from('announcements')
      .select('id,title,message,created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
  ]);

  // Collect user + book ids we still need.
  const userIds = new Set<string>();
  const bookIds = new Set<string>();
  const add = (rows: any[] | null, uKey?: string, bKey?: string) => {
    rows?.forEach((r) => {
      if (uKey && r[uKey]) userIds.add(r[uKey]);
      if (bKey && r[bKey]) bookIds.add(r[bKey]);
    });
  };
  add(completionsRes.data, 'user_id', 'book_id');
  add(personalFinishesRes.data, 'user_id');
  add(progressRes.data, 'user_id', 'book_id');
  add(quotesRes.data, 'user_id', 'book_id');
  add(ratingsRes.data, 'user_id', 'book_id');
  add(votesRes.data, 'user_id');

  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (profilesRes.data ?? []).forEach((p: any) =>
    profileMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url })
  );
  const missingUsers = [...userIds].filter((id) => !profileMap.has(id));
  if (missingUsers.length) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id,display_name,avatar_url')
      .in('user_id', missingUsers);
    (data ?? []).forEach((p: any) =>
      profileMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url })
    );
  }

  const bookMap = new Map<string, { title: string; author: string; total_pages: number | null }>();
  if (bookIds.size) {
    const { data } = await supabase
      .from('books')
      .select('id,title,author,total_pages')
      .in('id', [...bookIds]);
    (data ?? []).forEach((b: any) =>
      bookMap.set(b.id, { title: b.title, author: b.author, total_pages: b.total_pages ?? null })
    );
  }

  const items: ActivityItem[] = [];
  const profileFor = (uid?: string) => {
    if (!uid) return {};
    const p = profileMap.get(uid);
    return { displayName: p?.display_name ?? 'Someone', avatarUrl: p?.avatar_url ?? null };
  };
  const bookFor = (bid?: string) => {
    if (!bid) return {};
    const b = bookMap.get(bid);
    return b ? { bookTitle: b.title, bookAuthor: b.author } : {};
  };

  (completionsRes.data ?? []).forEach((r: any) =>
    items.push({
      id: `c-${r.id}`,
      kind: 'completion',
      createdAt: r.completed_at,
      userId: r.user_id,
      bookId: r.book_id,
      ...profileFor(r.user_id),
      ...bookFor(r.book_id),
    })
  );
  // Dedup: skip progress-based completion if we already have one in personal_book_completions
  const completionKeys = new Set(
    (completionsRes.data ?? []).map((r: any) => `${r.user_id}|${r.book_id}`)
  );
  (progressRes.data ?? []).forEach((r: any) => {
    const b = bookMap.get(r.book_id);
    if (!b) return;
    const totalPages = (b as any).total_pages;
    if (!totalPages || r.current_page < totalPages) return;
    const key = `${r.user_id}|${r.book_id}`;
    if (completionKeys.has(key)) return;
    completionKeys.add(key);
    items.push({
      id: `rc-${r.id}`,
      kind: 'completion',
      createdAt: r.last_updated,
      userId: r.user_id,
      bookId: r.book_id,
      ...profileFor(r.user_id),
      ...bookFor(r.book_id),
    });
  });
  (personalFinishesRes.data ?? []).forEach((r: any) =>
    items.push({
      id: `pc-${r.id}`,
      kind: 'personal_completion',
      createdAt: r.finished_at,
      userId: r.user_id,
      bookTitle: r.title,
      bookAuthor: r.author,
      ...profileFor(r.user_id),
    })
  );
  (quotesRes.data ?? []).forEach((r: any) =>
    items.push({
      id: `q-${r.id}`,
      kind: 'quote',
      createdAt: r.created_at,
      userId: r.user_id,
      bookId: r.book_id,
      text: r.quote_text,
      isSpoiler: r.is_spoiler,
      ...profileFor(r.user_id),
      ...bookFor(r.book_id),
    })
  );
  (ratingsRes.data ?? []).forEach((r: any) =>
    items.push({
      id: `r-${r.id}`,
      kind: 'rating',
      createdAt: r.created_at,
      userId: r.user_id,
      bookId: r.book_id,
      rating: r.rating,
      text: r.review ?? undefined,
      ...profileFor(r.user_id),
      ...bookFor(r.book_id),
    })
  );
  (profilesRes.data ?? []).forEach((r: any) =>
    items.push({
      id: `j-${r.user_id}`,
      kind: 'join',
      createdAt: r.created_at,
      userId: r.user_id,
      displayName: r.display_name ?? 'A new reader',
      avatarUrl: r.avatar_url,
    })
  );
  (votesRes.data ?? []).forEach((r: any) =>
    items.push({
      id: `v-${r.id}`,
      kind: 'suggestion',
      createdAt: r.created_at,
      userId: r.user_id,
      bookTitle: r.suggestion_title,
      bookAuthor: r.suggestion_author,
      ...profileFor(r.user_id),
    })
  );
  (pollsRes.data ?? []).forEach((r: any) =>
    items.push({
      id: `p-${r.id}`,
      kind: 'poll',
      createdAt: r.created_at,
      text: r.question,
    })
  );
  (announcementsRes.data ?? []).forEach((r: any) =>
    items.push({
      id: `a-${r.id}`,
      kind: 'announcement',
      createdAt: r.created_at,
      text: r.title,
    })
  );

  items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return items.slice(0, FEED_LIMIT);
}

export function useActivityFeed() {
  return useQuery({
    queryKey: ['activity-feed'],
    queryFn: fetchFeed,
    staleTime: 1000 * 60,
  });
}
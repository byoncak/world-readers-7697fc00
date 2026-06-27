import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WallQuote {
  id: string;
  user_id: string;
  book_id: string;
  quote_text: string;
  page_number: number | null;
  character_name: string | null;
  is_spoiler: boolean;
  created_at: string;
  displayName: string | null;
  avatarUrl: string | null;
  bookTitle: string | null;
  bookAuthor: string | null;
  bookCover: string | null;
}

export function useAllQuotes() {
  return useQuery({
    queryKey: ['quote-wall', 'all'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<WallQuote[]> => {
      const { data: rows, error } = await supabase
        .from('book_quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      if (!rows?.length) return [];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const bookIds = [...new Set(rows.map((r) => r.book_id))];

      const [{ data: profiles }, { data: books }] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds),
        supabase.from('books').select('id, title, author, cover_url').in('id', bookIds),
      ]);

      const pMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      const bMap = new Map((books ?? []).map((b) => [b.id, b]));

      return rows.map((r) => {
        const p = pMap.get(r.user_id);
        const b = bMap.get(r.book_id);
        return {
          id: r.id,
          user_id: r.user_id,
          book_id: r.book_id,
          quote_text: r.quote_text,
          page_number: r.page_number,
          character_name: r.character_name ?? null,
          is_spoiler: r.is_spoiler,
          created_at: r.created_at,
          displayName: p?.display_name ?? null,
          avatarUrl: p?.avatar_url ?? null,
          bookTitle: b?.title ?? null,
          bookAuthor: b?.author ?? null,
          bookCover: b?.cover_url ?? null,
        };
      });
    },
  });
}
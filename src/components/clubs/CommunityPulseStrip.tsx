import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CommunityPulseStrip = () => {
  const { data: totals } = useQuery({
    queryKey: ['community-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_community_totals');
      if (error) throw error;
      return data?.[0] ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: popular = [] } = useQuery({
    queryKey: ['popular-books'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_popular_books', { _limit: 5 });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!totals && popular.length === 0) return null;

  return (
    <section aria-labelledby="pulse-heading" className="space-y-3 border-t border-border/60 pt-6">
      <h2
        id="pulse-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
      >
        Community pulse
      </h2>
      {totals && (
        <p className="font-serif text-sm italic text-muted-foreground">
          {Number(totals.total_pages_read).toLocaleString()} pages ·{' '}
          {Number(totals.total_books_finished).toLocaleString()} books ·{' '}
          {Number(totals.total_members).toLocaleString()} readers ·{' '}
          {Number(totals.total_clubs).toLocaleString()} clubs
        </p>
      )}
      {popular.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
          <ul className="flex gap-2 sm:flex-wrap">
            {popular.map((b: any, i: number) => (
              <li
                key={i}
                className="w-56 shrink-0 rounded-lg border border-border/50 bg-card/60 px-3 py-2 text-xs sm:w-auto sm:min-w-[14rem]"
              >
                <div className="truncate font-medium">{b.title}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {b.author}
                  {b.avg_rating ? ` · ★ ${Number(b.avg_rating).toFixed(1)}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default CommunityPulseStrip;

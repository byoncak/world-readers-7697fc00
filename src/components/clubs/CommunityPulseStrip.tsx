import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, BookMarked, Users, Sparkles, Star, TrendingUp } from 'lucide-react';

interface Stat {
  label: string;
  value: number;
  icon: typeof BookOpen;
  tint: string;
}

const StatCard = ({ label, value, icon: Icon, tint }: Stat) => (
  <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 shadow-[0_1px_6px_-4px_hsl(var(--warm-brown)/0.25)] transition-transform hover:-translate-y-0.5 motion-reduce:transform-none">
    <div
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
      style={{ background: tint }}
      aria-hidden
    >
      <Icon className="h-4 w-4 text-[hsl(var(--warm-brown))]" />
    </div>
    <div className="min-w-0">
      <div className="font-display text-lg font-semibold leading-tight tabular-nums truncate">
        {Number(value).toLocaleString()}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </div>
    </div>
  </div>
);

const CommunityPulseStrip = () => {
  const totalsQ = useQuery({
    queryKey: ['community-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_community_totals');
      if (error) throw error;
      return data?.[0] ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const popularQ = useQuery({
    queryKey: ['popular-books'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_popular_books', { _limit: 3 });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const totals = totalsQ.data;
  const popular = popularQ.data ?? [];
  const loading = totalsQ.isLoading || popularQ.isLoading;
  const errored = totalsQ.isError && popularQ.isError;

  if (errored) return null;

  const stats: Stat[] = totals
    ? [
        {
          label: 'Pages read',
          value: Number(totals.total_pages_read ?? 0),
          icon: BookOpen,
          tint: 'hsl(var(--peach)/0.55)',
        },
        {
          label: 'Books finished',
          value: Number(totals.total_books_finished ?? 0),
          icon: BookMarked,
          tint: 'hsl(var(--sage)/0.55)',
        },
        {
          label: 'Readers',
          value: Number(totals.total_members ?? 0),
          icon: Users,
          tint: 'hsl(var(--soft-gold)/0.55)',
        },
        {
          label: 'Clubs',
          value: Number(totals.total_clubs ?? 0),
          icon: Sparkles,
          tint: 'hsl(var(--lavender)/0.55)',
        },
      ]
    : [];

  return (
    <section aria-labelledby="pulse-heading" className="space-y-4 border-t border-border/60 pt-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-[hsl(var(--terracotta))]" aria-hidden />
        <h2 id="pulse-heading" className="font-display text-base font-semibold">
          Community pulse
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              aria-hidden
              className="h-[70px] animate-pulse rounded-2xl border border-border/60 bg-card/50"
            />
          ))}
        </div>
      ) : stats.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      ) : null}

      {popular.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-[hsl(var(--soft-gold))]" aria-hidden />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Trending with readers
            </h3>
          </div>
          <ol className="space-y-2">
            {popular.slice(0, 3).map((b: any, i: number) => (
              <li
                key={`${b.title}-${i}`}
                className="flex min-w-0 items-center gap-3 rounded-xl bg-card/60 px-3 py-2"
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--peach)/0.4)] font-display text-sm font-bold text-[hsl(var(--warm-brown))]"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{b.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{b.author}</div>
                </div>
                {b.avg_rating ? (
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--soft-gold)/0.2)] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--warm-brown))]"
                    aria-label={`Average rating ${Number(b.avg_rating).toFixed(1)} out of 5`}
                  >
                    <Star className="h-3 w-3 fill-current" aria-hidden />
                    {Number(b.avg_rating).toFixed(1)}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};

export default CommunityPulseStrip;

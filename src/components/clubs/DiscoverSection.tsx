import { useMemo, useState, useId } from 'react';
import { ChevronDown, Search, Compass } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PublicClubCard from './PublicClubCard';

interface Props {
  publicClubs: any[];
  memberCounts: Record<string, number>;
  myClubIds: Set<string>;
  onJoin: (clubId: string, policy: 'instant' | 'approval', cap: number | null) => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

type SortKey = 'newest' | 'members';
type SizeKey = 'any' | 'small' | 'medium' | 'open';

const DiscoverSection = ({
  publicClubs,
  memberCounts,
  myClubIds,
  onJoin,
  open: controlledOpen,
  onOpenChange,
}: Props) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setUncontrolledOpen(v);
  };
  const [query, setQuery] = useState('');
  const [size, setSize] = useState<SizeKey>('any');
  const [sort, setSort] = useState<SortKey>('newest');
  const regionId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = publicClubs.filter((c: any) => {
      if (q) {
        const hay = `${c.name} ${c.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const count = memberCounts[c.id] ?? 0;
      if (size === 'small' && !(count < 10)) return false;
      if (size === 'medium' && !(count >= 10 && count < 50)) return false;
      if (size === 'open') {
        if (c.member_cap && count >= c.member_cap) return false;
      }
      return true;
    });
    if (sort === 'members') {
      list = [...list].sort(
        (a: any, b: any) => (memberCounts[b.id] ?? 0) - (memberCounts[a.id] ?? 0),
      );
    }
    return list;
  }, [publicClubs, memberCounts, query, size, sort]);

  return (
    <section aria-labelledby={`${regionId}-h`} className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`${regionId}-body`}
        data-discover-heading
        className="flex w-full items-center justify-between gap-2 border-b border-border/60 pb-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="h-4 w-4 shrink-0 text-[hsl(var(--terracotta))]" aria-hidden />
          <h2
            id={`${regionId}-h`}
            className="font-display text-base font-semibold text-foreground"
          >
            Find a club
          </h2>
          <span className="text-xs text-muted-foreground shrink-0">{publicClubs.length} public</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div id={`${regionId}-body`} role="region" aria-labelledby={`${regionId}-h`} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search public clubs"
                aria-label="Search public clubs"
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select value={size} onValueChange={(v) => setSize(v as SizeKey)}>
                <SelectTrigger aria-label="Filter by size" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any size</SelectItem>
                  <SelectItem value="small">Under 10</SelectItem>
                  <SelectItem value="medium">10–49</SelectItem>
                  <SelectItem value="open">Open spots</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger aria-label="Sort" className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="members">Most members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
              No public clubs match those filters yet.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filtered.map((c: any) => (
                <li key={c.id}>
                  <PublicClubCard
                    club={c}
                    memberCount={memberCounts[c.id] ?? 0}
                    joined={myClubIds.has(c.id)}
                    onJoin={() => onJoin(c.id, c.join_policy, c.member_cap)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export default DiscoverSection;

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import UserAvatar from '@/components/UserAvatar';
import StyledName from '@/components/StyledName';

export interface FacePileAttendee {
  userId: string;
  createdAt?: string | null;
}

export interface FacePileProfileInfo {
  display_name: string | null;
  avatar_url: string | null;
}

interface AttendeeFacePileProps {
  /** Deterministically ordered attendee list (current user first when applicable). */
  attendees: FacePileAttendee[];
  /** Cached profile map; missing entries are fetched lazily when the modal opens. */
  profiles: Map<string, FacePileProfileInfo>;
  /** Called when new profiles are fetched so parents can cache them. */
  onProfilesLoaded?: (map: Map<string, FacePileProfileInfo>) => void;
  /** Text label used after the count, e.g. "attending". */
  label?: string;
  /** Title for the expanded modal. */
  modalTitle?: string;
  /** Optional subtitle/description in the modal (e.g. meeting name). */
  modalSubtitle?: string;
  /** Chunk size when paginating the list inside the modal. */
  chunkSize?: number;
}

/**
 * Compute how many overlapping avatars to render before showing a +N chip.
 * ~4 on narrow mobile, ~6 on tablet/wide mobile, up to 8 on desktop.
 */
function useVisibleCount(): number {
  const compute = () => {
    if (typeof window === 'undefined') return 4;
    const w = window.innerWidth;
    if (w >= 1024) return 8;
    if (w >= 640) return 6;
    return 4;
  };
  const [n, setN] = useState<number>(compute);
  useEffect(() => {
    const onResize = () => setN(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return n;
}

const AttendeeFacePile = ({
  attendees,
  profiles,
  onProfilesLoaded,
  label = 'attending',
  modalTitle = 'Attendees',
  modalSubtitle,
  chunkSize = 50,
}: AttendeeFacePileProps) => {
  const isMobile = useIsMobile();
  const visibleCount = useVisibleCount();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [renderLimit, setRenderLimit] = useState(chunkSize);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const total = attendees.length;
  const overflow = Math.max(0, total - visibleCount);
  const visible = attendees.slice(0, visibleCount);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSearch('');
      setRenderLimit(chunkSize);
    }
  };

  // Lazy-load missing profiles when the modal opens (one batched query).
  useEffect(() => {
    if (!open || !onProfilesLoaded) return;
    const missing = attendees
      .map((a) => a.userId)
      .filter((id) => !profiles.has(id));
    if (missing.length === 0) return;
    let cancelled = false;
    setLoadingProfiles(true);
    (async () => {
      const merged = new Map(profiles);
      // Chunk the .in() query to avoid huge URLs on very large clubs.
      for (let i = 0; i < missing.length; i += 200) {
        const slice = missing.slice(i, i + 200);
        const { data } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', slice);
        (data ?? []).forEach((p: any) => {
          merged.set(p.user_id, {
            display_name: p.display_name ?? null,
            avatar_url: p.avatar_url ?? null,
          });
        });
      }
      if (!cancelled) {
        onProfilesLoaded(merged);
        setLoadingProfiles(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, attendees, profiles, onProfilesLoaded]);

  const filtered = useMemo(() => {
    if (!search.trim()) return attendees;
    const q = search.trim().toLowerCase();
    return attendees.filter((a) => {
      const name = profiles.get(a.userId)?.display_name ?? 'Reader';
      return name.toLowerCase().includes(q);
    });
  }, [attendees, profiles, search]);

  const paginated = filtered.slice(0, renderLimit);
  const canLoadMore = filtered.length > paginated.length;

  const loadMore = useCallback(() => {
    setRenderLimit((n) => n + chunkSize);
  }, [chunkSize]);

  if (total === 0) return null;

  const ariaLabel = `View ${total} ${label}`;

  const triggerButton = (
    <button
      type="button"
      onClick={() => handleOpenChange(true)}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      className="group inline-flex items-center gap-2 min-h-11 rounded-full pl-1 pr-3 py-1 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors max-w-full"
    >
      <div className="flex -space-x-2 shrink-0" aria-hidden="true">
        {visible.map((a) => {
          const prof = profiles.get(a.userId);
          return (
            <div
              key={a.userId}
              className="rounded-full ring-2 ring-card"
              title={prof?.display_name ?? 'Reader'}
            >
              <UserAvatar
                userId={a.userId}
                avatarUrl={prof?.avatar_url ?? null}
                displayName={prof?.display_name ?? null}
                size="sm"
                className="!h-8 !w-8 !text-[10px]"
                linkToProfile={false}
              />
            </div>
          );
        })}
        {overflow > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-card bg-muted text-[10px] font-body font-bold text-muted-foreground shrink-0">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-xs font-body font-semibold text-foreground whitespace-nowrap truncate">
        {total} {label}
      </span>
    </button>
  );

  const list = (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      {attendees.length > 8 && (
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search attendees…"
            aria-label="Search attendees"
            className="pl-9"
          />
        </div>
      )}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body py-6 text-center">
            {loadingProfiles ? 'Loading…' : 'No matches.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {paginated.map((a) => {
              const prof = profiles.get(a.userId);
              const name = prof?.display_name ?? 'Reader';
              return (
                <li key={a.userId} className="flex items-center gap-3">
                  <UserAvatar
                    userId={a.userId}
                    avatarUrl={prof?.avatar_url ?? null}
                    displayName={prof?.display_name ?? null}
                    size="sm"
                    className="!h-9 !w-9 !text-xs"
                  />
                  <StyledName
                    userId={a.userId}
                    name={name}
                    className="text-sm font-body text-foreground truncate"
                  />
                </li>
              );
            })}
          </ul>
        )}
        {canLoadMore && (
          <button
            type="button"
            onClick={loadMore}
            className="mt-3 w-full rounded-lg border border-border py-2 text-xs font-body font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Load more ({filtered.length - paginated.length} remaining)
          </button>
        )}
      </div>
      <p className="shrink-0 text-center text-[11px] font-body text-muted-foreground">
        {total} {label}
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] flex flex-col gap-4 rounded-t-2xl px-5 pb-6 pt-5"
          >
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="font-display text-lg">{modalTitle}</SheetTitle>
              {modalSubtitle && (
                <p className="text-xs font-body text-muted-foreground">{modalSubtitle}</p>
              )}
            </SheetHeader>
            {list}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {triggerButton}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col gap-4">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="font-display">{modalTitle}</DialogTitle>
            {modalSubtitle && (
              <p className="text-xs font-body text-muted-foreground">{modalSubtitle}</p>
            )}
          </DialogHeader>
          {list}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttendeeFacePile;

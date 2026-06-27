import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, PartyPopper, BookOpen, Star, Flame } from 'lucide-react';

const REACTIONS = [
  { key: 'heart', Icon: Heart },
  { key: 'party', Icon: PartyPopper },
  { key: 'book', Icon: BookOpen },
  { key: 'star', Icon: Star },
  { key: 'fire', Icon: Flame },
] as const;

const EXTRAS = REACTIONS.slice(1);
const ICON_BY_KEY: Record<string, typeof Heart> = REACTIONS.reduce(
  (acc, r) => ({ ...acc, [r.key]: r.Icon }),
  {} as Record<string, typeof Heart>,
);

interface ReactionCounts {
  [type: string]: { count: number; byMe: boolean };
}

interface Props {
  activityId: string;
}

const ActivityReactions = ({ activityId }: Props) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<ReactionCounts>({});
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from('activity_reactions' as any)
      .select('reaction_type, user_id')
      .eq('activity_id', activityId);

    if (!data) return;
    const map: ReactionCounts = {};
    (data as any[]).forEach((r) => {
      if (!map[r.reaction_type]) map[r.reaction_type] = { count: 0, byMe: false };
      map[r.reaction_type].count++;
      if (r.user_id === user?.id) map[r.reaction_type].byMe = true;
    });
    setCounts(map);
  }, [activityId, user?.id]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const toggle = async (type: string) => {
    if (!user) return;
    const existing = counts[type]?.byMe;

    setCounts((prev) => {
      const cur = prev[type] || { count: 0, byMe: false };
      return {
        ...prev,
        [type]: {
          count: existing ? Math.max(0, cur.count - 1) : cur.count + 1,
          byMe: !existing,
        },
      };
    });

    if (existing) {
      await supabase
        .from('activity_reactions' as any)
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', user.id)
        .eq('reaction_type', type);
    } else {
      await supabase.from('activity_reactions' as any).insert({
        activity_id: activityId,
        user_id: user.id,
        reaction_type: type,
      } as any);
    }
  };

  const stop = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if ('preventDefault' in e) e.preventDefault();
  };

  const myKey = REACTIONS.find((r) => counts[r.key]?.byMe)?.key;
  const reactedKeys = REACTIONS.filter((r) => (counts[r.key]?.count ?? 0) > 0);
  const isActive = !!myKey;

  const longPressTimer = useRef<number | null>(null);
  const longPressedRef = useRef(false);
  const startLongPress = () => {
    longPressedRef.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressedRef.current = true;
      setOpen(true);
    }, 350);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          stop(e);
          if (longPressedRef.current) {
            longPressedRef.current = false;
            return;
          }
          if (open) {
            setOpen(false);
            return;
          }
          toggle(myKey ?? 'heart');
        }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className={`relative z-10 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-all
          ${isActive ? 'bg-terracotta/20 text-terracotta' : 'text-muted-foreground hover:bg-muted'}
          select-none touch-manipulation`}
        aria-label="React"
      >
        <Heart className={`h-4 w-4 ${counts['heart']?.byMe ? 'fill-terracotta' : ''}`} />
        {counts['heart']?.count ? <span>{counts['heart'].count}</span> : null}
      </button>

      {!open && reactedKeys.filter((r) => r.key !== 'heart').length > 0 && (
        <div className="inline-flex items-center gap-1">
          {reactedKeys
            .filter((r) => r.key !== 'heart')
            .map(({ key, Icon }) => {
              const c = counts[key];
              const active = c?.byMe;
              return (
                <button
                  key={key}
                  onClick={(e) => {
                    stop(e);
                    toggle(key);
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-all
                    ${active ? 'bg-terracotta/20 text-terracotta' : 'text-muted-foreground hover:bg-muted'}
                    select-none touch-manipulation`}
                  aria-label={key}
                >
                  <Icon className={`h-4 w-4 ${active ? 'fill-terracotta' : ''}`} />
                  <span>{c.count}</span>
                </button>
              );
            })}
        </div>
      )}

      <div
        className="inline-flex items-center gap-1 overflow-visible"
        style={{
          maxWidth: open ? `${EXTRAS.length * 44}px` : '0px',
          opacity: open ? 1 : 0,
          transform: open ? 'translateX(0) scale(1)' : 'translateX(-8px) scale(0.6)',
          transformOrigin: 'left center',
          transition: open
            ? 'max-width 450ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease-out, transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'max-width 250ms ease-in, opacity 150ms ease-in, transform 250ms ease-in',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {EXTRAS.map(({ key, Icon }, i) => {
          const c = counts[key];
          const active = c?.byMe;
          return (
            <button
              key={key}
              onClick={(e) => {
                stop(e);
                toggle(key);
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-all
                ${active ? 'bg-terracotta/20 text-terracotta' : 'text-muted-foreground hover:bg-muted'}
                select-none touch-manipulation`}
              style={{
                transitionDelay: open
                  ? `${i * 40}ms`
                  : `${(EXTRAS.length - 1 - i) * 40}ms`,
                transform: open ? 'scale(1)' : 'scale(0.5)',
                opacity: open ? 1 : 0,
                transitionProperty: 'transform, opacity, background-color, color',
                transitionDuration: '400ms',
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              aria-label={key}
            >
              <Icon className={`h-4 w-4 ${active ? 'fill-terracotta' : ''}`} />
              {c && c.count > 0 && <span>{c.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityReactions;
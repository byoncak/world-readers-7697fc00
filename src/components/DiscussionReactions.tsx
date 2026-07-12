import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { ThumbsUp, ThumbsDown, Heart } from 'lucide-react';


const EXTRA_EMOJIS = ['😮', '😂', '😡', '😭', '🔥'] as const;
const REACTION_TYPES = ['thumbsup', 'thumbsdown', 'heart', ...EXTRA_EMOJIS] as const;

interface ReactionCounts {
  [type: string]: { count: number; byMe: boolean };
}

interface Props {
  discussionId: string;
}

const DiscussionReactions = ({ discussionId }: Props) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<ReactionCounts>({});
  const [showExtras, setShowExtras] = useState(false);
  const [extrasAlign, setExtrasAlign] = useState<'left' | 'right'>('right');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressHeartClick = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const heartWrapRef = useRef<HTMLDivElement>(null);

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from('discussion_reactions')
      .select('reaction_type, user_id')
      .eq('discussion_id', discussionId);

    if (!data) return;
    const map: ReactionCounts = {};
    data.forEach((r: any) => {
      if (!map[r.reaction_type]) map[r.reaction_type] = { count: 0, byMe: false };
      map[r.reaction_type].count++;
      if (r.user_id === user?.id) map[r.reaction_type].byMe = true;
    });
    setCounts(map);
  }, [discussionId, user?.id]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const toggle = async (type: string) => {
    if (!user) return;
    const existing = counts[type]?.byMe;

    // Optimistic update
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
        .from('discussion_reactions')
        .delete()
        .eq('discussion_id', discussionId)
        .eq('user_id', user.id)
        .eq('reaction_type', type);
    } else {
      const { error } = await supabase.from('discussion_reactions').insert({
        discussion_id: discussionId,
        user_id: user.id,
        reaction_type: type,
      } as any);
      if (!error) {
        // Points animation handled automatically via usePoints realtime
      }
    }
    setShowExtras(false);
  };

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      suppressHeartClick.current = true;
      // Decide popup alignment based on available space
      const rect = heartWrapRef.current?.getBoundingClientRect();
      if (rect) {
        const popupWidth = 220; // approx width of emoji popup
        const spaceRight = window.innerWidth - rect.right;
        // If anchoring right (popup grows leftward) would overflow left edge, flip to left anchor
        if (rect.right - popupWidth < 8 && spaceRight + rect.width > popupWidth) {
          setExtrasAlign('left');
        } else {
          setExtrasAlign('right');
        }
      }
      setShowExtras(true);
    }, 400);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Close extras on click outside
  useEffect(() => {
    if (!showExtras) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowExtras(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExtras]);

  const ReactionBtn = ({
    type,
    children,
    className = '',
  }: {
    type: string;
    children: React.ReactNode;
    className?: string;
  }) => {
    const c = counts[type];
    const active = c?.byMe;
    return (
      <button
        onClick={() => toggle(type)}
        onContextMenu={(e) => e.preventDefault()}
        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-all
          ${active ? 'bg-terracotta/20 text-terracotta font-semibold' : 'text-muted-foreground hover:bg-muted'}
          select-none touch-manipulation [-webkit-touch-callout:none]
          ${className}`}
        aria-label={type}
      >
        {children}
        {c && c.count > 0 && <span>{c.count}</span>}
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-0.5 mt-1">
      <ReactionBtn type="thumbsup">
        <ThumbsUp className="h-3.5 w-3.5" />
      </ReactionBtn>
      <ReactionBtn type="thumbsdown">
        <ThumbsDown className="h-3.5 w-3.5" />
      </ReactionBtn>

      {/* Heart with long-press */}
      <div className="relative" ref={heartWrapRef}>
        <button
          onClick={() => {
            if (suppressHeartClick.current) {
              suppressHeartClick.current = false;
              return;
            }
            toggle('heart');
          }}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onContextMenu={(e) => e.preventDefault()}
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-all
            ${counts['heart']?.byMe ? 'bg-terracotta/20 text-terracotta font-semibold' : 'text-muted-foreground hover:bg-muted'}
            select-none touch-manipulation [-webkit-touch-callout:none]`}
          aria-label="heart"
        >
          <Heart className={`h-3.5 w-3.5 ${counts['heart']?.byMe ? 'fill-terracotta' : ''}`} />
          {counts['heart'] && counts['heart'].count > 0 && <span>{counts['heart'].count}</span>}
        </button>

        {/* Extra emoji popup */}
        {showExtras && (
          <div className={`absolute bottom-full ${extrasAlign === 'right' ? 'right-0' : 'left-0'} mb-1.5 flex gap-1 rounded-full bg-card border border-border shadow-lg px-2 py-1 animate-in fade-in zoom-in-90 duration-150 z-50 select-none [-webkit-touch-callout:none]`}>
            {EXTRA_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggle(emoji)}
                onContextMenu={(e) => e.preventDefault()}
                className={`text-base hover:scale-125 transition-transform p-0.5 rounded
                  ${counts[emoji]?.byMe ? 'bg-terracotta/20' : ''} select-none touch-manipulation [-webkit-touch-callout:none]`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Show extra emoji counts inline if they have reactions */}
      {Object.keys(counts)
        .filter((type) => (EXTRA_EMOJIS as readonly string[]).includes(type) && counts[type].count > 0)
        .map((emoji) => (
          <ReactionBtn key={emoji} type={emoji}>
            <span className="text-sm leading-none">{emoji}</span>
          </ReactionBtn>
        ))}
    </div>
  );
};

export default DiscussionReactions;

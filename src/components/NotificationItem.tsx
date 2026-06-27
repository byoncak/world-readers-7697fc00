import { memo, useRef, useState } from 'react';
import { Bell, BookOpenCheck, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FeedItem {
  id: string;
  type: 'announcement' | 'discussion_post' | 'discussion_reply' | 'new_member' | 'rsvp_poll' | 'rsvp_vote';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface NotificationItemProps {
  item: FeedItem;
  onClick: () => void;
  onDismiss: () => void;
}

const SWIPE_THRESHOLD = 80;

const NotificationItem = memo(({ item, onClick, onDismiss }: NotificationItemProps) => {
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);
  const elRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    swiping.current = true;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    swiping.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!swiping.current) return;
      currentX.current = ev.clientX;
      const dx = currentX.current - startX.current;
      setOffset(Math.min(0, dx));
    };
    const onUp = () => {
      swiping.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      finalize();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current) return;
    currentX.current = e.touches[0].clientX;
    const dx = currentX.current - startX.current;
    setOffset(Math.min(0, dx));
  };

  const onTouchEnd = () => {
    swiping.current = false;
    finalize();
  };

  const finalize = () => {
    if (offset < -SWIPE_THRESHOLD) {
      setDismissed(true);
      setTimeout(() => onDismiss(), 200);
    } else {
      setOffset(0);
    }
  };

  const icon = item.type === 'discussion_post' || item.type === 'discussion_reply'
    ? <MessageCircle className="h-3.5 w-3.5 text-terracotta shrink-0 mt-0.5" />
    : item.type === 'rsvp_poll' || item.type === 'rsvp_vote'
    ? <BookOpenCheck className="h-3.5 w-3.5 text-terracotta shrink-0 mt-0.5" />
    : <Bell className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />;

  return (
    <div
      ref={elRef}
      className={`relative overflow-hidden transition-all ${dismissed ? 'max-h-0 opacity-0' : 'max-h-40'}`}
      style={{ transitionDuration: dismissed ? '200ms' : '0ms' }}
    >
      {/* Red background revealed on swipe */}
      <div className="absolute inset-0 bg-destructive/20 flex items-center justify-end pr-4">
        <span className="text-xs font-semibold text-destructive">Dismiss</span>
      </div>

      <div
        className={`relative bg-card p-3 ${!item.read ? 'bg-primary/5' : ''} ${item.type !== 'announcement' ? 'cursor-pointer' : ''}`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping.current ? 'none' : 'transform 200ms ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onClick={() => {
          if (Math.abs(offset) < 5) onClick();
        }}
      >
        <div className="flex gap-2">
          {icon}
          <div className="min-w-0">
            <p className="font-serif text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-foreground/70 font-body line-clamp-2 mt-0.5">{item.message}</p>
            <p className="text-[10px] text-muted-foreground font-body mt-1">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

NotificationItem.displayName = 'NotificationItem';

export default NotificationItem;

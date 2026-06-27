import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useDailyLoginReward } from '@/hooks/useDailyLoginReward';
import { useNavigate } from 'react-router-dom';
import NotificationItem from './NotificationItem';
import DailyRewardClaim from './DailyRewardClaim';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

interface FeedItem {
  id: string;
  type: 'announcement' | 'discussion_post' | 'discussion_reply' | 'new_member' | 'rsvp_poll' | 'rsvp_vote';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  link?: string | null;
}

const DISMISSED_STORAGE_PREFIX = 'dismissed-notification-keys';

const getDismissedStorageKey = (userId: string) => `${DISMISSED_STORAGE_PREFIX}:${userId}`;

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { supported, permission, subscribe } = usePushNotifications();
  const { claimable, claiming, claim } = useDailyLoginReward();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<FeedItem | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dismissedIds = useRef<Set<string>>(new Set());

  const persistDismissedIds = useCallback(() => {
    if (!user) return;

    try {
      const storageKey = getDismissedStorageKey(user.id);
      const values = Array.from(dismissedIds.current).slice(-500);
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      // Ignore storage write errors
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [{ data: ann }, { data: reads }, { data: notifs }] = await Promise.all([
      supabase
        .from('announcements')
        .select('id, title, message, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id),
      supabase
        .from('notifications')
        .select('id, type, title, message, created_at, read, link')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const readSet = new Set((reads ?? []).map((r: any) => r.announcement_id));

    const annItems: FeedItem[] = (ann ?? []).map((a: any) => ({
      id: a.id,
      type: 'announcement' as const,
      title: a.title,
      message: a.message,
      created_at: a.created_at,
      read: readSet.has(a.id),
    }));

    const notifItems: FeedItem[] = (notifs ?? []).map((n: any) => ({
      id: n.id,
      type: n.type as FeedItem['type'],
      title: n.title,
      message: n.message,
      created_at: n.created_at,
      read: n.read,
      link: n.link,
    }));

    const merged = [...annItems, ...notifItems]
      .filter((i) => !dismissedIds.current.has(`${i.type}-${i.id}`))
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    setItems(merged);
  };

  useEffect(() => {
    if (!user) {
      dismissedIds.current = new Set();
      setItems([]);
      return;
    }

    try {
      const storageKey = getDismissedStorageKey(user.id);
      const raw = localStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      dismissedIds.current = new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
    } catch {
      dismissedIds.current = new Set();
    }

    fetchData();

    // Debounce realtime refetches: bursts of events trigger ONE fetch.
    let debounceTimer: number | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        fetchData();
      }, 300);
    };

    const ch1 = supabase
      .channel('announcements-bell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, debouncedFetch)
      .subscribe();

    // Filter on user_id so we don't receive every other user's notifications.
    const ch2 = supabase
      .channel(`notifications-bell-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        debouncedFetch
      )
      .subscribe();

    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = items.filter((i) => !i.read).length + (claimable ? 1 : 0);

  const handleClaim = async () => {
    await claim();
  };

  const markAllRead = async () => {
    if (!user) return;

    const unreadAnn = items.filter((i) => i.type === 'announcement' && !i.read);
    const unreadNotif = items.filter((i) => i.type !== 'announcement' && !i.read);

    const promises = [];

    if (unreadAnn.length > 0) {
      const rows = unreadAnn.map((a) => ({ announcement_id: a.id, user_id: user.id }));
      promises.push(
        supabase.from('announcement_reads').upsert(rows, { onConflict: 'announcement_id,user_id' }).select().then(() => {})
      );
    }

    if (unreadNotif.length > 0) {
      const ids = unreadNotif.map((n) => n.id);
      promises.push(
        supabase.from('notifications').update({ read: true }).in('id', ids).select().then(() => {})
      );
    }

    await Promise.all(promises);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) markAllRead();
  };

  const handleEnablePush = async () => {
    setEnabling(true);
    await subscribe();
    setEnabling(false);
  };

  const handleItemClick = (item: FeedItem) => {
    if (item.type === 'announcement') {
      setActiveAnnouncement(item);
      setOpen(false);
      return;
    }
    setOpen(false);
    if (item.link) {
      const resolvedLink = item.link
        .replace(/^\/profile\//, '/member/')
        .replace(/^\/community(\/|$|\?)/, '/lounge$1');
      navigate(resolvedLink);
    } else {
      navigate('/lounge');
    }
  };

  const handleDismiss = useCallback(async (item: FeedItem) => {
    const key = `${item.type}-${item.id}`;
    dismissedIds.current.add(key);
    persistDismissedIds();
    setItems((prev) => prev.filter((i) => !(i.id === item.id && i.type === item.type)));
    
    if (!user) return;
    if (item.type === 'announcement') {
      await supabase.from('announcement_reads').upsert(
        { announcement_id: item.id, user_id: user.id },
        { onConflict: 'announcement_id,user_id' }
      );
    } else {
      await supabase.from('notifications').update({ read: true }).eq('id', item.id);
    }
  }, [user, persistDismissedIds]);

  const showPushOpt = supported && permission !== 'granted' && permission !== 'denied';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="cozy-btn-ghost relative p-2"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-2 sm:absolute sm:right-0 top-[env(safe-area-inset-top,0px)] mt-14 sm:mt-0 sm:top-full sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-[60]">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="font-serif font-semibold text-sm">Notifications</h3>
          </div>

          {showPushOpt && (
            <div className="p-3 border-b border-border">
              <button
                onClick={handleEnablePush}
                disabled={enabling}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-terracotta px-4 py-2.5 text-sm font-body font-semibold text-white hover:bg-terracotta/90 transition-colors disabled:opacity-50"
              >
                <Bell className="h-4 w-4" />
                {enabling ? 'Setting up…' : 'Enable Push Notifications'}
              </button>
            </div>
          )}

          {claimable && (
            <DailyRewardClaim claiming={claiming} onClaim={handleClaim} />
          )}

          {items.length === 0 && !claimable ? (
            <p className="p-4 text-sm text-muted-foreground font-body text-center">No notifications yet.</p>
          ) : (
            <div className="divide-y divide-border overflow-hidden">
              {items.map((item) => (
                <NotificationItem
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onClick={() => handleItemClick(item)}
                  onDismiss={() => handleDismiss(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!activeAnnouncement} onOpenChange={(o) => !o && setActiveAnnouncement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-left">{activeAnnouncement?.title}</DialogTitle>
            {activeAnnouncement && (
              <DialogDescription className="text-left font-body text-xs">
                {formatDistanceToNow(new Date(activeAnnouncement.created_at), { addSuffix: true })}
              </DialogDescription>
            )}
          </DialogHeader>
          <p className="text-sm font-body text-foreground/90 whitespace-pre-wrap">
            {activeAnnouncement?.message}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationBell;

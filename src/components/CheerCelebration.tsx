import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

interface QueuedCheer {
  id: string;
  message: string;
  fromUserId: string;
}

const CELEBRATION_EMOJIS = ['👏', '🎉', '✨', '📖', '🏁', '🎯', '☕', '💪', '🔥', '⭐', '🌟', '💫'];
const SEEN_CHEERS_KEY_PREFIX = 'seen-cheer-ids';
const MAX_SEEN = 200;

const getSeenStorageKey = (userId: string) => `${SEEN_CHEERS_KEY_PREFIX}:${userId}`;

const CheerCelebration = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [senderName, setSenderName] = useState<string | null>(null);
  const pendingQueue = useRef<QueuedCheer[]>([]);
  const playing = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const getSeenCheers = useCallback((): Set<string> => {
    if (!userId) return new Set();
    try {
      const raw = localStorage.getItem(getSeenStorageKey(userId));
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }, [userId]);

  const persistSeenCheers = useCallback((seen: Set<string>) => {
    if (!userId) return;
    try {
      localStorage.setItem(getSeenStorageKey(userId), JSON.stringify(Array.from(seen).slice(-MAX_SEEN)));
    } catch {
      // Ignore storage write errors
    }
  }, [userId]);

  const markCheersSeen = useCallback((ids: string[]) => {
    if (!userId || ids.length === 0) return;
    const seen = getSeenCheers();
    ids.forEach((id) => seen.add(id));
    persistSeenCheers(seen);
  }, [userId, getSeenCheers, persistSeenCheers]);

  const spawnCelebration = useCallback(async (cheerMessage: string, fromUserId?: string) => {
    let name: string | null = null;
    if (fromUserId) {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', fromUserId)
        .single();
      if (data?.display_name) {
        name = data.display_name.split(' ')[0];
      }
    }

    const newEmojis: FloatingEmoji[] = Array.from({ length: 24 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      emoji: CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)],
      x: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 2,
      size: 16 + Math.random() * 24,
    }));

    setEmojis(newEmojis);
    setMessage(cheerMessage);
    setSenderName(name);
  }, []);

  const playNext = useCallback(() => {
    if (playing.current) return;

    const next = pendingQueue.current.shift();
    if (!next) return;

    playing.current = true;
    void spawnCelebration(next.message, next.fromUserId);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setEmojis([]);
      setMessage(null);
      setSenderName(null);
      playing.current = false;
      playNext();
    }, 5000);
  }, [spawnCelebration]);

  const checkUnseen = useCallback(async () => {
    if (!userId) return;

    const { data: cheers } = await supabase
      .from('cheers')
      .select('id, message, from_user_id')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!cheers || cheers.length === 0) return;

    const seen = getSeenCheers();
    const unseen = cheers.filter((c) => !seen.has(c.id));
    if (unseen.length === 0) return;

    // Prevent replay loops: mark all unseen immediately, then play only the newest pending cheer
    markCheersSeen(unseen.map((c) => c.id));
    const newest = unseen[0];

    pendingQueue.current.push({
      id: newest.id,
      message: newest.message,
      fromUserId: newest.from_user_id,
    });

    playNext();
  }, [userId, getSeenCheers, markCheersSeen, playNext]);

  useEffect(() => {
    if (!userId) return;

    checkUnseen();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkUnseen();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleLocalCheer = (event: Event) => {
      const customEvent = event as CustomEvent<{ toUserId?: string; message?: string; fromUserId?: string }>;
      if (customEvent.detail?.toUserId === userId && customEvent.detail.message && customEvent.detail.fromUserId) {
        pendingQueue.current.push({
          id: `local-${Date.now()}`,
          message: customEvent.detail.message,
          fromUserId: customEvent.detail.fromUserId,
        });
        playNext();
      }
    };

    window.addEventListener('cheer:local', handleLocalCheer as EventListener);

    const channel = supabase
      .channel(`cheer-celebrations-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cheers' },
        (payload) => {
          const cheer = payload.new as { id: string; to_user_id: string; from_user_id: string; message: string };
          if (cheer.to_user_id !== userId) return;

          markCheersSeen([cheer.id]);
          pendingQueue.current.push({
            id: cheer.id,
            message: cheer.message,
            fromUserId: cheer.from_user_id,
          });
          playNext();
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('cheer:local', handleLocalCheer as EventListener);
      supabase.removeChannel(channel);
      pendingQueue.current = [];
      playing.current = false;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [userId, checkUnseen, markCheersSeen, playNext]);

  if (emojis.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {emojis.map((e) => (
        <span
          key={e.id}
          className="absolute animate-cheer-float"
          style={{
            left: `${e.x}%`,
            bottom: '-40px',
            fontSize: `${e.size}px`,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
          }}
        >
          {e.emoji}
        </span>
      ))}

      {message && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 animate-cheer-banner">
          <div className="cozy-card bg-background/95 backdrop-blur-sm px-8 py-4 shadow-xl border-2 border-soft-gold/40 text-center">
            <p className="text-2xl mb-1">👏</p>
            <p className="font-display text-lg font-bold text-foreground">{message}</p>
            {senderName && <p className="mt-1 text-sm italic text-muted-foreground font-serif">–{senderName}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheerCelebration;

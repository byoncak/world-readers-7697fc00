import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StickyNote, Send } from 'lucide-react';
import StyledName from './StyledName';
import { formatDistanceToNow } from 'date-fns';
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/StateBlock';

interface Message {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles: { display_name: string | null } | null;
}

const pastelColors = [
  'bg-peach',
  'bg-sage',
  'bg-lavender',
  'bg-cream',
];

const CommunityBoardWidget = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchMessages = useCallback(async () => {
    setError(false);
    const { data, error: fetchErr } = await supabase
      .from('messages')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (fetchErr) {
      setError(true);
    } else if (data) {
      setMessages(data as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
    let timer: number | null = null;
    const debounced = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        fetchMessages();
      }, 300);
    };
    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, debounced)
      .subscribe();
    return () => {
      if (timer) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    await supabase.from('messages').insert({
      user_id: user.id,
      message: newMessage.trim(),
    });
    setNewMessage('');
  };

  return (
    <div className="cozy-card">
      <div className="mb-4 flex items-center gap-2">
        <StickyNote className="h-5 w-5 text-soft-gold" aria-hidden="true" />
        <h2 className="cozy-title text-2xl">Community Board</h2>
      </div>

      <form onSubmit={sendMessage} className="mb-4 flex gap-2">
        <label htmlFor="community-board-note" className="sr-only">Pin a note</label>
        <input
          id="community-board-note"
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Pin a note..."
          className="cozy-input flex-1"
        />
        <button
          type="submit"
          className="cozy-btn-primary flex items-center gap-1"
          aria-label="Pin note to the board"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      {loading ? (
        <LoadingBlock label="Loading notes…" rows={3} />
      ) : error ? (
        <ErrorBlock message="Couldn't load the board." onRetry={fetchMessages} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {messages.length === 0 ? (
            <div className="col-span-full">
              <EmptyBlock message="The board is empty. Pin something! 📌" />
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={m.id} className={`post-it ${pastelColors[i % pastelColors.length]}`}>
                <p className="text-sm font-body leading-relaxed">{m.message}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <StyledName userId={m.user_id} name={(m.profiles as any)?.display_name || 'Reader'} className="font-semibold" />
                  <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityBoardWidget;

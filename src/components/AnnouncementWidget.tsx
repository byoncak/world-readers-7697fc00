import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Megaphone, Trash2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';


interface Announcement {
  id: string;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
  profiles?: { display_name: string | null } | null;
}

const AnnouncementWidget = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data) return;

    // Fetch creator names
    const userIds = [...new Set(data.map((a: any) => a.created_by))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));

    setAnnouncements(
      data.map((a: any) => ({
        ...a,
        profiles: { display_name: profileMap.get(a.created_by) ?? null },
      }))
    );
  };

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('announcements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAnnouncements)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !message.trim()) return;

    setSending(true);
    const { error } = await supabase.from('announcements').insert({
      title: title.trim(),
      message: message.trim(),
      created_by: user.id,
    });

    if (error) {
      toast({ title: 'Error', description: 'Could not post announcement.', variant: 'destructive' });
    } else {
      toast({ title: 'Announced! 📢', description: 'Your announcement has been posted.' });
      setTitle('');
      setMessage('');

      // Try to send push notifications via edge function
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: { title: title.trim(), message: message.trim() },
        });
      } catch {
        // Push is best-effort
      }
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3 mb-5">
        <Input
          placeholder="Announcement title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="font-body"
          maxLength={120}
        />
        <Textarea
          placeholder="Write your announcement…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="font-body min-h-[80px]"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={sending || !title.trim() || !message.trim()}
          className="cozy-btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? 'Posting…' : 'Post Announcement'}
        </button>
      </form>

      <div className="space-y-3">
        {announcements.length === 0 && (
          <p className="text-sm text-muted-foreground font-body text-center py-4">No announcements yet.</p>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="rounded-xl border border-border p-4 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-serif font-semibold text-sm">{a.title}</h3>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm font-body text-foreground/80 whitespace-pre-wrap">{a.message}</p>
            <p className="text-xs text-muted-foreground font-body">
              {(a.profiles as any)?.display_name ?? 'Moderator'} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementWidget;

import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, BookOpen, Send, ArrowLeft, PenSquare, Search, Paperclip, Video, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import UserAvatar from '@/components/UserAvatar';
const GiphyPicker = lazy(() => import('@/components/GiphyPicker'));
import MentionInput from '@/components/MentionInput';
import MentionText from '@/components/MentionText';
import StyledName from '@/components/StyledName';
import MobileFab from '@/components/MobileFab';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

const MAX_MEDIA_SIZE = 20 * 1024 * 1024;
const IMAGE_PREFIX = '[image] ';
const VIDEO_PREFIX = '[video] ';

interface InboxViewProps {
  embedded?: boolean;
}

const InboxView = ({ embedded = false }: InboxViewProps) => {
  const { user } = useAuth();
  const { clubId } = useClub();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(true);
  const [convError, setConvError] = useState(false);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [allMembers, setAllMembers] = useState<{ user_id: string; display_name: string | null; avatar_url: string | null }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const chatParam = searchParams.get('chat');
  const dialogParam = searchParams.get('dialog');

  const updateChatParam = useCallback((nextChatId: string | null, opts?: { replace?: boolean }) => {
    const params = new URLSearchParams(searchParams);
    if (nextChatId) params.set('chat', nextChatId);
    else params.delete('chat');
    setSearchParams(params, { replace: opts?.replace ?? false });
  }, [searchParams, setSearchParams]);

  const getMessagePreview = (message: string) => {
    if (message.startsWith(IMAGE_PREFIX)) return '📷 Photo';
    if (message.startsWith(VIDEO_PREFIX)) return '🎬 Video';
    if (isGifUrl(message)) return 'GIF';
    return message;
  };

  const buildOptimisticMessage = useCallback((message: string, receiverId: string): Message => ({
    id: crypto.randomUUID(),
    sender_id: user!.id,
    receiver_id: receiverId,
    message,
    created_at: new Date().toISOString(),
    read: false,
  }), [user]);

  const pushOptimisticMessage = useCallback((optimisticMsg: Message) => {
    setMessages(prev => [...prev, optimisticMsg]);
    setConversations(prev => {
      const existing = prev.find(c => c.otherUserId === optimisticMsg.receiver_id);
      if (!existing || !activeConvo) return prev;
      return prev
        .map(c => c.otherUserId === optimisticMsg.receiver_id
          ? { ...c, lastMessage: getMessagePreview(optimisticMsg.message), lastMessageAt: optimisticMsg.created_at }
          : c)
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    });
  }, [activeConvo]);

  const uploadDmMedia = useCallback(async (file: File, receiverId: string, kind: 'image' | 'video') => {
    if (!user) return null;

    if (file.size > MAX_MEDIA_SIZE) {
      toast.error('File must be 20MB or smaller.');
      return null;
    }

    const expectedPrefix = kind === 'image' ? 'image/' : 'video/';
    if (!file.type.startsWith(expectedPrefix)) {
      toast.error(kind === 'image' ? 'Please select an image file.' : 'Please select a video file.');
      return null;
    }

    const ext = file.name.split('.').pop() || (kind === 'image' ? 'jpg' : 'mp4');
    const path = `${user.id}/${receiverId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('dm-media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

    if (error) {
      toast.error(`Failed to upload ${kind}.`);
      return null;
    }

    const { data } = await supabase.storage.from('dm-media').createSignedUrl(path, 60 * 60 * 24 * 7);
    if (!data?.signedUrl) {
      toast.error(`Failed to prepare ${kind}.`);
      return null;
    }

    return data.signedUrl;
  }, [user]);

  const sendDirectMessage = useCallback(async (message: string) => {
    if (!user || !activeConvo || sending) return false;

    const optimisticMsg = buildOptimisticMessage(message, activeConvo.otherUserId);
    pushOptimisticMessage(optimisticMsg);

    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: activeConvo.otherUserId,
      message,
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      return false;
    }

    return true;
  }, [activeConvo, buildOptimisticMessage, pushOptimisticMessage, sending, user]);

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setConvError(false);

    const { data: allMessages, error: fetchErr } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (fetchErr) { setConvError(true); setFetching(false); return; }
    if (!allMessages) { setFetching(false); return; }

    const convMap = new Map<string, { messages: typeof allMessages }>();
    for (const msg of allMessages) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(otherId)) convMap.set(otherId, { messages: [] });
      convMap.get(otherId)!.messages.push(msg);
    }

    const otherIds = Array.from(convMap.keys());
    if (otherIds.length === 0) { setConversations([]); setFetching(false); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', otherIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const convos: Conversation[] = otherIds.map(otherId => {
      const msgs = convMap.get(otherId)!.messages;
      const latest = msgs[0];
      const unread = msgs.filter(m => m.receiver_id === user!.id && !m.read).length;
      const profile = profileMap.get(otherId);
      return {
        otherUserId: otherId,
        otherUserName: profile?.display_name || 'Reader',
        otherUserAvatar: profile?.avatar_url || null,
        lastMessage: getMessagePreview(latest.message),
        lastMessageAt: latest.created_at,
        unreadCount: unread,
      };
    });

    convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    setConversations(convos);
    setFetching(false);
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!user || !activeConvo) return;
    const otherId = activeConvo.otherUserId;

    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);

    await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('sender_id', otherId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    setConversations(prev =>
      prev.map(c => c.otherUserId === otherId ? { ...c, unreadCount: 0 } : c)
    );
  }, [user, activeConvo]);

  const activeConvoRef = useRef(activeConvo);
  activeConvoRef.current = activeConvo;

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const msg = payload.new as Message;
        const convo = activeConvoRef.current;
        if (convo && (
          (msg.sender_id === user.id && msg.receiver_id === convo.otherUserId) ||
          (msg.sender_id === convo.otherUserId && msg.receiver_id === user.id)
        )) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            const optimisticIdx = prev.findIndex(m =>
              m.sender_id === msg.sender_id &&
              m.message === msg.message &&
              Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime()) < 10000
            );
            if (optimisticIdx !== -1) {
              const updated = [...prev];
              updated[optimisticIdx] = msg;
              return updated;
            }
            return [...prev, msg];
          });
          if (msg.receiver_id === user.id) {
            supabase.from('direct_messages').update({ read: true }).eq('id', msg.id).then();
          }
        }
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  useEffect(() => {
    if (activeConvo) fetchMessages();
    else setMessages([]);
  }, [activeConvo, fetchMessages]);

  // Drive activeConvo from the ?chat=<id> URL param so browser back works.
  useEffect(() => {
    if (!user) return;
    if (!chatParam) {
      if (activeConvo) setActiveConvo(null);
      return;
    }
    if (activeConvo?.otherUserId === chatParam) return;
    const existing = conversations.find(c => c.otherUserId === chatParam);
    if (existing) {
      setActiveConvo(existing);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', chatParam)
        .maybeSingle();
      if (cancelled) return;
      setActiveConvo({
        otherUserId: chatParam,
        otherUserName: p?.display_name || 'Reader',
        otherUserAvatar: p?.avatar_url || null,
        lastMessage: '',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
      });
    })();
    return () => { cancelled = true; };
  }, [chatParam, conversations, user, activeConvo]);

  useEffect(() => {
    setShowNewMsg(dialogParam === 'newMsg');
    setShowMembers(dialogParam === 'members');
  }, [dialogParam]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeConvo || sending) return;
    const text = newMessage.trim();
    setSending(true);
    setNewMessage('');

    const ok = await sendDirectMessage(text);
    if (!ok) {
      setNewMessage(text);
      toast.error('Failed to send message.');
    }
    setSending(false);
  };

  const handleGifSelect = async (url: string) => {
    if (!user || !activeConvo || sending) return;
    setSending(true);
    setShowGifPicker(false);

    const ok = await sendDirectMessage(url);
    if (!ok) toast.error('Failed to send GIF.');
    setSending(false);
  };

  const handleMediaSelect = async (event: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video') => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !user || !activeConvo || sending) return;

    setSending(true);
    const uploadedUrl = await uploadDmMedia(file, activeConvo.otherUserId, kind);
    if (!uploadedUrl) {
      setSending(false);
      return;
    }

    const message = `${kind === 'image' ? IMAGE_PREFIX : VIDEO_PREFIX}${uploadedUrl}`;
    const ok = await sendDirectMessage(message);
    if (!ok) {
      toast.error(`Failed to send ${kind}.`);
    }
    setSending(false);
  };

  const isGifUrl = (text: string) =>
    text.startsWith('https://media') && text.includes('giphy.com');

  const getImageUrl = (text: string) => text.startsWith(IMAGE_PREFIX) ? text.slice(IMAGE_PREFIX.length) : null;
  const getVideoUrl = (text: string) => text.startsWith(VIDEO_PREFIX) ? text.slice(VIDEO_PREFIX.length) : null;

  const openNewMessageDialog = async () => {
    const params = new URLSearchParams(searchParams);
    params.set('dialog', 'newMsg');
    setSearchParams(params, { replace: false });
    setMemberSearch('');
    await ensureMembersLoaded();
  };

  const ensureMembersLoaded = async () => {
    if (allMembers.length === 0) {
      setLoadingMembers(true);
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .order('display_name', { ascending: true });
      if (data) setAllMembers(data.filter(m => m.user_id !== user?.id));
      setLoadingMembers(false);
    }
  };

  const openMembersDialog = async () => {
    const params = new URLSearchParams(searchParams);
    params.set('dialog', 'members');
    setSearchParams(params, { replace: false });
    setMemberSearch('');
    await ensureMembersLoaded();
  };

  const selectMember = (member: { user_id: string; display_name: string | null; avatar_url: string | null }) => {
    const params = new URLSearchParams(searchParams);
    params.delete('dialog');
    params.set('chat', member.user_id);
    setSearchParams(params, { replace: true });
  };

  const filteredMembers = allMembers.filter(m =>
    (m.display_name || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  if (activeConvo) {
    return (
      <div className={`flex h-full min-h-0 flex-col overflow-hidden ${embedded ? '' : 'mx-auto max-w-2xl px-4 py-2 sm:py-6'}`}>
        <div className="mb-2 flex shrink-0 items-center gap-3">
          <button
            onClick={() => {
              setShowGifPicker(false);
              if (window.history.length > 1) navigate(-1);
              else updateChatParam(null);
            }}
            className="cozy-btn-ghost p-2 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <UserAvatar
            userId={activeConvo.otherUserId}
            avatarUrl={activeConvo.otherUserAvatar}
            displayName={activeConvo.otherUserName}
            size="sm"
          />
          <h1 className="cozy-title text-xl truncate">{activeConvo.otherUserName}</h1>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-1"
        >
          <div className="flex min-h-full flex-col justify-end gap-3 py-3">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground font-body">
                No messages yet — say hi! 👋
              </p>
            ) : (
              messages.map(msg => {
                const isMine = msg.sender_id === user!.id;
                const gif = isGifUrl(msg.message);
                const imageUrl = getImageUrl(msg.message);
                const videoUrl = getVideoUrl(msg.message);
                const senderId = isMine ? user!.id : activeConvo.otherUserId;
                const displayName = isMine ? 'You' : activeConvo.otherUserName;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMine && (
                      <div className="shrink-0 pt-1">
                        <UserAvatar
                          userId={activeConvo.otherUserId}
                          avatarUrl={activeConvo.otherUserAvatar}
                          displayName={activeConvo.otherUserName}
                          size="sm"
                        />
                      </div>
                    )}
                    <div className={`min-w-0 max-w-[80%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-1.5 mb-0.5 ${isMine ? 'self-end flex-row-reverse' : 'self-start'}`}>
                        <StyledName userId={senderId} name={displayName} className="text-[11px] font-bold" showBadge />
                        <span className="text-[10px] text-muted-foreground/50" title={format(new Date(msg.created_at), 'PPP p')}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div
                        className={`rounded-2xl px-3 py-2 ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-card border border-border rounded-bl-sm'
                        }`}
                      >
                        {gif ? (
                          <img src={msg.message} alt="GIF" className="rounded-lg max-h-48 w-auto" loading="lazy" />
                        ) : imageUrl ? (
                          <img src={imageUrl} alt="Shared photo" className="rounded-lg max-h-64 w-auto" loading="lazy" />
                        ) : videoUrl ? (
                          <video src={videoUrl} controls className="rounded-lg max-h-72 w-auto max-w-full" preload="metadata" />
                        ) : (
                          <div className="text-[13px] font-body leading-relaxed break-words whitespace-pre-wrap">
                            <MentionText text={msg.message} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="shrink-0 px-2 pt-2 pb-3">
          <div className="rounded-2xl border border-border/40 bg-card px-3 pt-3 pb-3 shadow-[0_-6px_18px_-6px_hsl(var(--warm-brown)/0.14)]">
            <form onSubmit={handleSend} className="space-y-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => handleMediaSelect(event, 'image')}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(event) => handleMediaSelect(event, 'video')}
                className="hidden"
              />

              <MentionInput
                value={newMessage}
                onChange={setNewMessage}
                onSubmit={() => { document.querySelector('form')?.requestSubmit(); }}
                placeholder="Type a message…"
                className="w-full min-h-[52px] resize-none border-0 bg-transparent px-0 py-1 text-sm leading-relaxed font-body focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                maxLength={1000}
              />

              <div className="flex items-center gap-1 pt-1 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Send photo"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Send video"
                >
                  <Video className="h-3.5 w-3.5" />
                </button>
                <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-7 px-2 rounded-md text-[11px] font-semibold text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Search GIFs"
                    >
                      GIF
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="center"
                    sideOffset={8}
                    collisionPadding={12}
                    className="w-[min(92vw,360px)] p-0 border-border/40 rounded-2xl shadow-lg overflow-hidden bg-card"
                  >
                    <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Loading…</div>}>
                      <GiphyPicker
                        onSelect={handleGifSelect}
                        onClose={() => setShowGifPicker(false)}
                      />
                    </Suspense>
                  </PopoverContent>
                </Popover>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="ml-auto h-7 px-3 rounded-md text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mobile-fab-content-offset relative ${embedded ? 'pt-2' : 'mx-auto max-w-2xl px-4 py-6'}`}>
      {!embedded && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="cozy-title text-2xl">Messages</h1>
          </div>
        </div>
      )}

      {/* FAB */}
      <MobileFab
        onClick={openNewMessageDialog}
        title="New message"
        label="Start a new message"
        hidden={showNewMsg || showMembers || !!activeConvo}
      >
        <PenSquare className="h-5 w-5" aria-hidden="true" />
      </MobileFab>


      {fetching ? (
        <div className="flex justify-center py-12">
          <div className="animate-gentle-bounce"><BookOpen className="h-8 w-8 text-primary" aria-hidden="true" /></div>
        </div>
      ) : convError ? (
        <div className="cozy-card text-center py-8 space-y-3">
          <p className="text-sm text-muted-foreground font-body">Couldn't load your messages.</p>
          <button
            type="button"
            onClick={() => { setFetching(true); fetchConversations(); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-foreground border border-border/60 shadow-sm hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="cozy-card text-center py-12">
          <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
          <p className="text-muted-foreground font-body">No conversations yet.</p>
          <p className="text-sm text-muted-foreground/60 font-body mt-1">Tap "New Message" to start chatting! 💬</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <button
              key={conv.otherUserId}
              onClick={() => updateChatParam(conv.otherUserId)}
              className="cozy-card flex items-center gap-3 !p-4 hover:!shadow-lg w-full text-left"
            >
              <div className="relative">
                <UserAvatar
                  userId={conv.otherUserId}
                  avatarUrl={conv.otherUserAvatar}
                  displayName={conv.otherUserName}
                  size="md"
                />
                {conv.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-body truncate ${conv.unreadCount > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>
                    {conv.otherUserName}
                  </p>
                  <span className="text-[11px] text-muted-foreground/60 font-body shrink-0">
                    {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                  </span>
                </div>
                <p className={`text-sm font-body truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {conv.lastMessage}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={showNewMsg} onOpenChange={(open) => {
        if (!open && dialogParam) {
          const params = new URLSearchParams(searchParams);
          params.delete('dialog');
          setSearchParams(params, { replace: true });
        }
        setShowNewMsg(open);
      }}>
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display">New Message</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-body"
            />
          </div>
          <div className="max-h-[300px] overflow-y-scroll [scrollbar-gutter:stable]">
            {loadingMembers ? (
              <div className="flex justify-center py-8">
                <div className="animate-gentle-bounce"><BookOpen className="h-6 w-6 text-primary" /></div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground font-body">No members found</p>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map(m => (
                  <button
                    key={m.user_id}
                    onClick={() => selectMember(m)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <UserAvatar
                      userId={m.user_id}
                      avatarUrl={m.avatar_url}
                      displayName={m.display_name}
                      size="sm"
                    />
                    <span className="text-sm font-body font-medium text-foreground truncate">
                      {m.display_name || 'Reader'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMembers} onOpenChange={(open) => {
        if (!open && dialogParam) {
          const params = new URLSearchParams(searchParams);
          params.delete('dialog');
          setSearchParams(params, { replace: true });
        }
        setShowMembers(open);
      }}>
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Members
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-body"
            />
          </div>
          <div className="max-h-[360px] overflow-y-scroll [scrollbar-gutter:stable]">
            {loadingMembers ? (
              <div className="flex justify-center py-8">
                <div className="animate-gentle-bounce"><BookOpen className="h-6 w-6 text-primary" /></div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground font-body">No members found</p>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map(m => (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                  >
                    <Link
                      to={`/member/${m.user_id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const params = new URLSearchParams(searchParams);
                        params.delete('dialog');
                        setSearchParams(params, { replace: true });
                        navigate(`/member/${m.user_id}`);
                      }}
                      className="flex flex-1 min-w-0 items-center gap-3"
                    >
                      <UserAvatar
                        userId={m.user_id}
                        avatarUrl={m.avatar_url}
                        displayName={m.display_name}
                        size="sm"
                      />
                      <span className="text-sm font-body font-medium text-foreground truncate">
                        {m.display_name || 'Reader'}
                      </span>
                    </Link>
                    <button
                      onClick={() => { setShowMembers(false); selectMember(m); }}
                      className="cozy-btn-ghost shrink-0 p-2 text-primary"
                      title={`Message ${m.display_name || 'Reader'}`}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InboxView;

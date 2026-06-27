import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, Send, X, Paperclip, ChevronDown, ChevronUp, CornerDownRight, Plus } from 'lucide-react';
import MentionInput from './MentionInput';
import MentionText from './MentionText';
import { format, formatDistanceToNow } from 'date-fns';
import ConfirmDialog from './ConfirmDialog';
import GiphyPicker from './GiphyPicker';
import DiscussionReactions from './DiscussionReactions';
import StyledName from './StyledName';
import UserAvatar from './UserAvatar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface Discussion {
  id: string;
  message: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: { display_name: string | null; avatar_url?: string | null } | null;
  replies?: Discussion[];
}

const PREVIEW_REPLIES = 2;

const flattenReplies = (replies: Discussion[]): Discussion[] => {
  const flat: Discussion[] = [];
  const walk = (items: Discussion[]) => {
    items.forEach(r => {
      flat.push(r);
      if (r.replies?.length) walk(r.replies);
    });
  };
  walk(replies);
  return flat;
};

const findPostById = (id: string, list: Discussion[]): Discussion | undefined => {
  for (const d of list) {
    if (d.id === id) return d;
    if (d.replies) {
      const found = findPostById(id, d.replies);
      if (found) return found;
    }
  }
  return undefined;
};

// ── Chat Bubble ──
const ChatBubble = memo(({ d, isOwn, userId, onReply, onDelete, parentSnippet, parentAuthor, replyToAuthor }: {
  d: Discussion;
  isOwn: boolean;
  userId?: string;
  onReply: (d: Discussion) => void;
  onDelete: (id: string) => void;
  parentSnippet?: string;
  parentAuthor?: string;
  replyToAuthor?: string;
}) => {
  const name = (d.profiles as any)?.display_name || 'Reader';
  const avatarUrl = (d.profiles as any)?.avatar_url || null;

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar for others only */}
      {!isOwn && (
        <div className="shrink-0 pt-1">
          <UserAvatar userId={d.user_id} avatarUrl={avatarUrl} displayName={name} size="sm" />
        </div>
      )}

      <div className={`min-w-0 max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Reply context header */}
        {replyToAuthor && (
          <div className={`flex items-center gap-1 mb-0.5 text-[10px] text-muted-foreground/60 ${isOwn ? 'self-end' : 'self-start'}`}>
            <CornerDownRight className="h-2.5 w-2.5" />
            <span>
              <StyledName userId={d.user_id} name={name} className="text-[10px] font-medium" />
              {' replied to '}
              <span className="font-medium">{parentAuthor}</span>
            </span>
          </div>
        )}

        {/* Quoted parent snippet */}
        {parentSnippet && (
          <div className={`mb-1 rounded-lg bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground italic border-l-2 border-border/40 max-w-full ${isOwn ? 'self-end' : 'self-start'}`}>
            {parentSnippet}
          </div>
        )}

        {/* Username */}
        <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'self-end flex-row-reverse' : 'self-start'}`}>
          {!replyToAuthor && (
            <StyledName userId={d.user_id} name={name} className="text-[11px] font-bold" showBadge />
          )}
          <span className="text-[10px] text-muted-foreground/50" title={format(new Date(d.created_at), 'PPP p')}>
            {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-3 py-2 ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-card border border-border rounded-bl-sm'
          }`}
        >
          {d.message && (
            <div className={`text-[13px] font-body leading-relaxed break-words whitespace-pre-wrap ${isOwn ? '' : ''}`}>
              <MentionText
                text={d.message}
                linkClassName={
                  isOwn
                    ? 'font-semibold underline underline-offset-2 text-primary-foreground hover:opacity-80'
                    : 'font-semibold text-primary hover:underline'
                }
              />
            </div>
          )}
          {d.image_url && (
            <img
              src={d.image_url}
              alt="Shared"
              className="mt-1.5 rounded-lg max-h-44 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(d.image_url!, '_blank')}
              loading="lazy"
            />
          )}
        </div>

        {/* Actions row */}
        <div className={`flex items-center gap-2 mt-0.5 ${isOwn ? 'self-end flex-row-reverse' : 'self-start'}`}>
          <DiscussionReactions discussionId={d.id} />
          <button
            onClick={() => onReply(d)}
            className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            <MessageCircle className="h-3 w-3" />
          </button>
          {userId === d.user_id && (
            <button
              onClick={() => onDelete(d.id)}
              className="text-[10px] text-muted-foreground/40 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
ChatBubble.displayName = 'ChatBubble';

// ── Post Card with thread expansion ──
const PostCard = memo(({ d, userId, isExpanded, onToggleThread, onReply, onDelete }: {
  d: Discussion;
  userId?: string;
  isExpanded: boolean;
  onToggleThread: (id: string) => void;
  onReply: (d: Discussion) => void;
  onDelete: (id: string) => void;
}) => {
  const isOwn = userId === d.user_id;
  const allReplies = useMemo(() => flattenReplies(d.replies || []), [d.replies]);
  const hasMore = allReplies.length > PREVIEW_REPLIES;
  const visibleReplies = isExpanded ? allReplies : allReplies.slice(-PREVIEW_REPLIES);

  // Collect unique participant avatars for the reply bar
  const participantAvatars = useMemo(() => {
    const seen = new Set<string>();
    const avatars: { userId: string; avatarUrl: string | null; name: string }[] = [];
    for (const r of allReplies) {
      if (!seen.has(r.user_id)) {
        seen.add(r.user_id);
        avatars.push({
          userId: r.user_id,
          avatarUrl: (r.profiles as any)?.avatar_url || null,
          name: (r.profiles as any)?.display_name || 'Reader',
        });
      }
      if (avatars.length >= 3) break;
    }
    return avatars;
  }, [allReplies]);

  const topAuthorName = (d.profiles as any)?.display_name || 'Reader';

  return (
    <div className="space-y-1">
      {/* Top-level post bubble */}
      <ChatBubble d={d} isOwn={isOwn} userId={userId} onReply={onReply} onDelete={onDelete} />

      {/* Reply count bar — shown when collapsed */}
      {allReplies.length > 0 && !isExpanded && (
        <button
          onClick={() => onToggleThread(d.id)}
          className="flex items-center gap-1.5 py-1 px-2 ml-11 text-[11px] text-primary/70 hover:text-primary font-semibold font-body transition-colors rounded-lg hover:bg-muted/50"
        >
          <div className="flex -space-x-2">
            {participantAvatars.map(p => (
              <div key={p.userId} className="ring-2 ring-background rounded-full">
                <UserAvatar userId={p.userId} avatarUrl={p.avatarUrl} displayName={p.name} size="sm" className="h-5 w-5 text-[8px]" />
              </div>
            ))}
          </div>
          <span>{allReplies.length} {allReplies.length === 1 ? 'reply' : 'replies'}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      )}

      {/* Expanded thread */}
      {allReplies.length > 0 && isExpanded && (
        <div className="ml-5 pl-3 border-l-2 border-border/40 space-y-2 pt-1">
          {allReplies.map(r => {
            const parent = r.parent_id ? findPostById(r.parent_id, [d, ...allReplies]) : d;
            const parentName = parent ? ((parent.profiles as any)?.display_name || 'Reader') : topAuthorName;
            const snippet = parent && parent.id !== d.id
              ? (parent.message || '').slice(0, 80) + ((parent.message || '').length > 80 ? '…' : '')
              : undefined;
            const rIsOwn = userId === r.user_id;

            return (
              <ChatBubble
                key={r.id}
                d={r}
                isOwn={rIsOwn}
                userId={userId}
                onReply={onReply}
                onDelete={onDelete}
                replyToAuthor={parentName}
                parentAuthor={parentName}
                parentSnippet={snippet}
              />
            );
          })}
        </div>
      )}

      {/* Collapse button — shown when expanded */}
      {allReplies.length > 0 && isExpanded && (
        <button
          onClick={() => onToggleThread(d.id)}
          className="flex items-center gap-1 px-2 py-1 ml-11 text-[11px] text-muted-foreground/60 hover:text-foreground font-body hover:bg-muted/50 rounded-lg transition-colors"
        >
          <ChevronUp className="h-3 w-3" />
          Hide replies
        </button>
      )}
    </div>
  );
});
PostCard.displayName = 'PostCard';


const DiscussionWidget = () => {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Discussion | null>(null);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [composerFocused, setComposerFocused] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const fetchDiscussions = useCallback(async (bookId: string) => {
    const { data } = await supabase
      .from('discussions')
      .select('*, profiles(display_name, avatar_url)')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      const all = data as any as Discussion[];
      const byId = new Map<string, Discussion>();
      all.forEach(d => { d.replies = []; byId.set(d.id, d); });

      const topLevel: Discussion[] = [];
      all.forEach(d => {
        if (d.parent_id && byId.has(d.parent_id)) {
          byId.get(d.parent_id)!.replies!.push(d);
        } else if (!d.parent_id) {
          topLevel.push(d);
        }
      });

      const sortReplies = (items: Discussion[]) => {
        items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        items.forEach(item => { if (item.replies?.length) sortReplies(item.replies); });
      };
      topLevel.forEach(t => { if (t.replies?.length) sortReplies(t.replies); });

      setDiscussions(topLevel);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: books } = await supabase
        .from('books')
        .select('id')
        .eq('status', 'current')
        .limit(1);
      if (books && books.length > 0) {
        setCurrentBookId(books[0].id);
        fetchDiscussions(books[0].id);
      }
    };
    init();
  }, [fetchDiscussions]);

  useEffect(() => {
    if (!currentBookId) return;
    const channel = supabase
      .channel('discussions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discussions' }, () => {
        fetchDiscussions(currentBookId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentBookId, fetchDiscussions]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setGifUrl('');
    setShowGifPicker(false);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setGifUrl('');
    setShowGifPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('discussion-images').upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from('discussion-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = newMessage.trim().length > 0;
    const hasImage = !!imageFile || !!gifUrl.trim();
    if ((!hasText && !hasImage) || !currentBookId || !user) return;

    setUploading(true);
    let finalImageUrl: string | null = null;
    if (imageFile) {
      finalImageUrl = await uploadImage(imageFile);
    } else if (gifUrl.trim()) {
      finalImageUrl = gifUrl.trim();
    }

    await supabase.from('discussions').insert({
      book_id: currentBookId,
      user_id: user.id,
      message: newMessage.trim() || (finalImageUrl ? '' : ''),
      parent_id: replyTo?.id ?? null,
      image_url: finalImageUrl,
    } as any);

    setNewMessage('');
    setReplyTo(null);
    clearImage();
    setUploading(false);
    setShowComposer(false);
    fetchDiscussions(currentBookId);
  };

  const deletePost = useCallback(async (id: string) => {
    await supabase.from('discussions').delete().eq('id', id);
    if (currentBookId) fetchDiscussions(currentBookId);
  }, [currentBookId, fetchDiscussions]);

  const confirmDelete = useCallback((id: string) => setDeleteId(id), []);
  const handleConfirmDelete = () => {
    if (deleteId) deletePost(deleteId);
    setDeleteId(null);
  };

  const toggleThread = useCallback((id: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleReply = useCallback((d: Discussion) => {
    setReplyTo(d);
    setShowComposer(true);
  }, []);

  const handleFABClick = () => {
    setReplyTo(null);
    setShowComposer(true);
    setTimeout(() => {
      composerRef.current?.querySelector('textarea')?.focus();
    }, 100);
  };

  const showFAB = !showComposer && !composerFocused;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-1">
        <div className="flex flex-col gap-4 py-3">
          {discussions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground font-body">
              No thoughts shared yet. Be the first! 🌱
            </p>
          ) : (
            discussions.map(d => (
              <PostCard
                key={d.id}
                d={d}
                userId={user?.id}
                isExpanded={expandedThreads.has(d.id)}
                onToggleThread={toggleThread}
                onReply={handleReply}
                onDelete={confirmDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky composer — soft cozy bottom sheet */}
      {showComposer && (
        <div ref={composerRef} className="shrink-0 px-2 pt-2 pb-3">
          <div className="rounded-2xl border border-border/40 bg-card px-3 pt-3 pb-3 shadow-[0_-6px_18px_-6px_hsl(var(--warm-brown)/0.14)]">
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 text-xs font-body text-muted-foreground">
                <CornerDownRight className="h-3 w-3 text-primary" />
                <span className="truncate">
                  Replying to <strong className="text-foreground">{(replyTo.profiles as any)?.display_name || 'Reader'}</strong>
                </span>
                <button onClick={() => setReplyTo(null)} className="ml-auto text-muted-foreground/60 hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {(imagePreview || gifUrl) && (
              <div className="mb-2 relative inline-block">
                <img
                  src={imagePreview || gifUrl}
                  alt="Preview"
                  className="max-h-24 rounded-lg border border-border/40"
                  onError={() => { if (gifUrl) setGifUrl(''); }}
                />
                <button
                  onClick={clearImage}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <form onSubmit={sendMessage} className="space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

              <MentionInput
                value={newMessage}
                onChange={setNewMessage}
                onSubmit={() => { document.querySelector('form')?.requestSubmit(); }}
                placeholder={replyTo ? 'Write a reply…' : 'Share a thought…'}
                className="w-full min-h-[52px] resize-none border-0 bg-transparent px-0 py-1 text-sm leading-relaxed font-body focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                maxLength={500}
              />

              <div className="flex items-center gap-1 pt-1 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Upload image"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <Popover
                  open={showGifPicker && !imageFile}
                  onOpenChange={(open) => {
                    setShowGifPicker(open);
                    if (open) { setImageFile(null); setImagePreview(null); }
                  }}
                >
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
                    <GiphyPicker
                      onSelect={(url) => { setGifUrl(url); setShowGifPicker(false); }}
                      onClose={() => setShowGifPicker(false)}
                    />
                  </PopoverContent>
                </Popover>
                <button
                  type="submit"
                  disabled={uploading || (!newMessage.trim() && !imageFile && !gifUrl)}
                  className="ml-auto h-7 px-3 rounded-md text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  {uploading ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAB */}
      {showFAB && (
        <button
          onClick={handleFABClick}
          className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
          title="New post"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <ConfirmDialog
        open={!!deleteId}
        message="This post will be removed permanently."
        confirmLabel="Remove"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default DiscussionWidget;

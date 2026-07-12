import { useState, useEffect } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { useRole } from '@/hooks/useRole';
import { BookHeart, Heart, Plus, MessageCircle, Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ConfirmDialog from './ConfirmDialog';
import StyledName from './StyledName';
import { ScrollArea } from '@/components/ui/scroll-area';
import { searchGoogleBooks, type BookSearchResult } from '@/lib/googleBooks';

interface SuggestionComment {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

interface Suggestion {
  id: string;
  suggestion_title: string;
  suggestion_author: string;
  user_id: string;
  created_at: string;
  profiles: { display_name: string | null } | null;
  vote_count: number;
  user_voted: boolean;
}

const BookWishlistWidget = () => {
  const { user } = useAuth();
  const { clubId } = useClub();
  const { isPrivileged: globalPriv, canManageCurrentClub } = useRole();
  const isPrivileged = globalPriv || canManageCurrentClub;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<SuggestionComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ type: 'suggestion' | 'comment'; id: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<BookSearchResult[]>([]);
  const [searchingBooks, setSearchingBooks] = useState(false);

  const userAlreadySuggested = currentBookId
    ? suggestions.some(s => s.user_id === user?.id && (s as any).book_id === currentBookId)
    : suggestions.some(s => s.user_id === user?.id);

  useEffect(() => {
    setSuggestions([]);
    setCurrentBookId(null);
    if (!clubId) return;
    fetchCurrentBook();
    fetchSuggestions();
  }, [clubId]);

  useEffect(() => {
    const q = bookQuery.trim();
    if (q.length < 2) {
      setBookResults([]);
      setSearchingBooks(false);
      return;
    }
    const ctrl = new AbortController();
    setSearchingBooks(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchGoogleBooks(q, ctrl.signal);
        setBookResults(results);
      } catch (e) {
        console.warn('Book search failed', e);
      } finally {
        setSearchingBooks(false);
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [bookQuery]);

  const fetchCurrentBook = async () => {
    if (!clubId) return;
    const { data } = await supabase
      .from('books')
      .select('id')
      .eq('status', 'current')
      .eq('club_id', clubId)
      .maybeSingle();
    setCurrentBookId(data?.id || null);
  };

  const fetchSuggestions = async () => {
    if (!clubId) return;
    const { data: votes } = await supabase
      .from('book_votes')
      .select('*, profiles(display_name)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (!votes) return;

    const suggestionIds = votes.map((v: any) => v.id);
    const { data: likes } = suggestionIds.length
      ? await supabase.from('vote_likes').select('suggestion_id, user_id').in('suggestion_id', suggestionIds)
      : { data: [] as any[] };

    const enriched = votes.map((v: any) => ({
      ...v,
      vote_count: (likes || []).filter((l: any) => l.suggestion_id === v.id).length,
      user_voted: (likes || []).some((l: any) => l.suggestion_id === v.id && l.user_id === user?.id),
    }));

    enriched.sort((a: any, b: any) => b.vote_count - a.vote_count);
    setSuggestions(enriched);
  };

  const addSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !user || submitting) return;

    setSubmitting(true);
    try {
      await supabase.from('book_votes').insert({
        user_id: user.id,
        club_id: clubId,
        suggestion_title: title.trim(),
        suggestion_author: author.trim(),
        book_id: currentBookId,
      } as any);

      setTitle('');
      setAuthor('');
      setShowForm(false);
      fetchSuggestions();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSuggestion = async (id: string) => {
    await supabase.from('book_votes').delete().eq('id', id);
    if (expandedId === id) setExpandedId(null);
    fetchSuggestions();
  };

  const toggleVote = async (suggestionId: string, voted: boolean) => {
    if (!user) return;
    if (voted) {
      await supabase.from('vote_likes').delete().eq('suggestion_id', suggestionId).eq('user_id', user.id);
    } else {
      await supabase.from('vote_likes').insert({ user_id: user.id, suggestion_id: suggestionId, club_id: clubId } as any);
    }
    fetchSuggestions();
  };

  const toggleComments = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setNewComment('');
    fetchComments(id);
  };

  const fetchComments = async (suggestionId: string) => {
    const { data } = await supabase
      .from('suggestion_comments')
      .select('*, profiles(display_name)')
      .eq('suggestion_id', suggestionId)
      .order('created_at', { ascending: true });
    if (data) setComments(data as any);
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !expandedId || !user) return;

    await supabase.from('suggestion_comments').insert({
      suggestion_id: expandedId,
      user_id: user.id,
      club_id: clubId,
      message: newComment.trim(),
    } as any);

    setNewComment('');
    fetchComments(expandedId);
  };

  const deleteComment = async (id: string) => {
    await supabase.from('suggestion_comments').delete().eq('id', id);
    if (expandedId) fetchComments(expandedId);
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'suggestion') deleteSuggestion(pendingDelete.id);
    else deleteComment(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="px-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookHeart className="h-4 w-4 text-terracotta" />
          <h2 className="font-display text-lg font-semibold text-foreground">Book Suggestions</h2>
        </div>
        {!userAlreadySuggested && (
          <button
            onClick={() => setShowForm(f => !f)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-terracotta text-white shadow-md hover:bg-terracotta/90 transition-all"
            title="Suggest a book"
          >
            <Plus className={`h-4 w-4 transition-transform duration-200 ${showForm ? 'rotate-45' : ''}`} />
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={addSuggestion} className="mb-4 space-y-2 rounded-xl bg-peach/50 p-4">
          <div className="relative">
            <input
              type="text"
              value={bookQuery}
              onChange={(e) => setBookQuery(e.target.value)}
              placeholder="Search a book to autofill…"
              className="cozy-input w-full"
            />
            {bookQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                {searchingBooks && bookResults.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground font-body">Searching…</div>
                )}
                {!searchingBooks && bookResults.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground font-body">No matches</div>
                )}
                {bookResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTitle(r.title);
                      setAuthor(r.author);
                      setBookResults([]);
                      setBookQuery('');
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-cream font-body"
                  >
                    <div className="font-semibold text-foreground truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.author || 'Unknown author'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Book title"
            className="cozy-input w-full"
            maxLength={200}
            required
          />
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author"
            className="cozy-input w-full"
            maxLength={200}
            required
          />
          <button type="submit" disabled={submitting} className="cozy-btn-primary w-full text-sm disabled:opacity-50">
            {submitting ? 'Adding…' : '🌟 Add Suggestion'}
          </button>
        </form>
      )}

      {suggestions.length > 0 ? (
        <ScrollArea className="h-72 -mx-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]">
          <div className="divide-y divide-border/40 px-1">
          {suggestions.map((s) => (
            <div key={s.id}>
              <div className="group relative flex items-start gap-3 py-3 transition-colors hover:bg-cream/30 rounded-md px-1">
                <button
                  onClick={() => toggleVote(s.id, s.user_voted)}
                  className="flex flex-col items-center gap-0.5 pt-0.5"
                >
                  <Heart
                    className={`h-4 w-4 transition-all duration-200 ${
                      s.user_voted
                        ? 'fill-terracotta text-terracotta scale-110'
                        : 'text-muted-foreground hover:text-terracotta'
                    }`}
                  />
                  <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                    {s.vote_count}
                  </span>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-body leading-snug line-clamp-2 text-foreground">{s.suggestion_title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground font-body truncate">
                    {s.suggestion_author}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70 font-body truncate">
                    <StyledName userId={s.user_id} name={(s.profiles as any)?.display_name || 'Reader'} />
                    {' · '}
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 pt-0.5">
                  <button
                    onClick={() => toggleComments(s.id)}
                    className={`flex items-center gap-1 px-1.5 py-1 rounded-md transition-colors ${expandedId === s.id ? 'text-terracotta bg-terracotta/10' : 'text-muted-foreground/60 hover:text-terracotta'}`}
                    title="Comments"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                  {(user?.id === s.user_id || isPrivileged) && (
                    <button
                      onClick={() => setPendingDelete({ type: 'suggestion', id: s.id })}
                      className="p-1 rounded-md text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                      title={isPrivileged && user?.id !== s.user_id ? 'Remove (admin)' : 'Delete'}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {expandedId === s.id && (
                <div className="ml-8 mt-0 mb-3 space-y-1.5 border-l-2 border-terracotta/20 pl-4">
                  {comments.length === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground font-body">No comments yet</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 text-xs font-body">
                        <div className="flex-1">
                          <StyledName userId={c.user_id} name={(c.profiles as any)?.display_name || 'Reader'} className="font-semibold text-[11px]" />
                          <span className="text-[10px] text-muted-foreground/60"> · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                          <p className="mt-0.5 text-xs">{c.message}</p>
                        </div>
                        {(user?.id === c.user_id || isPrivileged) && (
                          <button onClick={() => setPendingDelete({ type: 'comment', id: c.id })} className="mt-1 text-muted-foreground/40 hover:text-destructive transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  <form onSubmit={addComment} className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="cozy-input flex-1 text-xs py-1"
                      maxLength={300}
                    />
                    <button type="submit" className="cozy-btn-primary py-1 px-2">
                      <Send className="h-3 w-3" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
          </div>
        </ScrollArea>
      ) : !showForm ? (
        <p className="py-4 text-center text-sm text-muted-foreground font-body">
          No suggestions yet. Add your favorite! 📚
        </p>
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        message={pendingDelete?.type === 'suggestion' ? 'This suggestion will be removed permanently.' : 'This comment will be removed permanently.'}
        confirmLabel="Remove"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default BookWishlistWidget;

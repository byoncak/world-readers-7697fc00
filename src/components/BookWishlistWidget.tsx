import { useState, useEffect, useRef } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { useRole } from '@/hooks/useRole';
import { BookHeart, ThumbsUp, Plus, MessageCircle, Send, X, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ConfirmDialog from './ConfirmDialog';
import StyledName from './StyledName';
import { toast } from 'sonner';

import { searchGoogleBooks, type BookSearchResult } from '@/lib/googleBooks';
import { cycleFilterFor, isStaleGen } from '@/lib/guards';

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

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Track voting state per suggestion id to disable rapid re-clicks.
  const [pendingVotes, setPendingVotes] = useState<Set<string>>(new Set());
  const [deletingSuggestion, setDeletingSuggestion] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [postingComment, setPostingComment] = useState(false);
  const [commentsError, setCommentsError] = useState(false);
  // Generation counter — bumped on club switch so late fetches for a
  // previously-active club can't overwrite the new club's suggestions.
  const genRef = useRef(0);
  // Which suggestion's comments are currently expanded. Kept in a ref so
  // async comment fetches/mutations can compare against the live value
  // instead of a stale closure — rapidly switching between suggestions
  // must not let the earlier response overwrite the newer expansion.
  const expandedIdRef = useRef<string | null>(null);

  useEffect(() => {
    genRef.current += 1;
    setSuggestions([]);
    setCurrentBookId(null);
    setLoadError(null);
    setPendingVotes(new Set());
    // Any per-operation / per-comment pending or error state from the
    // previous club must not survive the switch — clear it all so the
    // new club never renders stale spinners or expanded comment threads.
    setExpandedId(null);
    expandedIdRef.current = null;
    setComments([]);
    setNewComment('');
    setPendingDelete(null);
    setDeletingSuggestion(null);
    setDeletingComment(null);
    setPostingComment(false);
    setCommentsError(false);
    if (!clubId) return;
    const gen = genRef.current;
    (async () => {
      setLoading(true);
      const { data: current, error: bookErr } = await supabase
        .from('books')
        .select('id')
        .eq('status', 'current')
        .eq('club_id', clubId)
        .maybeSingle();
      if (isStaleGen(gen, genRef.current)) return;
      if (bookErr) {
        setLoadError('Could not load suggestions.');
        setLoading(false);
        return;
      }
      const bookId = current?.id || null;
      setCurrentBookId(bookId);
      await fetchSuggestions(bookId, gen);
      if (!isStaleGen(gen, genRef.current)) setLoading(false);
    })();
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

  const fetchSuggestions = async (
    bookId: string | null = currentBookId,
    gen: number = genRef.current,
  ) => {
    if (!clubId) return;
    let query = supabase
      .from('book_votes')
      .select('*, profiles(display_name)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    // Scope to the current cycle: when a current book exists, only that
    // cycle's suggestions; when there is none, only suggestions that were
    // filed without a book_id (unassigned upcoming cycle). This prevents
    // stale, resolved-cycle suggestions from leaking back into the list.
    if (bookId) {
      query = query.eq('book_id', bookId);
    } else {
      query = query.is('book_id', null);
    }
    const { data: votes, error } = await query;
    if (gen !== genRef.current) return;
    if (error) {
      setLoadError('Could not load suggestions.');
      return;
    }
    setLoadError(null);
    if (!votes) return;

    const suggestionIds = votes.map((v: any) => v.id);
    const { data: likes } = suggestionIds.length
      ? await supabase.from('vote_likes').select('suggestion_id, user_id').in('suggestion_id', suggestionIds)
      : { data: [] as any[] };

    if (gen !== genRef.current) return;

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
      const { error } = await supabase.from('book_votes').insert({
        user_id: user.id,
        club_id: clubId,
        suggestion_title: title.trim(),
        suggestion_author: author.trim(),
        book_id: currentBookId,
      } as any);
      if (error) {
        toast.error("Couldn't add your suggestion. Please try again.");
        return;
      }
      setTitle('');
      setAuthor('');
      setShowForm(false);
      fetchSuggestions();
    } finally {
      setSubmitting(false);
    }
  };


  const deleteSuggestion = async (id: string) => {
    if (deletingSuggestion === id) return;
    setDeletingSuggestion(id);
    const { error } = await supabase.from('book_votes').delete().eq('id', id);
    setDeletingSuggestion(null);
    if (error) {
      toast.error("Couldn't remove that suggestion. Please try again.");
      return;
    }
    if (expandedId === id) setExpandedId(null);
    fetchSuggestions();
  };

  const toggleVote = async (suggestionId: string, voted: boolean) => {
    if (!user) return;
    // Ignore repeat clicks while the previous toggle for this suggestion
    // hasn't resolved yet — Supabase inserts/deletes here aren't idempotent.
    if (pendingVotes.has(suggestionId)) return;
    setPendingVotes((prev) => {
      const next = new Set(prev);
      next.add(suggestionId);
      return next;
    });
    let opErr: any = null;
    if (voted) {
      const { error } = await supabase.from('vote_likes').delete().eq('suggestion_id', suggestionId).eq('user_id', user.id);
      opErr = error;
    } else {
      const { error } = await supabase.from('vote_likes').insert({ user_id: user.id, suggestion_id: suggestionId, club_id: clubId } as any);
      opErr = error;
    }
    setPendingVotes((prev) => {
      const next = new Set(prev);
      next.delete(suggestionId);
      return next;
    });
    if (opErr) {
      toast.error("Couldn't save your vote. Please try again.");
      return;
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

  const fetchComments = async (
    suggestionId: string,
    gen: number = genRef.current,
  ) => {
    setCommentsError(false);
    const { data, error } = await supabase
      .from('suggestion_comments')
      .select('*, profiles(display_name)')
      .eq('suggestion_id', suggestionId)
      .order('created_at', { ascending: true });
    // Drop the result if the club changed or the expanded suggestion changed
    // while we were fetching — otherwise a stale response overwrites the new
    // expansion's comments.
    if (gen !== genRef.current) return;
    if (expandedId !== null && expandedId !== suggestionId) return;
    if (error) {
      setCommentsError(true);
      return;
    }
    setComments((data as any) || []);
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || !expandedId || !user || postingComment) return;

    setPostingComment(true);
    const { error } = await supabase.from('suggestion_comments').insert({
      suggestion_id: expandedId,
      user_id: user.id,
      club_id: clubId,
      message: trimmed,
    } as any);
    setPostingComment(false);

    if (error) {
      // Keep the draft intact so the user can retry without retyping.
      toast.error("Couldn't post that comment. Please try again.");
      return;
    }
    setNewComment('');
    fetchComments(expandedId);
  };

  const deleteComment = async (id: string) => {
    if (deletingComment === id) return;
    setDeletingComment(id);
    const { error } = await supabase.from('suggestion_comments').delete().eq('id', id);
    setDeletingComment(null);
    if (error) {
      toast.error("Couldn't remove that comment. Please try again.");
      return;
    }
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
        {!userAlreadySuggested ? (
          <button
            type="button"
            onClick={() => setShowForm(f => !f)}
            aria-label="Suggest a book"
            aria-expanded={showForm}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-terracotta text-white shadow-md hover:bg-terracotta/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className={`h-4 w-4 transition-transform duration-200 ${showForm ? 'rotate-45' : ''}`} aria-hidden="true" />
          </button>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-body">
            <Info className="h-3 w-3" aria-hidden="true" />
            One suggestion per cycle
          </span>
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
          <label htmlFor="wl-title" className="sr-only">Book title</label>
          <input
            id="wl-title"
            name="wl-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Book title"
            aria-label="Book title"
            className="cozy-input w-full min-h-11"
            maxLength={200}
            required
          />
          <label htmlFor="wl-author" className="sr-only">Author</label>
          <input
            id="wl-author"
            name="wl-author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author"
            aria-label="Author"
            className="cozy-input w-full min-h-11"
            maxLength={200}
            required
          />
          <button type="submit" disabled={submitting} className="cozy-btn-primary w-full text-sm min-h-11 disabled:opacity-50">
            {submitting ? 'Adding…' : '🌟 Add Suggestion'}
          </button>
        </form>
      )}

      {suggestions.length > 0 ? (
        <div className="-mx-1 sm:h-72 sm:overflow-y-auto">
          <div className="divide-y divide-border/40 px-1">
          {suggestions.map((s) => (
            <div key={s.id}>
              <div className="group relative flex items-start gap-3 py-3 transition-colors hover:bg-cream/30 rounded-md px-1">
                <button
                  type="button"
                  onClick={() => toggleVote(s.id, s.user_voted)}
                  disabled={pendingVotes.has(s.id)}
                  aria-label={s.user_voted ? `Remove vote (${s.vote_count})` : `Vote (${s.vote_count})`}
                  aria-pressed={s.user_voted}
                  aria-busy={pendingVotes.has(s.id)}
                  className="flex flex-col items-center justify-center gap-0.5 min-h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-ring rounded disabled:opacity-60 disabled:cursor-wait"
                >
                  <ThumbsUp
                    className={`h-4 w-4 transition-all duration-200 ${
                      s.user_voted
                        ? 'fill-terracotta text-terracotta scale-110'
                        : 'text-muted-foreground hover:text-terracotta'
                    }`}
                    aria-hidden="true"
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
                  <p className="mt-0.5 text-[11px] text-muted-foreground font-body truncate">
                    <StyledName userId={s.user_id} name={(s.profiles as any)?.display_name || 'Reader'} />
                    {' · '}
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleComments(s.id)}
                    aria-label={expandedId === s.id ? 'Hide comments' : 'Show comments'}
                    aria-expanded={expandedId === s.id}
                    className={`inline-flex items-center justify-center min-h-11 min-w-11 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring ${expandedId === s.id ? 'text-terracotta bg-terracotta/10' : 'text-muted-foreground/70 hover:text-terracotta'}`}
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {(user?.id === s.user_id || isPrivileged) && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete({ type: 'suggestion', id: s.id })}
                      aria-label={isPrivileged && user?.id !== s.user_id ? 'Remove suggestion (admin)' : 'Delete suggestion'}
                      disabled={deletingSuggestion === s.id}
                      aria-busy={deletingSuggestion === s.id}
                      className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-md text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {expandedId === s.id && (
                <div className="ml-8 mt-0 mb-3 space-y-1.5 border-l-2 border-terracotta/20 pl-4">
                  {commentsError ? (
                    <p className="py-2 text-xs text-destructive font-body">Couldn't load comments.</p>
                  ) : comments.length === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground font-body">No comments yet</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 text-xs font-body">
                        <div className="flex-1">
                          <StyledName userId={c.user_id} name={(c.profiles as any)?.display_name || 'Reader'} className="font-semibold text-[11px]" />
                          <span className="text-[11px] text-muted-foreground"> · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                          <p className="mt-0.5 text-xs">{c.message}</p>
                        </div>
                        {(user?.id === c.user_id || isPrivileged) && (
                          <button
                            type="button"
                            onClick={() => setPendingDelete({ type: 'comment', id: c.id })}
                            aria-label="Delete comment"
                            disabled={deletingComment === c.id}
                            aria-busy={deletingComment === c.id}
                            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-md text-muted-foreground/70 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  <form onSubmit={addComment} className="flex gap-1.5 pt-1">
                    <label htmlFor={`wl-cmt-${s.id}`} className="sr-only">Add a comment</label>
                    <input
                      id={`wl-cmt-${s.id}`}
                      name={`wl-cmt-${s.id}`}
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      aria-label="Add a comment"
                      disabled={postingComment}
                      className="cozy-input flex-1 text-xs min-h-11 disabled:opacity-60"
                      maxLength={300}
                    />
                    <button
                      type="submit"
                      aria-label="Send comment"
                      disabled={postingComment || !newComment.trim()}
                      aria-busy={postingComment}
                      className="cozy-btn-primary inline-flex items-center justify-center min-h-11 min-w-11 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
          </div>
        </div>

      ) : loading ? (
        <p role="status" aria-live="polite" className="py-4 text-center text-sm text-muted-foreground font-body">
          Loading suggestions…
        </p>
      ) : loadError ? (
        <div role="alert" className="py-4 text-center text-sm text-destructive font-body">
          {loadError}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => fetchSuggestions()}
              className="min-h-11 px-3 rounded-lg border border-border bg-card text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try again
            </button>
          </div>
        </div>
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

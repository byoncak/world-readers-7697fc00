import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEquippedFrame, parseInlineStyle } from '@/hooks/useEquippedFrame';
import { useEquippedCosmetics } from '@/hooks/useEquippedCosmetics';
import { BookOpen, Send, Book, BookHeart, MessageCircle, Edit2, Check, X, Camera, Plus, Trash2, Trophy, Mail, LogOut, SendHorizonal } from 'lucide-react';
import CollapsibleSection from '@/components/CollapsibleSection';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';
import AchievementsPanel from '@/components/AchievementsPanel';
import { searchGoogleBooks, type BookSearchResult } from '@/lib/googleBooks';
import ReadingTimelineShare from '@/components/ReadingTimelineShare';
import { useClub } from '@/contexts/ClubContext';

import StyledName from '@/components/StyledName';
import ElectricBorder from '@/components/ElectricBorder';
import ChromeBorder from '@/components/ChromeBorder';
import DarkMagicBorder from '@/components/DarkMagicBorder';
import HolographicBorder from '@/components/HolographicBorder';
import StarryNightBorder from '@/components/StarryNightBorder';

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface ReadingProgressItem {
  book_id: string;
  current_page: number;
  books: { title: string; author: string; total_pages: number | null; status: string } | null;
}

interface SuggestionItem {
  id: string;
  suggestion_title: string;
  suggestion_author: string;
  created_at: string;
}

interface DiscussionItem {
  id: string;
  message: string;
  created_at: string;
  books: { title: string } | null;
}

interface Recommendation {
  id: string;
  title: string;
  author: string;
  message: string | null;
  created_at: string;
  from_user_id: string;
}

interface PersonalBook {
  id: string;
  title: string;
  author: string;
  total_pages: number | null;
  current_page: number;
  finished_at?: string | null;
}

const MemberProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { clubPath, clubId } = useClub();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<ReadingProgressItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [personalBooks, setPersonalBooks] = useState<PersonalBook[]>([]);
  const [showRecommendForm, setShowRecommendForm] = useState(false);
  const [recTitle, setRecTitle] = useState('');
  const [recAuthor, setRecAuthor] = useState('');
  const [recMessage, setRecMessage] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookPages, setNewBookPages] = useState('');
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<BookSearchResult[]>([]);
  const [searchingBooks, setSearchingBooks] = useState(false);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const [pageDrafts, setPageDrafts] = useState<Record<string, string>>({});
  const [personalCompletedClubBooks, setPersonalCompletedClubBooks] = useState<Set<string>>(new Set());
  const [editingYearKey, setEditingYearKey] = useState<string | null>(null);
  const [yearDraft, setYearDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frame = useEquippedFrame(userId);
  const cosmetics = useEquippedCosmetics(userId);
  const progressBarClass = cosmetics?.progressBarClass || '';
  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) fetchAll();
  }, [userId]);

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
      } catch {
        // ignore (likely aborted)
      } finally {
        setSearchingBooks(false);
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [bookQuery]);

  const fetchPersonalCompletions = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('personal_book_completions')
      .select('book_id')
      .eq('user_id', userId);
    if (data) setPersonalCompletedClubBooks(new Set(data.map((r: any) => r.book_id)));
  };

  const togglePersonalComplete = async (bookId: string) => {
    if (!user || !userId || user.id !== userId) return;
    const isMarked = personalCompletedClubBooks.has(bookId);
    if (isMarked) {
      const { error } = await supabase
        .from('personal_book_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId);
      if (error) { toast.error('Failed to update'); return; }
      setPersonalCompletedClubBooks(prev => {
        const next = new Set(prev); next.delete(bookId); return next;
      });
    } else {
      const { error } = await supabase
        .from('personal_book_completions')
        .insert({ user_id: user.id, book_id: bookId });
      if (error) { toast.error('Failed to update'); return; }
      setPersonalCompletedClubBooks(prev => new Set([...prev, bookId]));
      toast.success('Marked as finished! 🎉');
    }
  };

  const fetchAll = async () => {
    const { data: p } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, bio')
      .eq('user_id', userId!)
      .single();
    if (p) {
      setProfile(p as Profile);
      setBioText((p as Profile).bio || '');
    }

    const { data: rp } = await supabase
      .from('reading_progress')
      .select('book_id, current_page, books(title, author, total_pages, status, meeting_date)')
      .eq('user_id', userId!);
    if (rp) setProgress(rp as any);

    const { data: s } = await supabase
      .from('book_votes')
      .select('id, suggestion_title, suggestion_author, created_at')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .limit(10);
    if (s) setSuggestions(s);

    const { data: d } = await supabase
      .from('discussions')
      .select('id, message, created_at, books(title)')
      .eq('user_id', userId!)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(10);
    if (d) setDiscussions(d as any);

    // Personal books
    const { data: pb } = await supabase
      .from('personal_books')
      .select('id, title, author, total_pages, current_page, finished_at')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false });
    if (pb) setPersonalBooks(pb);

    await fetchPersonalCompletions();

    if (user?.id === userId) {
      const { data: recs } = await supabase
        .from('book_recommendations')
        .select('id, title, author, message, created_at, from_user_id')
        .eq('to_user_id', userId!)
        .order('created_at', { ascending: false });
      if (recs) setRecommendations(recs as any);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB.'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: url } : prev);
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  const sendRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitle.trim() || !recAuthor.trim() || !user || !userId) return;
    const { error } = await supabase.from('book_recommendations').insert({
      from_user_id: user.id, to_user_id: userId,
      title: recTitle.trim(), author: recAuthor.trim(),
      message: recMessage.trim() || null,
      club_id: clubId,
    });
    if (error) { toast.error('Failed to send recommendation'); }
    else {
      toast.success('Book recommendation sent! 📚');
      setRecTitle(''); setRecAuthor(''); setRecMessage('');
      setShowRecommendForm(false);
    }
  };

  const saveBio = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ bio: bioText.trim() || null }).eq('user_id', user.id);
    if (error) { toast.error('Failed to update bio'); }
    else {
      setProfile(prev => prev ? { ...prev, bio: bioText.trim() || null } : prev);
      setEditingBio(false);
      toast.success('Bio updated! 🌿');
    }
  };

  const addPersonalBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim() || !newBookAuthor.trim() || !user) return;
    const { error } = await supabase.from('personal_books').insert({
      user_id: user.id,
      title: newBookTitle.trim(),
      author: newBookAuthor.trim(),
      total_pages: newBookPages ? parseInt(newBookPages) : null,
    });
    if (error) { toast.error('Failed to add book'); }
    else {
      toast.success('Book added! 📖');
      setNewBookTitle(''); setNewBookAuthor(''); setNewBookPages('');
      setBookQuery(''); setBookResults([]);
      setShowAddBook(false);
      fetchAll();
    }
  };

  const updatePersonalProgress = async (bookId: string, page: number) => {
    const { error } = await supabase.from('personal_books').update({ current_page: page, updated_at: new Date().toISOString() }).eq('id', bookId);
    if (!error) {
      setPersonalBooks(prev => prev.map(b => b.id === bookId ? { ...b, current_page: page } : b));
    }
  };

  const deletePersonalBook = async () => {
    if (!deleteBookId) return;
    const { error } = await supabase.from('personal_books').delete().eq('id', deleteBookId);
    if (!error) {
      setPersonalBooks(prev => prev.filter(b => b.id !== deleteBookId));
      toast.success('Book removed');
    }
    setDeleteBookId(null);
  };

  const togglePersonalBookFinished = async (bookId: string, finish: boolean) => {
    const finished_at = finish ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('personal_books')
      .update({ finished_at, updated_at: new Date().toISOString() })
      .eq('id', bookId);
    if (error) { toast.error('Failed to update'); return; }
    setPersonalBooks(prev => prev.map(b => b.id === bookId ? { ...b, finished_at } : b));
    if (finish) toast.success('Marked as finished! 🎉');
  };

  const buildDateWithYear = (yearStr: string, existing: string | null): string | null => {
    const y = parseInt(yearStr, 10);
    if (!y || y < 1000 || y > 9999) return null;
    const base = existing ? new Date(existing) : new Date();
    base.setFullYear(y);
    return base.toISOString();
  };

  const saveYear = async (key: string, bookId: string, existing: string | null) => {
    const iso = buildDateWithYear(yearDraft, existing);
    setEditingYearKey(null);
    if (!iso) return;
    const { error } = await supabase.from('books').update({ meeting_date: iso }).eq('id', bookId);
    if (error) { toast.error("Can't edit this book's year"); return; }
    setProgress(prev => prev.map(p => p.book_id === bookId
      ? { ...p, books: p.books ? { ...p.books, meeting_date: iso } as any : p.books }
      : p));
    toast.success('Year updated');
  };

  const savePersonalYear = async (key: string, id: string, existing: string | null | undefined) => {
    const iso = buildDateWithYear(yearDraft, existing ?? null);
    setEditingYearKey(null);
    if (!iso) return;
    const { error } = await supabase
      .from('personal_books')
      .update({ finished_at: iso, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setPersonalBooks(prev => prev.map(b => b.id === id ? { ...b, finished_at: iso } : b));
    toast.success('Year updated');
  };

  if (!user) return null;

  const activePersonalBooks = personalBooks.filter(b => !b.finished_at);
  const finishedPersonalBooks = personalBooks.filter(b => !!b.finished_at);

  const currentBooks = progress.filter(p =>
    p.books?.status === 'current' && !personalCompletedClubBooks.has(p.book_id)
  );
  const pastBooks = progress.filter(p =>
    p.books?.status !== 'current' || personalCompletedClubBooks.has(p.book_id)
  );

  return (
    <>


      <main className="mx-auto max-w-5xl px-4 py-6 pb-20 sm:pb-6 animate-page-in">
        {!profile ? (
          <p className="py-12 text-center text-muted-foreground font-body">Member not found.</p>
        ) : (
          <div className="space-y-5">
            {/* Profile Header */}
            <div className="cozy-card relative flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {/* DM shortcut for own profile only — top-right of card */}
              {isOwnProfile && (
                <Link to={clubPath('/inbox')} title="My Messages" className="absolute top-4 right-4 inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 transition-all duration-200 shadow-sm">
                  <SendHorizonal className="h-4 w-4" />
                </Link>
              )}
              {(() => {
                const useSparkles = frame?.animation_class === 'animate-starry-twinkle';
                const isElectric = frame?.animation_class === 'animate-electric-border';
                const isChrome = frame?.animation_class === 'animate-chrome-ring';
                const isDarkMagic = frame?.animation_class === 'animate-dark-magic';
                const isHolographic = frame?.animation_class === 'animate-holographic-ring';

                const avatarButton = (extraClass?: string, extraStyle?: React.CSSProperties) => (
                  <button
                    onClick={() => isOwnProfile && fileInputRef.current?.click()}
                    className={`relative h-full w-full rounded-full bg-peach overflow-hidden transition-all ${isOwnProfile ? 'cursor-pointer hover:shadow-lg group' : 'cursor-default'} ${extraClass || ''}`}
                    style={extraStyle}
                    disabled={uploading}
                    title={isOwnProfile ? 'Change profile picture' : undefined}
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-terracotta">
                        {(profile.display_name || '?')[0].toUpperCase()}
                      </span>
                    )}
                    {isOwnProfile && (
                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/20">
                        <Camera className="h-5 w-5 text-background opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    )}
                  </button>
                );

                let avatarElement: React.ReactNode;

                if (isElectric) {
                  avatarElement = (
                    <ElectricBorder size="lg" variantKey={frame?.variant_key}>
                      {avatarButton()}
                    </ElectricBorder>
                  );
                } else if (isChrome) {
                  avatarElement = (
                    <ChromeBorder size="lg">
                      {avatarButton()}
                    </ChromeBorder>
                  );
                } else if (isDarkMagic) {
                  avatarElement = (
                    <DarkMagicBorder size="lg">
                      {avatarButton()}
                    </DarkMagicBorder>
                  );
                } else if (isHolographic) {
                  avatarElement = (
                    <HolographicBorder size="lg">
                      {avatarButton()}
                    </HolographicBorder>
                  );
                } else if (frame?.gradient) {
                  avatarElement = (
                    <div
                      className={`relative h-20 w-20 shrink-0 rounded-full ${!useSparkles ? (frame.animation_class || 'animate-chrome-shimmer') : ''}`}
                      style={{ background: frame.gradient, padding: '3px', boxShadow: frame.box_shadow || undefined }}
                    >
                      <div className="relative z-[2] h-full w-full rounded-full overflow-hidden">
                        {avatarButton()}
                      </div>
                    </div>
                  );
                } else {
                  avatarElement = (
                    <div className="relative h-20 w-20 shrink-0 rounded-full">
                      {avatarButton(undefined, frame ? parseInlineStyle(frame.border_style) : { border: '2px solid hsl(var(--border))' })}
                    </div>
                  );
                }

                return useSparkles ? <Sparkles color="#c7d2fe">{avatarElement}</Sparkles> : avatarElement;
              })()}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />

              <div className="flex-1 text-center sm:text-left">
                {isOwnProfile && editingName ? (
                  <div className="flex items-center justify-center sm:justify-start gap-2 w-full">
                    <input
                      type="text"
                      value={nameText}
                      onChange={(e) => setNameText(e.target.value)}
                      className="cozy-input text-lg font-bold min-w-0 flex-1"
                      placeholder="Display name"
                      maxLength={30}
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        if (!nameText.trim() || !user) return;
                        const { error } = await supabase.from('profiles').update({ display_name: nameText.trim() }).eq('user_id', user.id);
                        if (error) { toast.error('Failed to update name'); }
                        else {
                          setProfile(prev => prev ? { ...prev, display_name: nameText.trim() } : prev);
                          setEditingName(false);
                          toast.success('Name updated! ✨');
                        }
                      }}
                      className="cozy-btn-primary p-2 shrink-0"
                    ><Check className="h-4 w-4" /></button>
                    <button onClick={() => { setEditingName(false); setNameText(profile.display_name || ''); }} className="cozy-btn-ghost p-2 shrink-0"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <h2 className="cozy-title text-3xl inline-flex items-center gap-2">
                    <StyledName userId={profile.user_id} name={profile.display_name || 'Reader'} showBadge showTitle />
                    {isOwnProfile && (
                      <button onClick={() => { setNameText(profile.display_name || ''); setEditingName(true); }} className="text-muted-foreground/50 hover:text-terracotta transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </h2>
                )}
                {isOwnProfile && editingBio ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input type="text" value={bioText} onChange={(e) => setBioText(e.target.value)} className="cozy-input flex-1" placeholder="Write a short bio..." maxLength={160} />
                    <button onClick={saveBio} className="cozy-btn-primary p-2"><Check className="h-4 w-4" /></button>
                    <button onClick={() => { setEditingBio(false); setBioText(profile.bio || ''); }} className="cozy-btn-ghost p-2"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  (profile.bio || isOwnProfile) ? (
                    <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
                      <p className="text-sm text-muted-foreground font-body text-center sm:text-left">
                        {profile.bio || 'No bio yet — add one!'}
                      </p>
                      {isOwnProfile && (
                        <button onClick={() => setEditingBio(true)} className="text-muted-foreground/50 hover:text-terracotta transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ) : null
                )}
              </div>
            </div>

            {/* Action buttons (recommend + DM) — below profile header for non-own profiles */}
            {!isOwnProfile && (
              <div className="flex items-stretch gap-2 flex-nowrap w-full">
                <button onClick={() => setShowRecommendForm(!showRecommendForm)} className="cozy-btn-primary flex-1 flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                  <BookHeart className="h-4 w-4" /> Recommend a Book
                </button>
                <button onClick={() => navigate(`/inbox?chat=${profile.user_id}`)} className="cozy-btn-primary flex-1 flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                  <SendHorizonal className="h-4 w-4" /> Message
                </button>
              </div>
            )}

            {/* Achievements & Inventory */}
            {userId && <AchievementsPanel userId={userId} isOwnProfile={isOwnProfile} />}

            {/* Recommend Form */}
            {showRecommendForm && !isOwnProfile && (
              <form onSubmit={sendRecommendation} className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground font-body">
                  Recommend a book to {profile.display_name || 'this member'}
                </p>
                <input
                  type="text"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  className="w-full border-0 bg-transparent px-0 py-1 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                  placeholder="Book title"
                  required
                />
                <input
                  type="text"
                  value={recAuthor}
                  onChange={(e) => setRecAuthor(e.target.value)}
                  className="w-full border-0 bg-transparent px-0 py-1 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                  placeholder="Author"
                  required
                />
                <input
                  type="text"
                  value={recMessage}
                  onChange={(e) => setRecMessage(e.target.value)}
                  className="w-full border-0 bg-transparent px-0 py-1 text-sm italic font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                  placeholder="Why you think they'd love it… (optional)"
                  maxLength={300}
                />
                <div className="flex items-center justify-end gap-1 border-t border-border/30 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecommendForm(false)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" /> Send
                  </button>
                </div>
              </form>
            )}


            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Currently Reading (combined club + personal) */}
              <CollapsibleSection
                icon={<BookOpen className="h-5 w-5 text-terracotta" />}
                title="Currently Reading"
                defaultOpen={true}
                badge={currentBooks.length + activePersonalBooks.length || null}
              >
                <div className="flex items-center justify-end -mt-1 mb-2">
                  {isOwnProfile && (
                    <button onClick={() => setShowAddBook(!showAddBook)} className="cozy-btn-ghost p-1.5 text-muted-foreground hover:text-terracotta">
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {isOwnProfile && showAddBook && (
                  <form onSubmit={addPersonalBook} className="mb-3 space-y-2 rounded-lg border border-border/50 bg-card p-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={bookQuery}
                        onChange={(e) => setBookQuery(e.target.value)}
                        className="w-full border-0 bg-transparent px-0 py-1 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                        placeholder="Search a book to autofill…"
                      />
                      {bookQuery.trim().length >= 2 && (bookResults.length > 0 || searchingBooks) && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                          {searchingBooks && bookResults.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground font-body">Searching…</div>
                          )}
                          {bookResults.map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setNewBookTitle(r.title);
                                setNewBookAuthor(r.author);
                                setNewBookPages(r.pages ? String(r.pages) : '');
                                setBookResults([]);
                                setBookQuery('');
                              }}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-cream font-body"
                            >
                              <div className="font-semibold text-foreground truncate">{r.title}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {r.author || 'Unknown author'}{r.pages ? ` · ${r.pages} pages` : ''}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input type="text" value={newBookTitle} onChange={(e) => setNewBookTitle(e.target.value)} className="w-full border-0 bg-transparent px-0 py-1 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0" placeholder="Book title" required />
                    <input type="text" value={newBookAuthor} onChange={(e) => setNewBookAuthor(e.target.value)} className="w-full border-0 bg-transparent px-0 py-1 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0" placeholder="Author" required />
                    <input type="number" value={newBookPages} onChange={(e) => setNewBookPages(e.target.value)} className="w-full border-0 bg-transparent px-0 py-1 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0" placeholder="Total pages (optional)" min="1" />
                    <div className="flex items-center justify-end gap-1 border-t border-border/30 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddBook(false)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                )}

                {currentBooks.length === 0 && activePersonalBooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body py-4 text-center">
                    {isOwnProfile ? 'Not reading anything yet — add a book! 📚' : 'Not reading anything right now 🌙'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {currentBooks.map(p => {
                      const isComplete = p.books?.total_pages && p.current_page >= p.books.total_pages;
                      return (
                        <div key={p.book_id} className={`relative rounded-xl bg-cream p-3 ${isComplete ? 'ring-2 ring-inset ring-soft-gold/50' : ''}`}>
                          <p className="font-semibold text-sm text-foreground font-body pr-1">{p.books?.title}</p>
                          <p className="text-xs text-muted-foreground font-body">{p.books?.author}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 pr-1">
                            <span className="cozy-badge cozy-badge-sage text-[10px]">Book Club</span>
                            {isComplete && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-soft-gold/20 px-2 py-0.5 text-[10px] font-semibold text-soft-gold ring-1 ring-soft-gold/30">
                                <Trophy className="h-3 w-3" /> 100%
                              </span>
                            )}
                          </div>
                          {p.books?.total_pages && (
                            <div className="mt-2">
                              <div className={`progress-bar-watercolor ${progressBarClass} ${isComplete ? 'ring-2 ring-inset ring-soft-gold/50 rounded-full' : ''}`}>
                                <div className={`fill ${isComplete ? '!bg-soft-gold' : ''}`} style={{ width: `${Math.min((p.current_page / p.books.total_pages) * 100, 100)}%` }} />
                              </div>
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <p className="text-xs text-muted-foreground font-body">
                                  {isComplete ? '🎉 Complete!' : `${p.current_page} / ${p.books.total_pages} pages`}
                                </p>
                                {isComplete && isOwnProfile && (
                                  <button
                                    onClick={() => togglePersonalComplete(p.book_id)}
                                    className="ml-auto text-[11px] font-semibold text-terracotta hover:underline font-body"
                                    title="Hide from your Currently Reading list"
                                  >
                                    Mark as finished
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {activePersonalBooks.map(b => {
                      const isPersonalComplete = b.total_pages && b.current_page >= b.total_pages;
                      return (
                      <div key={b.id} className={`relative rounded-xl bg-cream p-3 ${isPersonalComplete ? 'ring-2 ring-inset ring-soft-gold/50' : ''}`}>
                        {isOwnProfile && (
                          <button
                            onClick={() => setDeleteBookId(b.id)}
                            className="absolute right-2 top-2 text-muted-foreground/40 hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground font-body pr-5">{b.title}</p>
                          {isPersonalComplete && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-soft-gold/20 px-2 py-0.5 text-[10px] font-semibold text-soft-gold ring-1 ring-soft-gold/30">
                              <Trophy className="h-3 w-3" /> 100%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-body">{b.author}</p>
                        {b.total_pages && (
                          <div className="mt-2">
                            <div className={`progress-bar-watercolor ${progressBarClass}`}>
                              <div className="fill" style={{ width: `${Math.min((b.current_page / b.total_pages) * 100, 100)}%` }} />
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              {isOwnProfile ? (
                                <>
                                  <input
                                    type="number"
                                    value={pageDrafts[b.id] ?? String(b.current_page)}
                                    onChange={(e) => setPageDrafts(prev => ({ ...prev, [b.id]: e.target.value }))}
                                    className="w-14 rounded-lg border border-border bg-card px-1.5 py-0.5 text-xs text-center"
                                    min="0"
                                    max={b.total_pages}
                                  />
                                  {(pageDrafts[b.id] !== undefined && pageDrafts[b.id] !== String(b.current_page)) && (
                                    <button
                                      onClick={() => {
                                        const val = Math.max(0, Math.min(b.total_pages!, parseInt(pageDrafts[b.id]) || 0));
                                        updatePersonalProgress(b.id, val);
                                        setPageDrafts(prev => {
                                          const next = { ...prev };
                                          delete next[b.id];
                                          return next;
                                        });
                                      }}
                                      className="cozy-btn-primary text-xs px-2 py-0.5"
                                    >
                                      Save
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground font-body">{b.current_page}</span>
                              )}
                              <span className="text-xs text-muted-foreground font-body">/ {b.total_pages} pages</span>
                              <span className="ml-auto text-xs font-semibold text-terracotta font-body">
                                {Math.round(Math.min((b.current_page / b.total_pages) * 100, 100))}%
                              </span>
                            </div>
                          </div>
                        )}
                        {isOwnProfile && (
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => togglePersonalBookFinished(b.id, true)}
                              className="text-[11px] font-semibold text-terracotta hover:underline font-body"
                            >
                              Mark as finished
                            </button>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleSection>

              {/* Books Read */}
              <CollapsibleSection
                icon={<Book className="h-5 w-5 text-secondary" />}
                title="Books Read"
                badge={pastBooks.length + finishedPersonalBooks.length || null}
              >

              {/* Books Read content */}
                {pastBooks.length === 0 && finishedPersonalBooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body py-4 text-center">No past books yet 📖</p>
                ) : (
                  (() => {
                    type ReadItem =
                      | { kind: 'club'; year: number | null; data: typeof pastBooks[number] }
                      | { kind: 'personal'; year: number | null; data: typeof finishedPersonalBooks[number] };
                    const items: ReadItem[] = [
                      ...pastBooks.map((p): ReadItem => {
                        const md = (p.books as any)?.meeting_date as string | null;
                        return { kind: 'club', year: md ? new Date(md).getFullYear() : null, data: p };
                      }),
                      ...finishedPersonalBooks.map((b): ReadItem => ({
                        kind: 'personal',
                        year: b.finished_at ? new Date(b.finished_at).getFullYear() : null,
                        data: b,
                      })),
                    ];
                    const shareItems = items.map((it) =>
                      it.kind === 'club'
                        ? { title: it.data.books?.title || 'Untitled', author: it.data.books?.author || '', year: it.year }
                        : { title: it.data.title, author: it.data.author, year: it.year }
                    );
                    const groups = new Map<number | 'unknown', ReadItem[]>();
                    items.forEach(it => {
                      const k = it.year ?? 'unknown';
                      if (!groups.has(k)) groups.set(k, []);
                      groups.get(k)!.push(it);
                    });
                    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
                      if (a === 'unknown') return 1;
                      if (b === 'unknown') return -1;
                      return (b as number) - (a as number);
                    });
                    const renderClub = (p: typeof pastBooks[number]) => {
                      const isComplete = p.books?.total_pages && p.current_page >= p.books.total_pages;
                      const isPersonallyMarked = personalCompletedClubBooks.has(p.book_id);
                      const meetingDate = (p.books as any)?.meeting_date as string | null;
                      const year = meetingDate ? new Date(meetingDate).getFullYear() : null;
                      const yk = `club:${p.book_id}`;
                      return (
                        <div key={p.book_id} className="rounded-xl bg-sage/30 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground font-body">{p.books?.title}</p>
                            {editingYearKey === yk ? (
                              <input
                                autoFocus
                                type="number"
                                value={yearDraft}
                                onChange={(e) => setYearDraft(e.target.value)}
                                onBlur={() => saveYear(yk, p.book_id, meetingDate)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveYear(yk, p.book_id, meetingDate);
                                  if (e.key === 'Escape') setEditingYearKey(null);
                                }}
                                className="w-16 text-[11px] font-semibold bg-background border border-border rounded px-1 py-0.5 font-body"
                              />
                            ) : year ? (
                              <span
                                className={`text-[11px] font-semibold text-muted-foreground font-body ${isOwnProfile ? 'cursor-pointer hover:text-foreground' : ''}`}
                                onClick={() => {
                                  if (!isOwnProfile) return;
                                  setYearDraft(String(year));
                                  setEditingYearKey(yk);
                                }}
                              >
                                {year}
                              </span>
                            ) : isOwnProfile ? (
                              <button
                                onClick={() => { setYearDraft(String(new Date().getFullYear())); setEditingYearKey(yk); }}
                                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground font-body"
                              >
                                + year
                              </button>
                            ) : null}
                            {isComplete && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-soft-gold/20 px-2 py-0.5 text-[10px] font-semibold text-soft-gold ring-1 ring-soft-gold/30">
                                <Trophy className="h-3 w-3" /> 100%
                              </span>
                            )}
                            {isPersonallyMarked && isOwnProfile && (
                              <button
                                onClick={() => togglePersonalComplete(p.book_id)}
                                className="ml-auto text-[11px] font-semibold text-terracotta hover:underline font-body"
                                title="Move back to Currently Reading"
                              >
                                Unmark
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-body">{p.books?.author}</p>
                        </div>
                      );
                    };
                    const renderPersonal = (b: typeof finishedPersonalBooks[number]) => (
                      <div key={b.id} className="rounded-xl bg-sage/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground font-body">{b.title}</p>
                          {(() => {
                            const yk = `pb:${b.id}`;
                            const yr = b.finished_at ? new Date(b.finished_at).getFullYear() : null;
                            if (editingYearKey === yk) {
                              return (
                                <input
                                  autoFocus
                                  type="number"
                                  value={yearDraft}
                                  onChange={(e) => setYearDraft(e.target.value)}
                                  onBlur={() => savePersonalYear(yk, b.id, b.finished_at)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') savePersonalYear(yk, b.id, b.finished_at);
                                    if (e.key === 'Escape') setEditingYearKey(null);
                                  }}
                                  className="w-16 text-[11px] font-semibold bg-background border border-border rounded px-1 py-0.5 font-body"
                                />
                              );
                            }
                            return yr ? (
                              <span
                                className={`text-[11px] font-semibold text-muted-foreground font-body ${isOwnProfile ? 'cursor-pointer hover:text-foreground' : ''}`}
                                onClick={() => {
                                  if (!isOwnProfile) return;
                                  setYearDraft(String(yr));
                                  setEditingYearKey(yk);
                                }}
                              >
                                {yr}
                              </span>
                            ) : null;
                          })()}
                          {isOwnProfile && (
                            <button
                              onClick={() => togglePersonalBookFinished(b.id, false)}
                              className="ml-auto text-[11px] font-semibold text-terracotta hover:underline font-body"
                              title="Move back to Currently Reading"
                            >
                              Unmark
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-body">{b.author}</p>
                      </div>
                    );
                    return (
                      <div className="space-y-4">
                        {isOwnProfile && shareItems.length > 0 && (
                          <div className="flex justify-end">
                            <ReadingTimelineShare
                              items={shareItems}
                              displayName={profile?.display_name || 'My'}
                            />
                          </div>
                        )}
                        {sortedKeys.map(k => (
                          <div key={String(k)} className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body px-1">
                              {k === 'unknown' ? 'Year unknown' : k}
                            </h3>
                            <div className="space-y-2">
                              {groups.get(k)!.map(it =>
                                it.kind === 'club' ? renderClub(it.data) : renderPersonal(it.data)
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </CollapsibleSection>

              {/* Suggestions */}
              <CollapsibleSection
                icon={<BookOpen className="h-5 w-5 text-soft-gold" />}
                title="Book Suggestions"
                badge={suggestions.length || null}
              >
                {suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body py-4 text-center">No suggestions yet 🌿</p>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map(s => (
                      <div key={s.id} className="rounded-xl bg-lavender/30 px-3 py-2">
                        <p className="text-sm font-semibold text-foreground font-body">{s.suggestion_title}</p>
                        <p className="text-xs text-muted-foreground font-body">{s.suggestion_author}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Recent Discussions */}
              <CollapsibleSection
                icon={<MessageCircle className="h-5 w-5 text-terracotta" />}
                title="Recent Discussions"
                badge={discussions.length || null}
                className="md:col-span-2"
              >
                {discussions.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body py-4 text-center">No posts yet 💬</p>
                ) : (
                  <div className="space-y-2">
                    {discussions.map(d => (
                      <div key={d.id} className="speech-bubble">
                        <p className="text-sm font-body">{d.message}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {d.books && <span className="font-semibold">{(d.books as any).title}</span>}
                          <span className="opacity-60">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            </div>

            {/* Recommendations received */}
            {isOwnProfile && recommendations.length > 0 && (
              <div className="cozy-card">
                <div className="mb-3 flex items-center gap-2">
                  <Send className="h-5 w-5 text-terracotta" />
                  <h3 className="cozy-title text-xl">Books Recommended to You</h3>
                </div>
                <div className="space-y-3">
                  {recommendations.map(r => (
                    <div key={r.id} className="rounded-xl bg-peach/40 p-3">
                      <p className="text-sm font-semibold text-foreground font-body">{r.title}</p>
                      <p className="text-xs text-muted-foreground font-body">by {r.author}</p>
                      {r.message && <p className="mt-1 text-sm text-muted-foreground font-body italic">"{r.message}"</p>}
                      <p className="mt-1 text-xs text-muted-foreground/60 font-body">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Sign Out — own profile only */}
            {isOwnProfile && (
              <div className="flex justify-start mt-2">
                <button onClick={signOut} className="cozy-btn-ghost flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteBookId}
        title="Remove this book?"
        message="This will remove the book from your personal reading list."
        confirmLabel="Remove"
        onConfirm={deletePersonalBook}
        onCancel={() => setDeleteBookId(null)}
      />
    </>
  );
};

export default MemberProfile;

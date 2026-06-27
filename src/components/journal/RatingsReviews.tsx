import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserAvatar from '@/components/UserAvatar';
import StyledName from '@/components/StyledName';
import { shortenTitle } from '@/lib/utils';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
}

interface Rating {
  id: string;
  user_id: string;
  book_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

const StarRating = ({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <button
        key={n}
        type="button"
        disabled={readonly}
        onClick={() => onChange?.(n)}
        className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
      >
        <Star className={`h-4 w-4 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      </button>
    ))}
  </div>
);

const RatingsReviews = () => {
  const { user } = useAuth();
  const [completedBooks, setCompletedBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState('');
  const [editing, setEditing] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('books')
        .select('id, title, author, cover_url')
        .eq('status', 'completed')
        .order('meeting_date', { ascending: false, nullsFirst: false });
      setCompletedBooks(data || []);
      if (data?.length) setSelectedBook(data[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedBook) return;
    (async () => {
      const { data: ratingRows } = await supabase
        .from('book_ratings')
        .select('*')
        .eq('book_id', selectedBook)
        .order('created_at', { ascending: false });

      if (!ratingRows?.length) { setRatings([]); resetForm(); return; }

      const userIds = [...new Set(ratingRows.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setRatings(ratingRows.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || { display_name: null, avatar_url: null },
      })));

      const mine = ratingRows.find(r => r.user_id === user?.id);
      if (mine) {
        setMyRating(mine.rating);
        setMyReview(mine.review || '');
        setExistingId(mine.id);
        setEditing(false);
      } else {
        resetForm();
      }
    })();
  }, [selectedBook, user?.id]);

  const resetForm = () => {
    setMyRating(0);
    setMyReview('');
    setExistingId(null);
    setEditing(false);
  };

  const submit = async () => {
    if (!myRating || !selectedBook || !user) return;
    if (existingId) {
      await supabase.from('book_ratings').update({
        rating: myRating,
        review: myReview.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', existingId);
    } else {
      await supabase.from('book_ratings').insert({
        user_id: user.id,
        book_id: selectedBook,
        rating: myRating,
        review: myReview.trim() || null,
      });
    }
    setEditing(false);
    // Refresh
    const { data: ratingRows } = await supabase
      .from('book_ratings')
      .select('*')
      .eq('book_id', selectedBook)
      .order('created_at', { ascending: false });
    if (ratingRows) {
      const userIds = [...new Set(ratingRows.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setRatings(ratingRows.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || { display_name: null, avatar_url: null },
      })));
      const mine = ratingRows.find(r => r.user_id === user?.id);
      if (mine) { setExistingId(mine.id); setMyRating(mine.rating); setMyReview(mine.review || ''); }
    }
  };

  const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : null;

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!completedBooks.length) return <p className="py-8 text-center text-sm text-muted-foreground font-body">No completed books to rate yet 📖</p>;

  const book = completedBooks.find(b => b.id === selectedBook);

  return (
    <div className="space-y-3 pt-2">
      {/* Book selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {completedBooks.map(b => (
          <button
            key={b.id}
            onClick={() => setSelectedBook(b.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold font-body transition-colors ${
              selectedBook === b.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
            title={b.title}
          >
            {shortenTitle(b.title)}
          </button>
        ))}
      </div>

      {book && (
        <>
          {/* Avg rating */}
          {avgRating && (
            <div className="flex items-center gap-2 px-1">
              <StarRating value={Math.round(Number(avgRating))} readonly />
              <span className="text-sm font-semibold text-foreground">{avgRating}</span>
              <span className="text-xs text-muted-foreground">({ratings.length} {ratings.length === 1 ? 'review' : 'reviews'})</span>
            </div>
          )}

          {/* My rating */}
          <Card>
            <CardContent className="p-3 space-y-2">
              {existingId && !editing ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Your rating</span>
                    <StarRating value={myRating} readonly />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1 text-xs">
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{existingId ? 'Update' : 'Rate this book'}</span>
                    <StarRating value={myRating} onChange={setMyRating} />
                  </div>
                  <Textarea
                    value={myReview}
                    onChange={e => setMyReview(e.target.value)}
                    placeholder="Write a short review (optional)…"
                    className="min-h-[60px] resize-none text-sm leading-relaxed py-2"
                    maxLength={500}
                  />
                  <div className="flex justify-end gap-2">
                    {existingId && <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>}
                    <Button size="sm" disabled={!myRating} onClick={submit}>
                      {existingId ? 'Update' : 'Submit'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* All reviews */}
          <div className="space-y-2">
            {ratings.filter(r => r.review).map(r => (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <div className="flex gap-2.5">
                    <UserAvatar
                      userId={r.user_id}
                      avatarUrl={r.profile?.avatar_url ?? null}
                      displayName={r.profile?.display_name ?? null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StyledName
                          userId={r.user_id}
                          name={r.profile?.display_name || 'Reader'}
                          showBadge
                          className="text-sm font-semibold text-foreground font-body truncate"
                        />
                        <StarRating value={r.rating} readonly />
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground/80 font-body whitespace-pre-wrap">{r.review}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RatingsReviews;

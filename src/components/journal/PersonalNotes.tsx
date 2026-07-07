import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Lock, Trash2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LoadingBlock, ErrorBlock } from '@/components/StateBlock';

interface NoteItem {
  id: string;
  book_id: string;
  note_text: string;
  page_number: number | null;
  created_at: string;
  updated_at: string;
}

const PersonalNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [currentBook, setCurrentBook] = useState<{ id: string; title: string } | null>(null);
  const [text, setText] = useState('');
  const [page, setPage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError(false);
    const { data: book, error: bookErr } = await supabase
      .from('books')
      .select('id, title')
      .eq('status', 'current')
      .maybeSingle();

    if (bookErr) { setError(true); setLoading(false); return; }

    setCurrentBook(book);
    if (!book) { setNotes([]); setLoading(false); return; }

    const { data, error: notesErr } = await supabase
      .from('personal_notes')
      .select('*')
      .eq('book_id', book.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (notesErr) setError(true);
    else setNotes(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentBook || !user) return;
    await supabase.from('personal_notes').insert({
      user_id: user.id,
      book_id: currentBook.id,
      note_text: text.trim(),
      page_number: page ? parseInt(page) : null,
    });
    setText('');
    setPage('');
    fetchData();
  };

  const deleteNote = async (id: string) => {
    await supabase.from('personal_notes').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="py-8"><LoadingBlock label="Loading notes…" rows={3} /></div>;
  if (error) return <div className="py-8"><ErrorBlock message="Couldn't load your notes." onRetry={fetchData} /></div>;

  return (
    <div className="flex flex-col h-full pt-1">
      {/* Subtle privacy hint */}
      {currentBook && (
        <div className="flex items-center gap-1.5 px-1 mb-2">
          <Lock className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[11px] text-muted-foreground/70 font-body">
            Private to you · {currentBook.title}
          </span>
        </div>
      )}

      {currentBook ? (
        <>
          {/* Note input */}
          <div className="shrink-0 mb-3 rounded-lg border border-border/50 bg-card p-3">
            <form onSubmit={submit} className="space-y-2">
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Add a note…"
                className="min-h-[52px] resize-none text-sm leading-relaxed border-0 bg-transparent px-0 py-1 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
                maxLength={1000}
              />
              <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                <Input
                  type="number"
                  value={page}
                  onChange={e => setPage(e.target.value)}
                  placeholder="Page #"
                  className="h-8 w-20 bg-muted/30 px-2 text-xs border-border/40 rounded-md focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:ring-offset-0"
                  min={1}
                />
                <Button type="submit" size="sm" variant="ghost" disabled={!text.trim()} className="ml-auto h-7 px-3 text-xs text-primary hover:text-primary hover:bg-primary/10">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </form>
          </div>

          {notes.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground/50 font-body">
                No notes yet
              </p>
            </div>
          )}

          {/* Notes list — post-it style */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {notes.map(n => (
                <div
                  key={n.id}
                  className="group relative rounded-md bg-accent/40 border border-border/20 p-3 shadow-sm"
                  style={{ minHeight: '80px' }}
                >
                  <button
                    onClick={() => deleteNote(n.id)}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <p className="text-xs text-foreground/85 font-body whitespace-pre-wrap leading-relaxed pr-4">{n.note_text}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {n.page_number && (
                      <>
                        <span className="text-[10px] font-medium text-muted-foreground/60">p. {n.page_number}</span>
                        <span className="text-[10px] text-muted-foreground/30">·</span>
                      </>
                    )}
                    <span className="text-[10px] text-muted-foreground/40">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground/50 font-body">
            No current book selected yet
          </p>
        </div>
      )}
    </div>
  );
};

export default PersonalNotes;

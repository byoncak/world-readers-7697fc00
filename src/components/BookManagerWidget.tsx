import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClub } from '@/contexts/ClubContext';
import { useRole } from '@/hooks/useRole';
import {
  BookOpen,
  Plus,
  Trash2,
  ImagePlus,
  FileText,
  MoreHorizontal,
  Check,
  ExternalLink,
  X,
  Paperclip,
  Search,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { searchGoogleBooks, type BookSearchResult } from '@/lib/googleBooks';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Book {
  id: string;
  club_id: string | null;
  title: string;
  author: string;
  status: string;
  total_pages: number | null;
  cover_url: string | null;
  spine_art_url: string | null;
  pdf_url: string | null;
}

const BookManagerWidget = () => {
  const { clubId } = useClub();
  const { canManageCurrentClub } = useRole();
  const isAdmin = canManageCurrentClub;

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteStep2, setConfirmDeleteStep2] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [spineFile, setSpineFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyBookId, setBusyBookId] = useState<string | null>(null);
  const [pdfEditing, setPdfEditing] = useState<string | null>(null);
  const [pdfEditValue, setPdfEditValue] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Book search / autofill state
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null); // from search result
  const [coverFailed, setCoverFailed] = useState(false);
  // Fields the admin has manually edited — protected from autofill overwrite.
  const [touched, setTouched] = useState<{ title?: boolean; author?: boolean; pages?: boolean }>({});

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setTotalPages('');
    setCoverFile(null);
    setSpineFile(null);
    setPdfUrl('');
    setBookQuery('');
    setBookResults([]);
    setManualMode(false);
    setCoverUrl(null);
    setCoverFailed(false);
    setTouched({});
  };

  // Debounced book search — aborts stale requests.
  useEffect(() => {
    if (!showForm || manualMode) return;
    const q = bookQuery.trim();
    if (q.length < 2) {
      setBookResults([]);
      setSearching(false);
      setSearchError(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    setSearchError(false);
    const t = setTimeout(async () => {
      try {
        const results = await searchGoogleBooks(q, ctrl.signal);
        if (!ctrl.signal.aborted) setBookResults(results);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setSearchError(true);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [bookQuery, showForm, manualMode]);

  const applyResult = (r: BookSearchResult) => {
    // Choosing a new result explicitly = admin accepts these values.
    // Only preserve fields they've *manually* typed since the last selection.
    if (!touched.title) setTitle(r.title || '');
    if (!touched.author) setAuthor(r.author || '');
    if (!touched.pages) setTotalPages(r.pages ? String(r.pages) : '');
    setCoverUrl(r.coverUrl || null);
    setCoverFailed(false);
    setCoverFile(null); // remote cover takes precedence unless admin uploads
  };


  const uploadImage = async (
    file: File,
    bookId: string,
    type: 'cover' | 'spine',
  ): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const filePath = `${bookId}/${type}.${ext}`;
    const { error } = await supabase.storage
      .from('book-covers')
      .upload(filePath, file, { upsert: true });
    if (error) {
      toast.error(`Failed to upload ${type} image`);
      return null;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from('book-covers').getPublicUrl(filePath);
    return `${publicUrl}?t=${Date.now()}`;
  };

  const fetchBooks = useCallback(async () => {
    if (!clubId) {
      setBooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('books')
      .select('id, club_id, title, author, status, total_pages, cover_url, spine_art_url, pdf_url')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Could not load books for this club.');
      setBooks([]);
    } else {
      setBooks((data as Book[]) || []);
    }
    setLoading(false);
  }, [clubId]);

  // Reset immediately whenever the active club changes so stale rows never
  // flash on the new route.
  useEffect(() => {
    setBooks([]);
    setLoading(true);
    setShowForm(false);
    setPdfEditing(null);
    fetchBooks();
  }, [clubId, fetchBooks]);

  const uploadImageForExistingBook = async (
    file: File,
    book: Book,
    type: 'cover' | 'spine',
  ) => {
    if (book.club_id !== clubId) return; // defensive: never mutate another club
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }
    setBusyBookId(book.id);
    const url = await uploadImage(file, book.id, type);
    if (url) {
      const field = type === 'spine' ? 'spine_art_url' : 'cover_url';
      await supabase
        .from('books')
        .update({ [field]: url } as any)
        .eq('id', book.id)
        .eq('club_id', clubId);
      toast.success(`${type === 'spine' ? 'Spine art' : 'Cover art'} uploaded!`);
      fetchBooks();
    }
    setBusyBookId(null);
  };

  const removeAsset = async (book: Book, field: 'cover_url' | 'spine_art_url' | 'pdf_url') => {
    if (book.club_id !== clubId) return;
    await supabase
      .from('books')
      .update({ [field]: null } as any)
      .eq('id', book.id)
      .eq('club_id', clubId);
    fetchBooks();
  };

  const addBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) {
      toast.error('No club selected.');
      return;
    }
    if (!title.trim() || !author.trim()) return;
    setSaving(true);

    // Prefer an uploaded cover; fall back to the remote cover from search.
    const initialCoverUrl = coverFile ? null : (coverUrl && !coverFailed ? coverUrl : null);

    const { data: inserted, error } = await supabase
      .from('books')
      .insert({
        club_id: clubId,
        title: title.trim(),
        author: author.trim(),
        total_pages: totalPages ? parseInt(totalPages) : null,
        cover_url: initialCoverUrl,
        status: 'upcoming',
        pdf_url: pdfUrl.trim() || null,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      toast.error('Could not add the book.');
      setSaving(false);
      return;
    }

    if (spineFile) {
      const url = await uploadImage(spineFile, inserted.id, 'spine');
      if (url) {
        await supabase
          .from('books')
          .update({ spine_art_url: url } as any)
          .eq('id', inserted.id)
          .eq('club_id', clubId);
      }
    }
    if (coverFile) {
      const url = await uploadImage(coverFile, inserted.id, 'cover');
      if (url) {
        await supabase
          .from('books')
          .update({ cover_url: url })
          .eq('id', inserted.id)
          .eq('club_id', clubId);
      }
    }

    resetForm();
    setShowForm(false);
    setSaving(false);
    fetchBooks();
  };

  const setAsCurrent = async (bookId: string) => {
    if (!clubId) return;
    // Only demote current books in *this* club — never touch other clubs.
    await supabase
      .from('books')
      .update({ status: 'upcoming' })
      .eq('status', 'current')
      .eq('club_id', clubId);
    await supabase
      .from('books')
      .update({ status: 'current' })
      .eq('id', bookId)
      .eq('club_id', clubId);
    fetchBooks();
  };

  const markCompleted = async (bookId: string) => {
    if (!clubId) return;
    await supabase
      .from('books')
      .update({ status: 'completed' })
      .eq('id', bookId)
      .eq('club_id', clubId);
    fetchBooks();
  };

  const deleteBook = async (bookId: string) => {
    if (!clubId) return;
    await supabase.from('books').delete().eq('id', bookId).eq('club_id', clubId);
    setConfirmDelete(null);
    fetchBooks();
  };

  const savePdf = async (book: Book) => {
    if (book.club_id !== clubId) return;
    const v = pdfEditValue.trim();
    await supabase
      .from('books')
      .update({ pdf_url: v || null })
      .eq('id', book.id)
      .eq('club_id', clubId);
    setPdfEditing(null);
    fetchBooks();
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      current: 'bg-soft-gold/30 text-foreground',
      upcoming: 'cozy-badge-lavender',
      completed: 'cozy-badge-sage',
    };
    return styles[status] || 'cozy-badge-sage';
  };

  return (
    <div className="cozy-card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-5 w-5 text-terracotta shrink-0" />
          <h2 className="cozy-title text-2xl truncate">Manage Books</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setShowForm((s) => {
                const next = !s;
                if (!s) resetForm(); // fresh state each time we open
                return next;
              });
            }}
            className="cozy-btn-primary flex items-center gap-1 text-xs px-2.5 py-1.5 whitespace-nowrap min-h-[36px]"
            aria-expanded={showForm}
          >
            <Plus className="h-3.5 w-3.5" /> Add book
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={addBook}
          className="mb-5 space-y-3 rounded-xl p-4"
          style={{ background: 'hsl(var(--peach) / 0.5)' }}
        >
          <p className="text-xs text-muted-foreground font-body">
            Search by title, author, or ISBN — or{' '}
            <button
              type="button"
              onClick={() => setManualMode((m) => !m)}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {manualMode ? 'search instead' : 'enter manually'}
            </button>
            .
          </p>

          {!manualMode && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                  placeholder="Search books"
                  className="cozy-input w-full pl-9 min-h-[44px]"
                  aria-label="Search books by title, author, or ISBN"
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              {bookQuery.trim().length >= 2 && (
                <div
                  className="max-h-[240px] overflow-y-auto overscroll-contain rounded-lg border border-border bg-card"
                  role="listbox"
                  aria-label="Book search results"
                >
                  {searching && !bookResults.length ? (
                    <p className="p-3 text-xs text-muted-foreground font-body">Searching…</p>
                  ) : searchError ? (
                    <p className="p-3 text-xs text-muted-foreground font-body">
                      Couldn’t reach the book database. Try again or enter manually.
                    </p>
                  ) : bookResults.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground font-body">
                      No results. Refine your search or enter manually.
                    </p>
                  ) : (
                    bookResults.map((r, i) => (
                      <button
                        key={`${r.externalId || r.title}-${i}`}
                        type="button"
                        onClick={() => applyResult(r)}
                        className="flex w-full items-start gap-2.5 border-b border-border/50 p-2 text-left last:border-b-0 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none min-h-[44px]"
                        role="option"
                      >
                        <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
                          {r.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.coverUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                            />
                          ) : (
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-body font-semibold truncate">{r.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {r.author || 'Unknown author'}
                            {r.year ? ` · ${r.year}` : ''}
                            {r.pages ? ` · ${r.pages} pp` : ''}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted flex items-center justify-center">
              {coverFile ? (
                <span className="text-[10px] text-muted-foreground px-1 text-center">Uploaded</span>
              ) : coverUrl && !coverFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt="Selected cover preview"
                  className="h-full w-full object-cover"
                  onError={() => setCoverFailed(true)}
                />
              ) : (
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[11px] text-muted-foreground font-body">
                {coverFile
                  ? `Uploading: ${coverFile.name}`
                  : coverUrl && !coverFailed
                    ? 'Cover from search will be saved.'
                    : 'No cover selected yet.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg bg-muted px-2 py-1 text-[11px] font-body font-semibold text-muted-foreground hover:bg-muted/80 min-h-[32px] inline-flex items-center gap-1">
                  <ImagePlus className="h-3 w-3" /> Upload
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setCoverFile(f);
                      if (f) setCoverUrl(null);
                    }}
                    className="hidden"
                  />
                </label>
                {(coverFile || (coverUrl && !coverFailed)) && (
                  <button
                    type="button"
                    onClick={() => { setCoverFile(null); setCoverUrl(null); setCoverFailed(false); }}
                    className="rounded-lg px-2 py-1 text-[11px] font-body text-muted-foreground hover:bg-muted/60 min-h-[32px]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTouched((t) => ({ ...t, title: true })); }}
            placeholder="Book title"
            className="cozy-input w-full min-h-[44px]"
            required
          />
          <input
            type="text"
            value={author}
            onChange={(e) => { setAuthor(e.target.value); setTouched((t) => ({ ...t, author: true })); }}
            placeholder="Author"
            className="cozy-input w-full min-h-[44px]"
            required
          />
          <input
            type="number"
            value={totalPages}
            onChange={(e) => { setTotalPages(e.target.value); setTouched((t) => ({ ...t, pages: true })); }}
            placeholder="Total pages (optional)"
            className="cozy-input w-full min-h-[44px]"
          />
          <input
            type="url"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="PDF link (optional)"
            className="cozy-input w-full min-h-[44px]"
            pattern="https?://.*"
          />
          <label className="flex items-center gap-2 cursor-pointer cozy-input w-full text-sm text-muted-foreground min-h-[44px]">
            <ImagePlus className="h-4 w-4" />
            <span className="truncate">{spineFile ? spineFile.name : 'Spine art (optional)'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSpineFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          <p className="text-[11px] text-muted-foreground font-body">
            Meeting date &amp; location live in Meetings &amp; polls.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="cozy-btn-ghost flex-1 text-sm min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cozy-btn-primary flex-1 text-sm min-h-[44px]"
            >
              {saving ? 'Adding…' : 'Add book'}
            </button>
          </div>
        </form>
      )}


      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3" aria-hidden>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-border bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : books.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground font-body">
            No books in this club yet. Add your first one 📖
          </p>
        ) : (
          books.map((b) => {
            const assetCount =
              (b.cover_url ? 1 : 0) + (b.spine_art_url ? 1 : 0) + (b.pdf_url ? 1 : 0);
            return (
              <article key={b.id} className="rounded-xl border border-border p-3.5">
                {/* Header row */}
                <header className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-serif text-sm font-semibold break-words">
                        {b.title}
                      </p>
                      <span className={`cozy-badge text-[10px] ${statusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      by {b.author}
                      {b.total_pages ? ` · ${b.total_pages} pages` : ''}
                    </p>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="More actions"
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {b.status !== 'upcoming' && (
                          <DropdownMenuItem
                            onClick={() =>
                              supabase
                                .from('books')
                                .update({ status: 'upcoming' })
                                .eq('id', b.id)
                                .eq('club_id', clubId!)
                                .then(fetchBooks)
                            }
                          >
                            Mark as upcoming
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setConfirmDelete(b.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete book
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </header>

                {/* Actions */}
                {isAdmin && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {/* Primary lifecycle */}
                    {b.status === 'upcoming' && (
                      <button
                        onClick={() => setAsCurrent(b.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-primary text-primary-foreground shadow-sm min-h-[36px]"
                      >
                        Set as current
                      </button>
                    )}
                    {b.status === 'current' && (
                      <button
                        onClick={() => markCompleted(b.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-secondary text-secondary-foreground min-h-[36px] inline-flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark completed
                      </button>
                    )}
                    {b.status === 'completed' && (
                      <button
                        onClick={() => setAsCurrent(b.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-primary text-primary-foreground shadow-sm min-h-[36px]"
                      >
                        Bring back to current
                      </button>
                    )}

                    {/* Assets popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-muted text-muted-foreground hover:bg-muted/80 inline-flex items-center gap-1.5 min-h-[36px]"
                          aria-label="Book assets"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          Assets
                          <span className="text-[10px] rounded-full bg-background/70 px-1.5 py-0.5">
                            {assetCount}/3
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-72 p-2 space-y-1"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <AssetRow
                          label="Cover"
                          preview={b.cover_url}
                          disabled={busyBookId === b.id}
                          onFile={(f) => uploadImageForExistingBook(f, b, 'cover')}
                          onRemove={
                            b.cover_url ? () => removeAsset(b, 'cover_url') : undefined
                          }
                          accept="image/*"
                          kind="image"
                        />
                        <AssetRow
                          label="Spine"
                          preview={b.spine_art_url}
                          disabled={busyBookId === b.id}
                          onFile={(f) => uploadImageForExistingBook(f, b, 'spine')}
                          onRemove={
                            b.spine_art_url
                              ? () => removeAsset(b, 'spine_art_url')
                              : undefined
                          }
                          accept="image/*"
                          kind="image"
                        />
                        {/* PDF row */}
                        <div className="rounded-lg border border-border p-2 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-body font-semibold inline-flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" /> PDF link
                              {b.pdf_url && (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              )}
                            </span>
                            {b.pdf_url && pdfEditing !== b.id && (
                              <div className="flex items-center gap-1">
                                <a
                                  href={b.pdf_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded hover:bg-muted"
                                  aria-label="Open PDF"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  onClick={() => removeAsset(b, 'pdf_url')}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                                  aria-label="Remove PDF"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          {pdfEditing === b.id ? (
                            <div className="flex gap-1">
                              <input
                                type="url"
                                value={pdfEditValue}
                                onChange={(e) => setPdfEditValue(e.target.value)}
                                placeholder="https://…"
                                className="cozy-input text-xs py-1 px-2 flex-1"
                              />
                              <button
                                onClick={() => savePdf(b)}
                                className="rounded-lg px-2 py-1 text-xs font-body font-semibold bg-primary text-primary-foreground"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setPdfEditing(null)}
                                className="text-xs text-muted-foreground font-body px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setPdfEditing(b.id);
                                setPdfEditValue(b.pdf_url || '');
                              }}
                              className="text-xs font-body text-primary hover:underline"
                            >
                              {b.pdf_url ? 'Replace link' : 'Add link'}
                            </button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete && !confirmDeleteStep2}
        title="Delete book"
        message="This will permanently remove this book and all associated data. Are you sure?"
        confirmLabel="Delete"
        onConfirm={() => setConfirmDeleteStep2(true)}
        onCancel={() => {
          setConfirmDelete(null);
          setConfirmDeleteStep2(false);
        }}
      />
      <ConfirmDialog
        open={!!confirmDelete && confirmDeleteStep2}
        title="Are you REALLY sure?"
        message="This action cannot be undone. The book, reading progress, and all discussions will be permanently deleted."
        confirmLabel="Delete forever"
        onConfirm={() => {
          if (confirmDelete) deleteBook(confirmDelete);
          setConfirmDeleteStep2(false);
        }}
        onCancel={() => {
          setConfirmDelete(null);
          setConfirmDeleteStep2(false);
        }}
      />
    </div>
  );
};

interface AssetRowProps {
  label: string;
  preview: string | null;
  disabled: boolean;
  onFile: (f: File) => void;
  onRemove?: () => void;
  accept: string;
  kind: 'image';
}

const AssetRow = ({ label, preview, disabled, onFile, onRemove, accept }: AssetRowProps) => (
  <div className="rounded-lg border border-border p-2 flex items-center gap-2">
    <div className="h-10 w-8 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
      {preview ? (
        <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
      ) : (
        <ImagePlus className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-body font-semibold inline-flex items-center gap-1">
        {label}
        {preview && <Check className="h-3.5 w-3.5 text-primary" />}
      </p>
      <p className="text-[10px] text-muted-foreground font-body">
        {preview ? 'Added' : 'Not added'}
      </p>
    </div>
    <label
      className={cn(
        'text-xs font-body text-primary hover:underline cursor-pointer px-1',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      {preview ? 'Replace' : 'Upload'}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </label>
    {onRemove && (
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-muted text-muted-foreground"
        aria-label={`Remove ${label.toLowerCase()}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

export default BookManagerWidget;

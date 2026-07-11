import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { BookOpen, Plus, Calendar, Trash2, ImagePlus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';

interface Book {
  id: string;
  title: string;
  author: string;
  status: string;
  total_pages: number | null;
  meeting_date: string | null;
  meeting_location: string | null;
  cover_url: string | null;
  spine_art_url: string | null;
  pdf_url: string | null;
}

const BookManagerWidget = () => {
  const { canManageCurrentClub } = useRole();
  const isAdmin = canManageCurrentClub;
  const [books, setBooks] = useState<Book[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteStep2, setConfirmDeleteStep2] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [spineFile, setSpineFile] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>();
  const [meetingTime, setMeetingTime] = useState('19:00');
  const [pdfUrl, setPdfUrl] = useState('');
  const [editingPdf, setEditingPdf] = useState<string | null>(null);
  const [editPdfUrl, setEditPdfUrl] = useState('');
  const [editingMeetup, setEditingMeetup] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState('19:00');
  const [editLocation, setEditLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const existingCoverRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, bookId: string, type: 'cover' | 'spine'): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const filePath = `${bookId}/${type}.${ext}`;
    const { error } = await supabase.storage.from('book-covers').upload(filePath, file, { upsert: true });
    if (error) { toast.error(`Failed to upload ${type} image`); return null; }
    const { data: { publicUrl } } = supabase.storage.from('book-covers').getPublicUrl(filePath);
    return `${publicUrl}?t=${Date.now()}`;
  };

  const uploadImageForExistingBook = async (file: File, bookId: string, type: 'cover' | 'spine') => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB.'); return; }
    setUploadingCover(bookId);
    const url = await uploadImage(file, bookId, type);
    if (url) {
      const field = type === 'spine' ? 'spine_art_url' : 'cover_url';
      await supabase.from('books').update({ [field]: url } as any).eq('id', bookId);
      toast.success(`${type === 'spine' ? 'Spine art' : 'Cover art'} uploaded!`);
      fetchBooks();
    }
    setUploadingCover(null);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setBooks(data);
  };

  const addBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    setSaving(true);

    const { data: inserted } = await supabase.from('books').insert({
      title: title.trim(),
      author: author.trim(),
      total_pages: totalPages ? parseInt(totalPages) : null,
      cover_url: null,
      meeting_location: location.trim() || null,
      meeting_date: meetingDate ? (() => {
        const [h, m] = meetingTime.split(':').map(Number);
        const d = new Date(meetingDate);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
      })() : null,
      status: 'upcoming',
      pdf_url: pdfUrl.trim() || null,
    }).select('id').single();

    if (inserted && spineFile) {
      const url = await uploadImage(spineFile, inserted.id, 'spine');
      if (url) {
        await supabase.from('books').update({ spine_art_url: url } as any).eq('id', inserted.id);
      }
    }
    if (inserted && coverFile) {
      const url = await uploadImage(coverFile, inserted.id, 'cover');
      if (url) {
        await supabase.from('books').update({ cover_url: url }).eq('id', inserted.id);
      }
    }

    setTitle('');
    setAuthor('');
    setTotalPages('');
    setCoverFile(null);
    setSpineFile(null);
    setLocation('');
    setMeetingDate(undefined);
    setMeetingTime('19:00');
    setPdfUrl('');
    setShowForm(false);
    setSaving(false);
    fetchBooks();
  };

  const setAsCurrent = async (bookId: string) => {
    // Set all books to upcoming first, then set selected as current
    await supabase.from('books').update({ status: 'upcoming' }).eq('status', 'current');
    await supabase.from('books').update({ status: 'current' }).eq('id', bookId);
    fetchBooks();
  };

  const markCompleted = async (bookId: string) => {
    await supabase.from('books').update({ status: 'completed' }).eq('id', bookId);
    fetchBooks();
  };

  const deleteBook = async (bookId: string) => {
    await supabase.from('books').delete().eq('id', bookId);
    setConfirmDelete(null);
    fetchBooks();
  };

  const updateMeetingDate = async (bookId: string) => {
    if (!editDate) return;
    const [h, m] = editTime.split(':').map(Number);
    const d = new Date(editDate);
    d.setHours(h, m, 0, 0);
    await supabase
      .from('books')
      .update({ meeting_date: d.toISOString(), meeting_location: editLocation.trim() || null })
      .eq('id', bookId);
    setEditingMeetup(null);
    setEditDate(undefined);
    setEditTime('19:00');
    setEditLocation('');
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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-terracotta shrink-0" />
          <h2 className="cozy-title text-2xl truncate">Manage Books</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="cozy-btn-primary flex items-center gap-1 text-xs px-2.5 py-1.5 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={addBook} className="mb-5 space-y-2 rounded-xl p-4" style={{ background: 'hsl(var(--peach) / 0.5)' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Book title"
            className="cozy-input w-full"
            required
          />
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author"
            className="cozy-input w-full"
            required
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="number"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              placeholder="Total pages"
              className="cozy-input flex-1"
            />
            <div className="flex-1 min-w-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-body text-sm rounded-xl',
                      !meetingDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {meetingDate ? format(meetingDate, 'MMM d, yyyy') : 'Meetup date'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={meetingDate}
                    onSelect={setMeetingDate}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-body text-muted-foreground">Time:</label>
            <input
              type="time"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="cozy-input text-sm py-1 px-2"
            />
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="cozy-input w-full"
          />
          <input
            type="url"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="PDF link (optional, e.g. Google Drive)"
            className="cozy-input w-full"
            pattern="https?://.*"
          />
          <div>
            <label className="flex items-center gap-2 cursor-pointer cozy-input w-full text-sm text-muted-foreground">
              <ImagePlus className="h-4 w-4" />
              {spineFile ? spineFile.name : 'Spine art image (optional)'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSpineFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer cozy-input w-full text-sm text-muted-foreground">
              <ImagePlus className="h-4 w-4" />
              {coverFile ? coverFile.name : 'Cover art image (optional)'}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
          <button type="submit" disabled={saving} className="cozy-btn-primary w-full text-sm">
            {saving ? 'Adding...' : '📚 Add Book'}
          </button>
        </form>
      )}

      <div className="max-h-96 space-y-3 overflow-y-auto">
        {books.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground font-body">
            No books added yet. Add your first one! 📖
          </p>
        ) : (
          books.map((b) => (
            <div key={b.id} className="relative rounded-xl border border-border p-4">
              {isAdmin && (
                <button
                  onClick={() => setConfirmDelete(b.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete book"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-serif text-sm font-semibold truncate">{b.title}</p>
                    <span className={`cozy-badge text-[10px] ${statusBadge(b.status)}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body">
                    by {b.author}
                    {b.total_pages && ` · ${b.total_pages} pages`}
                  </p>
                  {b.meeting_date && (
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      📅 {format(new Date(b.meeting_date), 'EEEE, MMM d, yyyy · h:mm a')}
                    </p>
                  )}
                  {b.meeting_location && (
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      📍 {b.meeting_location}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {b.status !== 'current' && b.status !== 'completed' && (
                  <button
                    onClick={() => setAsCurrent(b.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-primary text-primary-foreground shadow-sm"
                  >
                    Set as Current
                  </button>
                )}
                {b.status === 'current' && (
                  <button
                    onClick={() => markCompleted(b.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-secondary text-secondary-foreground"
                  >
                    Mark Completed ✓
                  </button>
                )}
                {b.status === 'completed' && (
                  <button
                    onClick={() => setAsCurrent(b.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-primary text-primary-foreground shadow-sm"
                  >
                    📖 Bring Back to Current
                  </button>
                )}

                {/* Edit meetup date */}
                {editingMeetup === b.id ? (
                  <div className="flex flex-col gap-3 w-full mt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex-1 min-w-[120px]">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                'w-full text-xs font-body rounded-lg justify-start',
                                !editDate && 'text-muted-foreground'
                              )}
                            >
                              <Calendar className="mr-1 h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {editDate ? format(editDate, 'MMM d') : 'Pick date'}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker
                              mode="single"
                              selected={editDate}
                              onSelect={setEditDate}
                              initialFocus
                              className={cn('p-3 pointer-events-auto')}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="cozy-input text-xs py-1 px-2 w-[90px]"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Location"
                        className="cozy-input text-xs py-1 px-2 flex-1 min-w-[120px]"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => updateMeetingDate(b.id)}
                          className="rounded-lg px-2 py-1 text-xs font-body font-semibold bg-primary text-primary-foreground"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingMeetup(null); setEditDate(undefined); }}
                          className="text-xs text-muted-foreground font-body hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingMeetup(b.id);
                      setEditDate(b.meeting_date ? new Date(b.meeting_date) : undefined);
                      setEditTime(b.meeting_date ? format(new Date(b.meeting_date), 'HH:mm') : '19:00');
                      setEditLocation(b.meeting_location || '');
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    📅 {b.meeting_date ? 'Change Meetup' : 'Set Meetup'}
                  </button>
                )}

                {/* Upload spine art for existing book */}
                <label
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer inline-flex items-center gap-1",
                    uploadingCover === b.id && "opacity-50 pointer-events-none"
                  )}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {(b as any).spine_art_url ? '✏️ Spine' : '🎨 Spine'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImageForExistingBook(file, b.id, 'spine');
                      e.target.value = '';
                    }}
                  />
                </label>
                {/* Upload cover art for existing book */}
                <label
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer inline-flex items-center gap-1",
                    uploadingCover === b.id && "opacity-50 pointer-events-none"
                  )}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {b.cover_url ? '✏️ Cover' : '🖼️ Cover'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImageForExistingBook(file, b.id, 'cover');
                      e.target.value = '';
                    }}
                  />
                </label>
                {(b.cover_url || (b as any).spine_art_url) && (
                  <div className="flex gap-1">
                    {(b as any).spine_art_url && (
                      <img src={(b as any).spine_art_url} alt="spine" className="h-8 w-6 rounded object-cover border border-border" title="Spine art" />
                    )}
                    {b.cover_url && (
                      <img src={b.cover_url} alt="cover" className="h-8 w-6 rounded object-cover border border-border" title="Cover art" />
                    )}
                  </div>
                )}

                {/* PDF link editor */}
                {editingPdf === b.id ? (
                  <div className="flex w-full items-center gap-2 mt-2">
                    <input
                      type="url"
                      value={editPdfUrl}
                      onChange={(e) => setEditPdfUrl(e.target.value)}
                      placeholder="https://…"
                      className="cozy-input text-xs py-1 px-2 flex-1"
                    />
                    <button
                      onClick={async () => {
                        const v = editPdfUrl.trim();
                        await supabase.from('books').update({ pdf_url: v || null }).eq('id', b.id);
                        setEditingPdf(null);
                        fetchBooks();
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-body font-semibold bg-primary text-primary-foreground"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingPdf(null)}
                      className="text-xs text-muted-foreground font-body hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingPdf(b.id);
                      setEditPdfUrl(b.pdf_url || '');
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-body font-semibold bg-muted text-muted-foreground hover:bg-muted/80 inline-flex items-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {b.pdf_url ? '✏️ PDF Link' : '📄 Add PDF'}
                  </button>
                )}

              </div>
            </div>
          ))
        )}
      </div>

      {/* Step 1 confirmation */}
      <ConfirmDialog
        open={!!confirmDelete && !confirmDeleteStep2}
        title="Delete Book"
        message="This will permanently remove this book and all associated data. Are you sure?"
        confirmLabel="Delete"
        onConfirm={() => setConfirmDeleteStep2(true)}
        onCancel={() => { setConfirmDelete(null); setConfirmDeleteStep2(false); }}
      />

      {/* Step 2 confirmation */}
      <ConfirmDialog
        open={!!confirmDelete && confirmDeleteStep2}
        title="Are you REALLY sure?"
        message="This action cannot be undone. The book, reading progress, and all discussions will be permanently deleted."
        confirmLabel="Delete Forever"
        onConfirm={() => { if (confirmDelete) deleteBook(confirmDelete); setConfirmDeleteStep2(false); }}
        onCancel={() => { setConfirmDelete(null); setConfirmDeleteStep2(false); }}
      />
    </div>
  );
};

export default BookManagerWidget;

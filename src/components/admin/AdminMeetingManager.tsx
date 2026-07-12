import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClub } from '@/contexts/ClubContext';
import { CalendarDays, MapPin, Users, Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import ConfirmDialog from '@/components/ConfirmDialog';

interface SchedulableBook {
  id: string;
  title: string;
  author: string;
  status: string;
  meeting_date: string | null;
  meeting_location: string | null;
  meeting_rsvp_active: boolean | null;
}

const AdminMeetingManager = () => {
  const { clubId } = useClub();
  const [books, setBooks] = useState<SchedulableBook[]>([]);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('19:00');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const fetchState = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const { data } = await supabase
      .from('books')
      .select('id, title, author, status, meeting_date, meeting_location, meeting_rsvp_active')
      .eq('club_id', clubId)
      .in('status', ['current', 'upcoming'])
      .order('status', { ascending: true }) // current before upcoming alphabetically
      .order('meeting_date', { ascending: true, nullsFirst: false });
    setBooks((data as SchedulableBook[]) || []);
    setLoading(false);
  }, [clubId]);

  useEffect(() => { fetchState(); }, [fetchState]);

  // Prefer the current book with a meeting; otherwise the earliest upcoming
  // meeting; otherwise the current book (even without a date).
  const scheduled = books.find(b => b.meeting_date) ?? null;
  const currentBook = books.find(b => b.status === 'current') ?? null;
  const meetingHost = scheduled ?? currentBook;

  useEffect(() => {
    const fetchRsvp = async () => {
      if (!scheduled) { setRsvpCount(0); return; }
      const { count } = await supabase
        .from('meeting_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('book_id', scheduled.id)
        .eq('response', 'going');
      setRsvpCount(count ?? 0);
    };
    fetchRsvp();
  }, [scheduled?.id]);

  const openScheduler = (book?: SchedulableBook) => {
    const target = book ?? scheduled ?? currentBook ?? books[0];
    if (target) {
      setSelectedBookId(target.id);
      if (target.meeting_date) {
        const d = new Date(target.meeting_date);
        setDate(d);
        setTime(format(d, 'HH:mm'));
      } else {
        setDate(undefined);
        setTime('19:00');
      }
      setLocation(target.meeting_location || '');
    } else {
      setSelectedBookId(null);
      setDate(undefined);
      setTime('19:00');
      setLocation('');
    }
    setDialogOpen(true);
  };

  const saveMeeting = async () => {
    if (!selectedBookId || !date) {
      toast.error('Pick a book and a date.');
      return;
    }
    setSaving(true);
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h || 19, m || 0, 0, 0);
    const { error } = await supabase
      .from('books')
      .update({
        meeting_date: d.toISOString(),
        meeting_location: location.trim() || null,
      })
      .eq('id', selectedBookId);
    setSaving(false);
    if (error) {
      toast.error('Could not save the meeting.');
      return;
    }
    toast.success(scheduled ? 'Meeting updated.' : 'Meeting scheduled.');
    setDialogOpen(false);
    fetchState();
  };

  const cancelMeeting = async () => {
    if (!scheduled) return;
    const { error } = await supabase
      .from('books')
      .update({ meeting_date: null, meeting_location: null, meeting_rsvp_active: false })
      .eq('id', scheduled.id);
    setConfirmCancel(false);
    if (error) {
      toast.error('Could not cancel the meeting.');
      return;
    }
    toast.success('Meeting cancelled.');
    fetchState();
  };

  const scheduledDate = scheduled?.meeting_date ? new Date(scheduled.meeting_date) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-terracotta shrink-0" />
          <h3 className="cozy-title text-xl">Meeting</h3>
        </div>
        <Button
          size="sm"
          onClick={() => openScheduler()}
          disabled={loading || books.length === 0}
          className="min-h-[36px] rounded-lg text-xs font-body font-semibold"
        >
          {scheduled ? (<><Pencil className="mr-1 h-3.5 w-3.5" /> Reschedule</>) : (<><Plus className="mr-1 h-3.5 w-3.5" /> Set meeting</>)}
        </Button>
      </div>

      {loading ? (
        <p className="py-2 text-sm text-muted-foreground font-body">Loading…</p>
      ) : scheduled && scheduledDate ? (
        <div className="space-y-2">
          <p className="font-body text-base font-semibold text-foreground">
            {format(scheduledDate, 'EEEE, MMMM d · h:mm a')}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-body">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> {scheduled.title}
            </span>
            {scheduled.meeting_location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {scheduled.meeting_location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {rsvpCount} going
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmCancel(true)}
              className="min-h-[36px] rounded-lg text-xs font-body text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Cancel meeting
            </Button>
          </div>
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground font-body">
            Add a current or upcoming book first, then schedule its meeting.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground font-body">No meeting scheduled yet.</p>
          <Button
            size="sm"
            onClick={() => openScheduler()}
            className="min-h-[40px] rounded-lg text-sm font-body font-semibold"
          >
            <Plus className="mr-1 h-4 w-4" /> Set your first meeting
          </Button>
        </div>
      )}

      {/* Scheduler dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] p-5">
          <DialogHeader>
            <DialogTitle className="cozy-title text-xl">
              {scheduled ? 'Reschedule meeting' : 'Set meeting'}
            </DialogTitle>
            <DialogDescription className="font-body text-xs">
              Pick which book this meeting is for, then choose the date, time, and where you're meeting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {books.length > 1 && (
              <div className="space-y-1">
                <label className="text-xs font-body font-semibold text-muted-foreground">Book</label>
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-1">
                  {books.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBookId(b.id)}
                      className={cn(
                        'w-full text-left rounded-md px-2 py-2 text-sm font-body min-h-[40px] transition-colors',
                        selectedBookId === b.id ? 'bg-primary/10 text-foreground' : 'hover:bg-muted'
                      )}
                    >
                      <span className="font-semibold">{b.title}</span>
                      <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">{b.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0">
                <label className="text-xs font-body font-semibold text-muted-foreground block mb-1">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-body text-sm rounded-lg min-h-[44px]',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {date ? format(date, 'MMM d, yyyy') : 'Pick date'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-full sm:w-32">
                <label className="text-xs font-body font-semibold text-muted-foreground block mb-1">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="cozy-input w-full min-h-[44px] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-body font-semibold text-muted-foreground block mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Café, park, video link…"
                className="cozy-input w-full min-h-[44px] text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={saveMeeting}
              disabled={saving || !selectedBookId || !date}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {saving ? 'Saving…' : scheduled ? 'Save changes' : 'Schedule meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel meeting?"
        message="This clears the date, location, and turns off the attendance poll. You can set a new meeting anytime."
        confirmLabel="Cancel meeting"
        onConfirm={cancelMeeting}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
};

export default AdminMeetingManager;

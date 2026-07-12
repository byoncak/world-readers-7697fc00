import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClub } from '@/contexts/ClubContext';
import { Calendar, Coffee, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, differenceInCalendarDays } from 'date-fns';
import { LoadingBlock, ErrorBlock } from '@/components/StateBlock';

const NextMeetupWidget = () => {
  const [meetingDate, setMeetingDate] = useState<Date | null>(null);
  const [meetingLocation, setMeetingLocation] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNextMeeting = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from('books')
      .select('title, meeting_date, meeting_location')
      .eq('status', 'current')
      .not('meeting_date', 'is', null)
      .limit(1);

    if (err) { setError(true); setLoading(false); return; }

    if (data && data.length > 0 && data[0].meeting_date) {
      const d = new Date(data[0].meeting_date);
      setMeetingDate(d);
      setBookTitle(data[0].title);
      setMeetingLocation(data[0].meeting_location);
      setCurrentMonth(d);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNextMeeting(); }, [fetchNextMeeting]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const daysLeft = meetingDate ? differenceInCalendarDays(meetingDate, new Date()) : null;

  if (loading) {
    return (
      <section className="rounded-2xl border border-border/60 bg-muted/20 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-terracotta" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-foreground">Next Meetup</h2>
        </div>
        <LoadingBlock label="Loading meetup…" rows={2} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-border/60 bg-muted/20 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-terracotta" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-foreground">Next Meetup</h2>
        </div>
        <ErrorBlock message="Couldn't load the meetup." onRetry={fetchNextMeeting} />
      </section>
    );
  }

  if (!meetingDate) return null;

  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5;
  const countdownLabel =
    daysLeft === 0
      ? 'Today'
      : daysLeft === 1
      ? 'Tomorrow'
      : daysLeft !== null && daysLeft > 0
      ? `${daysLeft} days`
      : null;

  return (
    <section
      className={`rounded-2xl p-5 ${
        isSoon
          ? 'border-2 border-terracotta/60 bg-terracotta/10 shadow-sm'
          : 'border border-border/60 bg-muted/20'
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-terracotta" />
        <h2 className="font-display text-lg font-semibold text-foreground">Next Meetup</h2>
        {countdownLabel && (
          <span
            className={`font-body text-sm font-semibold ${
              isSoon ? 'text-terracotta' : 'text-muted-foreground'
            }`}
          >
            ({countdownLabel})
          </span>
        )}
      </div>

      {/* Compact summary line */}
      <button
          onClick={() => setShowCalendar((s) => !s)}
          className="w-full rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-body text-base font-semibold text-foreground">
                {format(meetingDate!, 'EEEE, MMMM d')}
              </p>
              <p className="mt-0.5 truncate font-body text-xs text-muted-foreground">
                {format(meetingDate!, 'h:mm a')}
                {meetingLocation ? ` · ${meetingLocation}` : ''}
              </p>
            </div>
            {showCalendar ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        </button>

      {!showCalendar ? null : (
      <div className="mt-4 border-t border-border/50 pt-4">
      {/* Month Navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="cozy-btn-ghost p-1 text-xs">
          ‹
        </button>
        <span className="font-serif text-sm font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="cozy-btn-ghost p-1 text-xs">
          ›
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-[10px] font-body font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const isMeetup = meetingDate && isSameDay(day, meetingDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`relative flex h-8 w-full items-center justify-center rounded-lg text-xs font-body transition-all duration-200 ${
                isMeetup
                  ? 'bg-primary text-primary-foreground font-bold shadow-md'
                  : isToday
                  ? 'bg-muted font-semibold text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {isMeetup ? (
                <Coffee
                  className="h-5 w-5 text-primary-foreground"
                  strokeWidth={2.25}
                  absoluteStrokeWidth
                  aria-label="Meetup day"
                />
              ) : (
                format(day, 'd')
              )}
            </div>
          );
        })}
      </div>
      </div>
      )}
    </section>
  );
};

export default NextMeetupWidget;

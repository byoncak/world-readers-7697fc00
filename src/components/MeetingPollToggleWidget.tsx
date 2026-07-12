import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

const MeetingPollToggleWidget = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [rsvpActive, setRsvpActive] = useState(false);
  const [togglingRsvp, setTogglingRsvp] = useState(false);

  useEffect(() => {
    const fetchCurrentBook = async () => {
      const { data } = await supabase
        .from('books')
        .select('id, meeting_rsvp_active, meeting_date')
        .eq('status', 'current')
        .not('meeting_date', 'is', null)
        .limit(1)
        .single();

      if (!data) {
        setCurrentBookId(null);
        setRsvpActive(false);
        return;
      }

      setCurrentBookId(data.id);
      setRsvpActive(Boolean(data.meeting_rsvp_active));
    };

    fetchCurrentBook();
  }, []);

  const toggleRsvpPoll = async () => {
    if (!currentBookId || togglingRsvp) return;

    setTogglingRsvp(true);
    const newVal = !rsvpActive;

    const { error } = await supabase
      .from('books')
      .update({ meeting_rsvp_active: newVal })
      .eq('id', currentBookId);

    if (error) {
      toast({ title: 'Error', description: 'Could not update attendance poll.', variant: 'destructive' });
      setTogglingRsvp(false);
      return;
    }

    if (newVal && user) {
      localStorage.removeItem(`rsvp-hud-dismissed-${user.id}-${currentBookId}`);
    }

    setRsvpActive(newVal);
    window.dispatchEvent(new CustomEvent('meeting-rsvp-poll-changed', { detail: { active: newVal, bookId: currentBookId } }));

    toast({
      title: newVal ? 'Attendance poll activated!' : 'Attendance poll deactivated',
    });

    setTogglingRsvp(false);
  };

  if (!currentBookId) return null;

  return (
    <div className="cozy-card p-0">
      <div
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-body font-semibold transition-all duration-200 select-none ${
          rsvpActive
            ? 'bg-sage/10 text-foreground'
            : 'bg-card text-muted-foreground'
        }`}
      >
        <Switch
          checked={rsvpActive}
          onCheckedChange={toggleRsvpPoll}
          disabled={togglingRsvp}
        />
        <span className="flex-1 text-left">
          {rsvpActive ? 'Attendance Poll Active' : 'Start Attendance Poll'}
        </span>
      </div>
    </div>
  );
};

export default MeetingPollToggleWidget;


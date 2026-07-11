import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, ArrowLeft, Info, BookOpenCheck } from 'lucide-react';
import { toast } from 'sonner';
import YourClubCard from '@/components/clubs/YourClubCard';
import DiscoverSection from '@/components/clubs/DiscoverSection';
import PendingRequestsSection from '@/components/clubs/PendingRequestsSection';
import CommunityPulseStrip from '@/components/clubs/CommunityPulseStrip';
import CreateClubDialog from '@/components/clubs/CreateClubDialog';

const Clubs = () => {
  const { user } = useAuth();
  const { memberships, isLoadingMemberships } = useClub();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');

  const lastClubId = typeof window !== 'undefined' ? localStorage.getItem('lastClubId') : null;
  const lastClub = lastClubId ? memberships.find((m) => m.club_id === lastClubId) : null;

  const { data: publicClubs = [] } = useQuery({
    queryKey: ['public-clubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ['club-member-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('club_members').select('club_id');
      const counts: Record<string, number> = {};
      (data ?? []).forEach((m: any) => {
        counts[m.club_id] = (counts[m.club_id] ?? 0) + 1;
      });
      return counts;
    },
  });

  const myClubIds = useMemo(() => new Set(memberships.map((m) => m.club_id)), [memberships]);

  // Show a clear, honest message when the user lands via ?invite=CODE.
  // Client-side redemption is not possible: club_invites SELECT is admin-only
  // (RLS: "Admins view invites"), so we cannot securely look up the club from
  // a code without new server support. Rather than fail silently or fabricate
  // a workaround, we surface an explanatory notice and clean the URL.
  useEffect(() => {
    if (!inviteCode) return;
    toast('Ask a club admin to add you', {
      description:
        'Invite links can only be redeemed by a club admin right now. Share this code with them: ' +
        inviteCode,
      duration: 10000,
    });
  }, [inviteCode]);

  const clearInvite = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('invite');
    setSearchParams(next, { replace: true });
  };

  const handleJoin = async (
    clubId: string,
    policy: 'instant' | 'approval',
    cap: number | null,
  ) => {
    if (!user) return;
    if (cap && (memberCounts[clubId] ?? 0) >= cap) {
      toast.error('This club is full.');
      return;
    }
    if (policy === 'instant') {
      const { error } = await supabase
        .from('club_members')
        .insert({ club_id: clubId, user_id: user.id, role: 'member' });
      if (error) return toast.error(error.message);
      toast.success('Welcome to the club!');
      queryClient.invalidateQueries({ queryKey: ['user-clubs'] });
      queryClient.invalidateQueries({ queryKey: ['club-member-counts'] });
      navigate(`/c/${clubId}`);
    } else {
      const { error } = await supabase
        .from('club_join_requests')
        .insert({ club_id: clubId, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success('Request sent — admins will review it.');
      queryClient.invalidateQueries({ queryKey: ['my-pending-join-requests'] });
    }
  };

  const hasClubs = memberships.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 space-y-8 animate-page-in sm:pb-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Clubs</h1>
          <p className="mt-1 font-serif text-sm italic text-muted-foreground">
            A quiet place to keep your reading crews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastClub && (
            <Button asChild variant="ghost" size="sm">
              <Link to={`/c/${lastClub.club_id}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to {lastClub.club.name}
              </Link>
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New club
          </Button>
        </div>
      </header>

      {/* Invite banner */}
      {inviteCode && (
        <Card
          role="status"
          className="flex items-start gap-3 border-[hsl(var(--soft-gold)/0.5)] bg-[hsl(var(--soft-gold)/0.12)] p-4"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warm-brown))]" aria-hidden />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">You opened an invite link.</p>
            <p className="mt-0.5 text-muted-foreground">
              Invite codes are redeemed by a club admin. Share this code with them and they'll add
              you: <code className="rounded bg-card px-1.5 py-0.5">{inviteCode}</code>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(inviteCode);
              toast.success('Code copied');
            }}
          >
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={clearInvite}>
            Dismiss
          </Button>
        </Card>
      )}

      {/* Your clubs */}
      <section aria-labelledby="your-clubs-heading" className="space-y-3">
        <div className="flex items-baseline gap-2 border-b border-border/60 pb-2">
          <h2
            id="your-clubs-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
          >
            Your clubs
          </h2>
          {hasClubs && (
            <span className="text-xs text-muted-foreground">
              {memberships.length} member{memberships.length === 1 ? 'ship' : 'ships'}
            </span>
          )}
        </div>

        {isLoadingMemberships ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                aria-hidden
                className="h-[176px] animate-pulse rounded-2xl border border-border/60 bg-card/50"
              />
            ))}
          </ul>
        ) : hasClubs ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => (
              <li key={m.club_id}>
                <YourClubCard
                  membership={m}
                  memberCount={memberCounts[m.club_id]}
                  lastVisited={m.club_id === lastClubId}
                />
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex h-full min-h-[176px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 bg-transparent px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="h-6 w-6" aria-hidden />
                <span className="font-medium">Start a new club</span>
              </button>
            </li>
          </ul>
        ) : (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <BookOpenCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
            <div>
              <h3 className="font-display text-xl font-semibold">No clubs yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Find a public club below, or start your own reading crew.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  document.getElementById('discover-anchor')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Browse public clubs
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Create a club
              </Button>
            </div>
          </Card>
        )}
      </section>

      <PendingRequestsSection />

      <div id="discover-anchor" />
      <DiscoverSection
        publicClubs={publicClubs}
        memberCounts={memberCounts}
        myClubIds={myClubIds}
        onJoin={handleJoin}
        defaultOpen={!hasClubs}
      />

      <CommunityPulseStrip />

      <CreateClubDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setCreateOpen(false);
          navigate(`/c/${id}`);
        }}
      />
    </div>
  );
};

export default Clubs;

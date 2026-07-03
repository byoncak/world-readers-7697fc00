import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Users, Lock, Globe, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional(),
  visibility: z.enum(['public', 'private']),
  join_policy: z.enum(['instant', 'approval']),
  member_cap: z.number().int().positive().max(10000).nullable(),
});

const Clubs = () => {
  const { user } = useAuth();
  const { memberships } = useClub();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

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
      (data ?? []).forEach((m: any) => { counts[m.club_id] = (counts[m.club_id] ?? 0) + 1; });
      return counts;
    },
  });

  const { data: totals } = useQuery({
    queryKey: ['community-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_community_totals');
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: popular = [] } = useQuery({
    queryKey: ['popular-books'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_popular_books', { _limit: 5 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const myClubIds = new Set(memberships.map((m) => m.club_id));

  const handleJoin = async (clubId: string, policy: 'instant' | 'approval', cap: number | null) => {
    if (!user) return;
    if (cap && (memberCounts[clubId] ?? 0) >= cap) {
      toast.error('This club is full.');
      return;
    }
    if (policy === 'instant') {
      const { error } = await supabase.from('club_members').insert({ club_id: clubId, user_id: user.id, role: 'member' });
      if (error) return toast.error(error.message);
      toast.success('Welcome to the club!');
      queryClient.invalidateQueries({ queryKey: ['user-clubs'] });
      navigate(`/c/${clubId}`);
    } else {
      const { error } = await supabase.from('club_join_requests').insert({ club_id: clubId, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success('Request sent — admins will review it.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6 animate-page-in">
      <div>
        <h1 className="font-display text-3xl font-bold">Your book clubs</h1>
        <p className="text-muted-foreground">Join one, start your own, or browse what the community is reading.</p>
      </div>

      <Tabs defaultValue={memberships.length ? 'mine' : 'discover'}>
        <TabsList>
          <TabsTrigger value="mine">My Clubs</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-3 pt-4">
          {memberships.length === 0 ? (
            <p className="text-muted-foreground">You haven't joined any clubs yet. Try Discover or create your own.</p>
          ) : (
            memberships.map((m) => (
              <Link key={m.club_id} to={`/c/${m.club_id}`} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl font-semibold truncate">{m.club.name}</h3>
                      {m.club.visibility === 'private' ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Globe className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    {m.club.description && <p className="text-sm text-muted-foreground truncate">{m.club.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                    <Users className="h-4 w-4" /> {memberCounts[m.club_id] ?? '—'}
                  </div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="discover" className="space-y-6 pt-4">
          {totals && (
            <Card className="p-4">
              <h3 className="font-display font-semibold mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Community totals</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><div className="text-2xl font-bold">{Number(totals.total_pages_read).toLocaleString()}</div><div className="text-muted-foreground">pages read</div></div>
                <div><div className="text-2xl font-bold">{Number(totals.total_books_finished).toLocaleString()}</div><div className="text-muted-foreground">books finished</div></div>
                <div><div className="text-2xl font-bold">{Number(totals.total_members).toLocaleString()}</div><div className="text-muted-foreground">members</div></div>
                <div><div className="text-2xl font-bold">{Number(totals.total_clubs).toLocaleString()}</div><div className="text-muted-foreground">clubs</div></div>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="font-display font-semibold">Public clubs</h3>
            {publicClubs.length === 0 && <p className="text-muted-foreground text-sm">No public clubs yet.</p>}
            {publicClubs.map((c: any) => {
              const count = memberCounts[c.id] ?? 0;
              const full = c.member_cap && count >= c.member_cap;
              const joined = myClubIds.has(c.id);
              return (
                <Card key={c.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-display text-lg font-semibold truncate">{c.name}</h4>
                    {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Users className="h-3 w-3" /> {count}{c.member_cap ? ` / ${c.member_cap}` : ''}
                      <span>• {c.join_policy === 'instant' ? 'instant join' : 'approval required'}</span>
                    </p>
                  </div>
                  {joined ? (
                    <Button asChild variant="secondary" size="sm"><Link to={`/c/${c.id}`}>Open</Link></Button>
                  ) : (
                    <Button size="sm" disabled={!!full} onClick={() => handleJoin(c.id, c.join_policy, c.member_cap)}>
                      {full ? 'Full' : c.join_policy === 'instant' ? 'Join' : 'Request'}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          {popular.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-display font-semibold">Popular across all clubs</h3>
              <div className="grid gap-2">
                {popular.map((b: any, i: number) => (
                  <Card key={i} className="p-3 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.title}</div>
                      <div className="text-muted-foreground text-xs truncate">{b.author}</div>
                    </div>
                    <div className="text-muted-foreground text-xs shrink-0">
                      {b.avg_rating ? `★ ${Number(b.avg_rating).toFixed(1)}` : ''} {Number(b.rating_count) + Number(b.recommendation_count)} mentions
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="pt-4">
          <Card className="p-6 max-w-lg">
            <h3 className="font-display text-xl font-semibold mb-2">Start a new book club</h3>
            <p className="text-sm text-muted-foreground mb-4">You'll be the owner and can invite others or set it public.</p>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Create a club</Button>
              </DialogTrigger>
              <CreateClubDialog onCreated={(id) => { setCreateOpen(false); navigate(`/c/${id}`); }} />
            </Dialog>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const CreateClubDialog = ({ onCreated }: { onCreated: (id: string) => void }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [approval, setApproval] = useState(false);
  const [cap, setCap] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    const parsed = createSchema.safeParse({
      name,
      description: description || undefined,
      visibility: isPublic ? 'public' : 'private',
      join_policy: approval ? 'approval' : 'instant',
      member_cap: cap ? parseInt(cap, 10) : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { data: club, error } = await supabase.from('clubs').insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      visibility: parsed.data.visibility,
      join_policy: parsed.data.join_policy,
      member_cap: parsed.data.member_cap,
      owner_id: user.id,
    }).select().single();
    if (error || !club) {
      setSubmitting(false);
      return toast.error(error?.message ?? 'Failed to create');
    }
    const { error: mErr } = await supabase.from('club_members').insert({
      club_id: club.id, user_id: user.id, role: 'owner',
    });
    setSubmitting(false);
    if (mErr) return toast.error(mErr.message);
    toast.success('Club created!');
    queryClient.invalidateQueries({ queryKey: ['user-clubs'] });
    queryClient.invalidateQueries({ queryKey: ['public-clubs'] });
    onCreated(club.id);
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Create a club</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="My Cozy Reads" /></div>
        <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="What's this club about?" /></div>
        <div className="flex items-center justify-between"><div><Label>Public</Label><p className="text-xs text-muted-foreground">Anyone can discover and join.</p></div><Switch checked={isPublic} onCheckedChange={setIsPublic} /></div>
        {isPublic && (
          <div className="flex items-center justify-between"><div><Label>Require approval</Label><p className="text-xs text-muted-foreground">Review join requests yourself.</p></div><Switch checked={approval} onCheckedChange={setApproval} /></div>
        )}
        <div><Label>Member cap (optional)</Label><Input type="number" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="e.g. 20" /></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</Button></DialogFooter>
    </DialogContent>
  );
};

export default Clubs;

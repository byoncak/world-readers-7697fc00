import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Trash2, Shield, UserMinus, Copy, RefreshCw } from 'lucide-react';

const ClubManage = () => {
  const { club, clubId, role, isClubAdmin, clubPath } = useClub();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(club?.name ?? '');
  const [description, setDescription] = useState(club?.description ?? '');
  const [isPublic, setIsPublic] = useState(club?.visibility === 'public');
  const [approval, setApproval] = useState(club?.join_policy === 'approval');
  const [cap, setCap] = useState(club?.member_cap?.toString() ?? '');

  const { data: members = [] } = useQuery({
    queryKey: ['club-members-full', clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from('club_members')
        .select('id, user_id, role, joined_at, profile:profiles!club_members_user_id_fkey(display_name, avatar_url)')
        .eq('club_id', clubId!);
      return data ?? [];
    },
    enabled: !!clubId && isClubAdmin,
  });

  // Fallback fetch profiles if FK shorthand fails
  const { data: profileMap = {} } = useQuery({
    queryKey: ['club-member-profiles', clubId, members.length],
    queryFn: async () => {
      const ids = members.map((m: any) => m.user_id);
      if (!ids.length) return {};
      const { data } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', ids);
      const map: Record<string, any> = {};
      (data ?? []).forEach((p: any) => { map[p.user_id] = p; });
      return map;
    },
    enabled: !!members.length,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['club-join-requests', clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from('club_join_requests')
        .select('id, user_id, status, created_at')
        .eq('club_id', clubId!)
        .eq('status', 'pending');
      return data ?? [];
    },
    enabled: !!clubId && isClubAdmin,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['club-invites', clubId],
    queryFn: async () => {
      const { data } = await supabase.from('club_invites').select('*').eq('club_id', clubId!).eq('revoked', false);
      return data ?? [];
    },
    enabled: !!clubId && isClubAdmin,
  });

  if (!club) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!isClubAdmin) return <div className="p-6 text-muted-foreground">Only club admins can manage this club.</div>;

  const saveSettings = async () => {
    const { error } = await supabase.from('clubs').update({
      name: name.trim(),
      description: description.trim() || null,
      visibility: isPublic ? 'public' : 'private',
      join_policy: approval ? 'approval' : 'instant',
      member_cap: cap ? parseInt(cap, 10) : null,
    }).eq('id', clubId!);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    queryClient.invalidateQueries({ queryKey: ['user-clubs'] });
  };

  const removeMember = async (mid: string, uid: string) => {
    if (uid === club.owner_id) return toast.error("Can't remove the owner.");
    const { error } = await supabase.from('club_members').delete().eq('id', mid);
    if (error) return toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ['club-members-full'] });
  };

  const promote = async (mid: string, currentRole: string) => {
    const newRole = currentRole === 'member' ? 'admin' : 'member';
    const { error } = await supabase.from('club_members').update({ role: newRole }).eq('id', mid);
    if (error) return toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ['club-members-full'] });
  };

  const decideRequest = async (rid: string, uid: string, approve: boolean) => {
    if (approve) {
      const { error } = await supabase.from('club_members').insert({ club_id: clubId!, user_id: uid, role: 'member' });
      if (error) return toast.error(error.message);
    }
    await supabase.from('club_join_requests').update({ status: approve ? 'approved' : 'declined' }).eq('id', rid);
    queryClient.invalidateQueries({ queryKey: ['club-join-requests'] });
    queryClient.invalidateQueries({ queryKey: ['club-members-full'] });
  };

  const createInvite = async () => {
    if (!user) return;
    const code = Math.random().toString(36).slice(2, 10);
    const { error } = await supabase.from('club_invites').insert({ club_id: clubId!, code, created_by: user.id });
    if (error) return toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ['club-invites'] });
  };

  const revokeInvite = async (id: string) => {
    await supabase.from('club_invites').update({ revoked: true }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['club-invites'] });
  };

  const deleteClub = async () => {
    if (!confirm(`Delete "${club.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('clubs').delete().eq('id', clubId!);
    if (error) return toast.error(error.message);
    toast.success('Club deleted');
    navigate('/clubs');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <h1 className="font-display text-3xl font-bold">Manage {club.name}</h1>

      <Card className="p-4 space-y-3">
        <h2 className="font-display text-xl font-semibold">Settings</h2>
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></div>
        <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} /></div>
        <div className="flex items-center justify-between"><Label>Public</Label><Switch checked={isPublic} onCheckedChange={setIsPublic} /></div>
        {isPublic && <div className="flex items-center justify-between"><Label>Require approval to join</Label><Switch checked={approval} onCheckedChange={setApproval} /></div>}
        <div><Label>Member cap (blank = unlimited)</Label><Input type="number" value={cap} onChange={(e) => setCap(e.target.value)} /></div>
        <Button onClick={saveSettings}>Save</Button>
      </Card>

      {requests.length > 0 && (
        <Card className="p-4 space-y-2">
          <h2 className="font-display text-xl font-semibold">Pending requests</h2>
          {requests.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between">
              <span className="text-sm">{profileMap[r.user_id]?.display_name ?? r.user_id.slice(0, 8)}</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decideRequest(r.id, r.user_id, true)}>Approve</Button>
                <Button size="sm" variant="ghost" onClick={() => decideRequest(r.id, r.user_id, false)}>Decline</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-4 space-y-2">
        <h2 className="font-display text-xl font-semibold">Members ({members.length})</h2>
        {members.map((m: any) => {
          const p = profileMap[m.user_id];
          return (
            <div key={m.id} className="flex items-center justify-between">
              <span className="text-sm">
                {p?.display_name ?? m.user_id.slice(0, 8)} <span className="text-xs text-muted-foreground">· {m.role}</span>
              </span>
              {m.user_id !== club.owner_id && role === 'owner' && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" title="Toggle admin" onClick={() => promote(m.id, m.role)}><Shield className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Remove" onClick={() => removeMember(m.id, m.user_id)}><UserMinus className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Invite links</h2>
          <Button size="sm" onClick={createInvite}><RefreshCw className="h-4 w-4 mr-1" /> New code</Button>
        </div>
        {invites.length === 0 && <p className="text-sm text-muted-foreground">No active invites.</p>}
        {invites.map((i: any) => {
          const url = `${window.location.origin}/clubs?invite=${i.code}`;
          return (
            <div key={i.id} className="flex items-center justify-between gap-2 text-sm">
              <code className="truncate flex-1">{url}</code>
              <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied'); }}><Copy className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => revokeInvite(i.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          );
        })}
      </Card>

      {role === 'owner' && (
        <Card className="p-4 border-destructive/50">
          <h2 className="font-display text-xl font-semibold text-destructive mb-2">Danger zone</h2>
          <Button variant="destructive" onClick={deleteClub}><Trash2 className="h-4 w-4 mr-1" /> Delete this club</Button>
        </Card>
      )}

      <Button variant="ghost" onClick={() => navigate(clubPath())}>← Back to club</Button>
    </div>
  );
};

export default ClubManage;

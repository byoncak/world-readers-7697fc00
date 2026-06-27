import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/hooks/useRole';
import { Crown, Star, User, Users, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface MemberRow {
  user_id: string;
  display_name: string | null;
  role: AppRole | null;
}

const roleIcons: Record<AppRole, typeof Crown> = {
  admin: Crown,
  moderator: Star,
  member: User,
};

const roleColors: Record<AppRole, string> = {
  admin: 'cozy-badge-peach',
  moderator: 'cozy-badge-lavender',
  member: 'cozy-badge-sage',
};

const ROLES: AppRole[] = ['admin', 'moderator', 'member'];

interface Props {
  currentUserId: string;
}

const AdminMembersRoles = ({ currentUserId }: Props) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name').order('created_at', { ascending: true }),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    if (!profiles) return;
    setMembers(
      profiles.map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        role: (roles?.find((r) => r.user_id === p.user_id)?.role as AppRole) ?? null,
      }))
    );
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const setMemberRole = async (userId: string, newRole: AppRole) => {
    setSaving(userId);
    const { data: existing } = await supabase.from('user_roles').select('id').eq('user_id', userId).maybeSingle();
    if (existing) {
      await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
    }
    await fetchMembers();
    setSaving(null);
  };

  const removeRole = async (userId: string) => {
    setSaving(userId);
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await fetchMembers();
    setSaving(null);
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke('delete-member', { body: { target_user_id: deleteTarget.user_id } });
      if (res.error) throw new Error((res.data as any)?.error || res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: `${deleteTarget.display_name || 'Member'} has been removed` });
      setDeleteTarget(null);
      await fetchMembers();
    } catch (e: any) {
      toast({ title: 'Error deleting member', description: e.message, variant: 'destructive' });
    }
    setDeleting(false);
  };

  return (
    <>
      <div className="cozy-card p-0">
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-body font-semibold transition-all duration-200 cursor-pointer select-none ${
            open ? 'bg-peach/10 text-foreground' : 'bg-card text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left font-display text-base font-bold">Members & Roles</span>
          {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </button>
        {open && (
          <div className="px-4 pb-4 pt-2">
            <p className="text-sm text-muted-foreground font-body mb-5">
              Assign roles to control who can manage books, set meetup dates, and more.
            </p>
            <div className="space-y-3">
              {members.map((m) => {
                const currentRole = m.role ?? 'member';
                const Icon = roleIcons[currentRole];
                const isCurrentUser = m.user_id === currentUserId;
                return (
                  <div key={m.user_id} className="relative flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    {!isCurrentUser && (
                      <button onClick={() => setDeleteTarget(m)} className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete member">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-serif text-sm font-semibold">
                          {m.display_name || 'Reader'}
                          {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground font-body">(you)</span>}
                        </p>
                        <span className={`cozy-badge text-[10px] ${roleColors[currentRole]}`}>{currentRole}</span>
                      </div>
                    </div>
                    {!isCurrentUser && (
                      <div className="flex items-center gap-2">
                        {saving === m.user_id ? (
                          <span className="text-xs text-muted-foreground font-body">Saving...</span>
                        ) : (
                          <>
                            {ROLES.map((r) => (
                              <button key={r} onClick={() => setMemberRole(m.user_id, r)} className={`rounded-lg px-3 py-1.5 text-xs font-body font-semibold transition-all ${currentRole === r ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                                {r}
                              </button>
                            ))}
                            {m.role && (
                              <button onClick={() => removeRole(m.user_id)} className="text-xs text-destructive font-body hover:underline ml-1">Remove</button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {members.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground font-body">No members found 🤔</p>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Member"
        message={`Are you sure you want to permanently delete ${deleteTarget?.display_name || 'this member'}? This will remove their account, profile, and all associated data. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteMember}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default AdminMembersRoles;

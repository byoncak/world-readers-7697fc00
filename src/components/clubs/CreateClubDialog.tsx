import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional(),
  visibility: z.enum(['public', 'private']),
  join_policy: z.enum(['instant', 'approval']),
  member_cap: z.number().int().positive().max(10000).nullable(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}

const CreateClubDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [approval, setApproval] = useState(false);
  const [cap, setCap] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
    setIsPublic(true);
    setApproval(false);
    setCap('');
  };

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
    const { data: club, error } = await supabase
      .from('clubs')
      .insert({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        visibility: parsed.data.visibility,
        join_policy: parsed.data.join_policy,
        member_cap: parsed.data.member_cap,
        owner_id: user.id,
      })
      .select()
      .single();
    if (error || !club) {
      setSubmitting(false);
      return toast.error(error?.message ?? 'Failed to create');
    }
    const { error: mErr } = await supabase
      .from('club_members')
      .insert({ club_id: club.id, user_id: user.id, role: 'owner' });
    setSubmitting(false);
    if (mErr) return toast.error(mErr.message);
    toast.success('Club created!');
    queryClient.invalidateQueries({ queryKey: ['user-clubs'] });
    queryClient.invalidateQueries({ queryKey: ['public-clubs'] });
    reset();
    onCreated(club.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a new club</DialogTitle>
          <DialogDescription>You'll be the owner and can invite others.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="My Cozy Reads"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="c-desc">Description</Label>
            <Textarea
              id="c-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What's this club about?"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="c-public">Public</Label>
              <p className="text-xs text-muted-foreground">Anyone can discover and join.</p>
            </div>
            <Switch id="c-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          {isPublic && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="c-approval">Require approval</Label>
                <p className="text-xs text-muted-foreground">Review join requests yourself.</p>
              </div>
              <Switch id="c-approval" checked={approval} onCheckedChange={setApproval} />
            </div>
          )}
          <div>
            <Label htmlFor="c-cap">Member cap (optional)</Label>
            <Input
              id="c-cap"
              type="number"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              placeholder="e.g. 20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClubDialog;

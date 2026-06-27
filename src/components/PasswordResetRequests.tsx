import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { KeyRound, Check, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ResetRequest {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  created_at: string;
}

const invokeReset = async (body: Record<string, string>) => {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', { body });
  if (error) {
    const msg = (data as any)?.error || error.message || 'Unknown error';
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

const PasswordResetRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [newPassword, setNewPassword] = useState<Record<string, string>>({});
  const [resetting, setResetting] = useState<string | null>(null);

  const [manualUserId, setManualUserId] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualResetting, setManualResetting] = useState(false);
  const [allProfiles, setAllProfiles] = useState<{ user_id: string; display_name: string | null }[]>([]);

  useEffect(() => {
    if (open) {
      fetchRequests();
      fetchProfiles();
    }
  }, [open]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('user_id, display_name').order('display_name');
    setAllProfiles(data ?? []);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setRequests((data as ResetRequest[]) ?? []);
  };

  const handleReset = async (req: ResetRequest) => {
    const password = newPassword[req.id];
    if (!password || password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setResetting(req.id);
    try {
      await invokeReset({
        target_user_id: req.user_id,
        new_password: password,
        request_id: req.id,
      });
      toast({ title: `Password reset for ${req.display_name}` });
      setNewPassword((prev) => ({ ...prev, [req.id]: '' }));
      await fetchRequests();
    } catch (e: any) {
      toast({ title: 'Error resetting password', description: e.message, variant: 'destructive' });
    }
    setResetting(null);
  };

  const handleManualReset = async () => {
    if (!manualUserId || !manualPassword || manualPassword.length < 6) {
      toast({ title: 'Select a user and enter a password (min 6 chars)', variant: 'destructive' });
      return;
    }
    setManualResetting(true);
    try {
      await invokeReset({ target_user_id: manualUserId, new_password: manualPassword });
      const name = allProfiles.find((p) => p.user_id === manualUserId)?.display_name || 'User';
      toast({ title: `Password reset for ${name}` });
      setManualUserId('');
      setManualPassword('');
    } catch (e: any) {
      toast({ title: 'Error resetting password', description: e.message, variant: 'destructive' });
    }
    setManualResetting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          Password Resets
          {requests.length > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {requests.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <KeyRound className="h-5 w-5 text-terracotta" />
            Password Resets
          </DialogTitle>
        </DialogHeader>

        {/* Manual reset */}
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-serif font-semibold mb-3">Manual Reset</p>
          <div className="flex flex-col gap-2">
            <select
              value={manualUserId}
              onChange={(e) => setManualUserId(e.target.value)}
              className="cozy-input text-sm"
            >
              <option value="">Select member…</option>
              {allProfiles.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.display_name || 'Reader'}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="New password"
              value={manualPassword}
              onChange={(e) => setManualPassword(e.target.value)}
              className="cozy-input text-sm"
            />
            <button
              onClick={handleManualReset}
              disabled={manualResetting}
              className="cozy-btn-primary text-sm flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {manualResetting ? <Loader className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
              Reset Password
            </button>
          </div>
        </div>

        {/* Pending requests */}
        {requests.length > 0 && (
          <div>
            <p className="text-sm font-serif font-semibold mb-3">Pending Requests</p>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3"
                >
                  <div>
                    <p className="font-serif text-sm font-semibold">{req.display_name}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      Requested {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="New password"
                      value={newPassword[req.id] || ''}
                      onChange={(e) =>
                        setNewPassword((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      className="cozy-input text-sm flex-1"
                    />
                    <button
                      onClick={() => handleReset(req)}
                      disabled={resetting === req.id}
                      className="cozy-btn-primary text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      {resetting === req.id ? (
                        <Loader className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Reset
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PasswordResetRequests;

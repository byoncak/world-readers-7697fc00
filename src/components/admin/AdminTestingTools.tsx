import { useEffect, useState } from 'react';
import { Wrench, Apple, BellOff, Construction, ShieldAlert } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

import { useToast } from '@/hooks/use-toast';
import { useRoleOverride } from '@/hooks/useRoleOverride';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useIsSuperUser } from '@/hooks/useIsSuperUser';

import { supabase } from '@/integrations/supabase/client';
import PasswordResetRequests from '@/components/PasswordResetRequests';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface Props {
  userId: string;
}

/**
 * Testing / developer tools. All rendering is gated on the server-authoritative
 * `is_super_user` RPC. Any localStorage sandbox flag is wiped for non-super-users
 * on mount so a demoted account can't retain sandbox behavior.
 */
const AdminTestingTools = ({ userId }: Props) => {
  const { toast } = useToast();
  const { isSuperUser, loading: superLoading } = useIsSuperUser();
  const { hudVisible, setHudVisible } = useRoleOverride();
  const [clearingNotifs, setClearingNotifs] = useState(false);
  const { enabled: maintenanceEnabled, setMaintenance } = useMaintenanceMode();

  useEffect(() => {
    if (!superLoading && !isSuperUser) {
      try {
        localStorage.removeItem('freeShopMode');
        localStorage.removeItem('selfCheerEnabled');
        localStorage.removeItem('selfCheerResetAt');
        localStorage.removeItem('forceSpoilerHide');
      } catch { /* ignore */ }
    }
  }, [isSuperUser, superLoading]);

  if (superLoading) {
    return (
      <div className="cozy-card">
        <p className="text-sm text-muted-foreground font-body">Verifying access…</p>
      </div>
    );
  }

  if (!isSuperUser) {
    return (
      <div className="cozy-card border-l-4 border-destructive">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <h3 className="cozy-title text-lg">Developer tools</h3>
        </div>
        <p className="text-sm text-muted-foreground font-body">
          Only the super user can access developer tools. Server-side checks reject
          these actions for anyone else even if the UI is bypassed.
        </p>
      </div>
    );
  }

  return (
    <div className="cozy-card border-l-4 border-destructive">
      <div className="flex items-center gap-2 mb-1">
        <Wrench className="h-4 w-4 text-destructive" />
        <h3 className="cozy-title text-lg">Developer tools</h3>
      </div>
      <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-xs font-body text-destructive">
        <ShieldAlert className="inline h-3.5 w-3.5 mr-1 align-[-2px]" />
        Actions here affect real production data across every club. Only visible to the sole super user.
      </div>

      <section className="space-y-4">
        <h4 className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground">
          UI sandbox toggles
        </h4>
        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <Checkbox checked={hudVisible} onCheckedChange={(checked) => setHudVisible(!!checked)} />
          <span className="text-sm font-body">Show "Preview UI as" role bar (client-only view change)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <Checkbox
            checked={localStorage.getItem('selfCheerEnabled') === 'true'}
            onCheckedChange={async (checked) => {
              localStorage.setItem('selfCheerEnabled', checked ? 'true' : 'false');
              if (checked) {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                await supabase.from('cheers').delete().eq('from_user_id', userId).eq('to_user_id', userId).gte('created_at', todayStart.toISOString());
                localStorage.setItem('selfCheerResetAt', Date.now().toString());
              }
              toast({ title: checked ? '👏 Self-cheer enabled & reset' : 'Self-cheer disabled' });
            }}
          />
          <span className="text-sm font-body">Enable self-cheer (test cheering yourself)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <Checkbox
            checked={localStorage.getItem('freeShopMode') === 'true'}
            onCheckedChange={(checked) => {
              localStorage.setItem('freeShopMode', checked ? 'true' : 'false');
              toast({ title: checked ? '🧪 Free Shop Mode enabled' : 'Free Shop Mode disabled', description: checked ? 'Shop items free with re-lock option (super-user only server-side)' : undefined });
            }}
          />
          <span className="text-sm font-body">Free Shop Mode (claim items free &amp; re-lock)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <Checkbox
            checked={localStorage.getItem('forceSpoilerHide') === 'true'}
            onCheckedChange={(checked) => {
              localStorage.setItem('forceSpoilerHide', checked ? 'true' : 'false');
              toast({ title: checked ? '🙈 Spoiler test mode ON' : 'Spoiler test mode OFF' });
            }}
          />
          <span className="text-sm font-body">Force spoiler hide (preview as unread reader)</span>
        </label>
      </section>

      <hr className="my-4 border-border" />

      <section className="space-y-3">
        <h4 className="text-xs font-body font-semibold uppercase tracking-wide text-destructive">
          System actions (real data)
        </h4>

        <label className="flex items-start gap-3 cursor-pointer rounded-lg bg-amber-500/10 p-3 min-h-[44px]">
          <Checkbox
            checked={maintenanceEnabled}
            onCheckedChange={async (checked) => {
              const next = !!checked;
              const { error } = await setMaintenance(next);
              if (error) {
                toast({ title: 'Could not update maintenance mode', description: error.message });
                return;
              }
              toast({
                title: next ? '🚧 Under construction mode ON' : 'Maintenance mode OFF',
                description: next ? 'Everyone except the super user sees the construction page.' : undefined,
              });
            }}
          />
          <div className="flex flex-col">
            <span className="text-sm font-body flex items-center gap-1.5">
              <Construction className="h-4 w-4" />
              Under construction mode
            </span>
            <span className="text-xs text-muted-foreground font-body">
              Locks the entire app. Only you (super user) bypass.
            </span>
          </div>
        </label>

        <button
          onClick={async () => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const { error } = await supabase.functions.invoke('admin-reset-daily-reward', {
              body: { target_user_id: userId, day_start_iso: todayStart.toISOString() },
            });
            if (error) {
              toast({ title: 'Could not reset daily reward', description: error.message });
              return;
            }
            window.dispatchEvent(new Event('dailyRewardReset'));
            toast({ title: '🍎 Daily reward reset — check your notification bell!' });
          }}
          className="flex items-center gap-2 text-sm font-body rounded-lg bg-accent/50 hover:bg-accent px-3 py-2 min-h-[44px] transition-colors"
        >
          <Apple className="h-4 w-4" />
          Reset my Daily Apple Claim
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={clearingNotifs}
              className="flex items-center gap-2 text-sm font-body rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-2 min-h-[44px] transition-colors disabled:opacity-50"
            >
              <BellOff className="h-4 w-4" />
              {clearingNotifs ? 'Clearing…' : 'Clear ALL notifications (every user)'}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes every notification for every member across every club. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                setClearingNotifs(true);
                const { error } = await supabase.functions.invoke('admin-clear-notifications');
                setClearingNotifs(false);
                if (error) {
                  toast({ title: 'Failed to clear notifications', description: error.message });
                } else {
                  toast({ title: '🔔 All notifications cleared' });
                }
              }}>
                Clear all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="pt-2">
          <PasswordResetRequests />
        </div>
      </section>
    </div>
  );
};

export default AdminTestingTools;

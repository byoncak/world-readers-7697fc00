import { useState } from 'react';
import { Wrench, Apple, BellOff, Construction } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

import { useToast } from '@/hooks/use-toast';
import { useRoleOverride } from '@/hooks/useRoleOverride';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';

import { supabase } from '@/integrations/supabase/client';
import PasswordResetRequests from '@/components/PasswordResetRequests';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface Props {
  userId: string;
}

const AdminTestingTools = ({ userId }: Props) => {
  const { toast } = useToast();
  const { hudVisible, setHudVisible } = useRoleOverride();
  const [clearingNotifs, setClearingNotifs] = useState(false);
  const { enabled: maintenanceEnabled, setMaintenance } = useMaintenanceMode();

  return (
    <div className="cozy-card">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <h3 className="cozy-title text-lg">Testing Tools</h3>
      </div>
      <p className="text-sm text-muted-foreground font-body mb-4">Developer utilities and admin tools.</p>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox checked={hudVisible} onCheckedChange={(checked) => setHudVisible(!!checked)} />
          <span className="text-sm font-body">Show "View&nbsp;As" role&nbsp;switcher bar</span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer rounded-lg bg-amber-500/10 p-3">
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
                description: next ? 'Everyone except admins sees the construction page.' : undefined,
              });
            }}
          />
          <div className="flex flex-col">
            <span className="text-sm font-body flex items-center gap-1.5">
              <Construction className="h-4 w-4" />
              Under construction mode
            </span>
            <span className="text-xs text-muted-foreground font-body">
              Locks the app for all members. Admins bypass automatically.
            </span>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
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
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={localStorage.getItem('freeShopMode') === 'true'}
            onCheckedChange={(checked) => {
              localStorage.setItem('freeShopMode', checked ? 'true' : 'false');
              toast({ title: checked ? '🧪 Free Shop Mode enabled' : 'Free Shop Mode disabled', description: checked ? 'Shop items are now free with re-lock option' : undefined });
            }}
          />
          <span className="text-sm font-body">Free Shop Mode (claim items free &amp; re-lock)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={localStorage.getItem('forceSpoilerHide') === 'true'}
            onCheckedChange={(checked) => {
              localStorage.setItem('forceSpoilerHide', checked ? 'true' : 'false');
              toast({ title: checked ? '🙈 Spoiler test mode ON' : 'Spoiler test mode OFF', description: checked ? 'Quotes will hide as if you haven\'t read them. Refresh the Reflect page.' : undefined });
            }}
          />
          <span className="text-sm font-body">Force spoiler hide (test as unread reader)</span>
        </label>
        <button
          onClick={async () => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { error } = await supabase.functions.invoke('admin-reset-daily-reward', {
              body: {
                target_user_id: userId,
                day_start_iso: todayStart.toISOString(),
              },
            });

            if (error) {
              toast({
                title: 'Could not reset daily reward',
                description: error.message,
              });
              return;
            }

            window.dispatchEvent(new Event('dailyRewardReset'));
            toast({ title: '🍎 Daily reward reset — check your notification bell!' });
          }}
          className="flex items-center gap-2 text-sm font-body rounded-lg bg-accent/50 hover:bg-accent px-3 py-2 transition-colors"
        >
          <Apple className="h-4 w-4" />
          Reset Daily Apple Claim
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={clearingNotifs}
              className="flex items-center gap-2 text-sm font-body rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-2 transition-colors disabled:opacity-50"
            >
              <BellOff className="h-4 w-4" />
              {clearingNotifs ? 'Clearing…' : 'Clear All Notifications'}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete every notification for every member. This cannot be undone.
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
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <PasswordResetRequests />
      </div>
    </div>
  );
};

export default AdminTestingTools;

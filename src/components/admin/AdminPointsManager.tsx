import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Apple, ChevronDown, ChevronUp, Plus, Minus, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StyledName from '@/components/StyledName';

interface MemberPoints {
  user_id: string;
  display_name: string | null;
  total_points: number;
  lifetime_points: number;
}

interface SpamAlert {
  user_id: string;
  display_name: string;
  total_earned: number;
  transaction_count: number;
  latest_action: string;
}

const AdminPointsManager = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberPoints[]>([]);
  const [spamAlerts, setSpamAlerts] = useState<SpamAlert[]>([]);
  const [open, setOpen] = useState(false);
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const fetchSpamAlerts = useCallback(async () => {
    const { data } = await supabase.rpc('detect_point_spam', { _hours: 24, _threshold: 80 });
    setSpamAlerts((data as SpamAlert[]) || []);
  }, []);

  const fetchMembers = useCallback(async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .order('display_name');

    const { data: points } = await supabase
      .from('user_points')
      .select('user_id, total_points, lifetime_points');

    if (!profiles) return;

    const pointsMap = new Map((points || []).map(p => [p.user_id, p]));

    const merged: MemberPoints[] = profiles.map(p => ({
      user_id: p.user_id,
      display_name: p.display_name,
      total_points: pointsMap.get(p.user_id)?.total_points ?? 0,
      lifetime_points: pointsMap.get(p.user_id)?.lifetime_points ?? 0,
    }));

    merged.sort((a, b) => b.total_points - a.total_points);
    setMembers(merged);
  }, []);

  useEffect(() => {
    if (open) {
      fetchMembers();
      fetchSpamAlerts();
    }
  }, [open, fetchMembers, fetchSpamAlerts]);

  const adjustPoints = async (userId: string, amount: number) => {
    if (amount === 0) return;
    setLoading(userId);

    const { error } = await supabase.rpc('award_points', {
      _user_id: userId,
      _amount: amount,
      _action_type: 'admin_adjustment',
      _description: amount > 0 ? 'Admin gifted apples' : 'Admin deducted apples',
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: amount > 0 ? '🍎 Apples gifted!' : '🍎 Apples deducted' });
      setAdjustAmounts(prev => ({ ...prev, [userId]: '' }));
      fetchMembers();
    }
    setLoading(null);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="cozy-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-terracotta" />
            <h2 className="cozy-title text-lg">Apple Ledger</h2>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-2">
          {spamAlerts.length > 0 && (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <span className="font-semibold">🚨 Suspicious activity (last 24h):</span>
                {spamAlerts.map(a => (
                  <div key={a.user_id} className="mt-1">
                    <span className="font-medium">{a.display_name}</span> earned {a.total_earned} 🍎 across {a.transaction_count.toString()} actions (latest: {a.latest_action})
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body py-4 text-center">Loading…</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-1.5">
              {members.map(m => {
                const rawAmount = adjustAmounts[m.user_id] ?? '';
                const parsedAmount = parseInt(rawAmount, 10) || 0;

                return (
                  <div key={m.user_id} className="flex items-center gap-2 rounded-xl border border-border p-2.5">
                    <div className="flex-1 min-w-0">
                      <StyledName userId={m.user_id} name={m.display_name || 'Reader'} className="text-sm font-semibold" />
                      <p className="text-xs text-muted-foreground font-body">
                        🍎 {m.total_points} <span className="opacity-50">({m.lifetime_points} lifetime)</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={rawAmount}
                        onChange={e => setAdjustAmounts(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                        placeholder="0"
                        className="cozy-input w-16 text-center text-xs py-1"
                      />
                      <button
                        onClick={() => adjustPoints(m.user_id, parsedAmount)}
                        disabled={parsedAmount <= 0 || loading === m.user_id}
                        className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-30 transition-colors"
                        title="Gift apples"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => adjustPoints(m.user_id, -parsedAmount)}
                        disabled={parsedAmount <= 0 || loading === m.user_id}
                        className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-30 transition-colors"
                        title="Deduct apples"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default AdminPointsManager;

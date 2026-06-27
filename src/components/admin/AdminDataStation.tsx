import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import StyledName from '@/components/StyledName';

interface Transaction {
  user_id: string;
  amount: number;
  action_type: string;
  created_at: string;
  description: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  daily_login: 'Daily Login',
  discussion_post: 'Discussion',
  discussion_reply: 'Reply',
  book_suggestion: 'Suggestion',
  cheer: 'Cheer',
  rsvp: 'RSVP',
  book_recommendation: 'Recommend',
  progress_update: 'Progress',
  suggestion_comment: 'Comment',
  vote_like: 'Vote/Like',
  dm_sent: 'DM',
  reaction: 'Reaction',
  purchase: 'Purchase',
  admin_adjustment: 'Admin',
};

const CHART_COLORS = [
  'hsl(15, 55%, 55%)',   // primary/terracotta
  'hsl(145, 20%, 55%)',  // secondary/green
  'hsl(270, 25%, 65%)',  // accent/purple
  'hsl(35, 60%, 60%)',   // warm gold
  'hsl(200, 40%, 55%)',  // blue
  'hsl(340, 40%, 55%)',  // rose
  'hsl(80, 35%, 50%)',   // olive
  'hsl(25, 50%, 50%)',   // brown
];

const chartConfig: ChartConfig = {
  earned: { label: 'Earned', color: 'hsl(145, 20%, 55%)' },
  spent: { label: 'Spent', color: 'hsl(0, 65%, 55%)' },
};

const AdminDataStation = () => {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [txRes, profRes] = await Promise.all([
      supabase
        .from('point_transactions')
        .select('user_id, amount, action_type, created_at, description')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase.from('profiles').select('user_id, display_name').order('display_name'),
    ]);
    setTransactions(txRes.data || []);
    setProfiles(profRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const filtered = useMemo(
    () => selectedUser === 'all' ? transactions : transactions.filter(t => t.user_id === selectedUser),
    [transactions, selectedUser]
  );

  // Daily earning/spending over last 14 days
  const dailyData = useMemo(() => {
    const days: Record<string, { earned: number; spent: number }> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10);
      days[key] = { earned: 0, spent: 0 };
    }
    filtered.forEach(t => {
      const key = t.created_at.slice(5, 10);
      if (days[key]) {
        if (t.amount > 0) days[key].earned += t.amount;
        else days[key].spent += Math.abs(t.amount);
      }
    });
    return Object.entries(days).map(([date, v]) => ({ date, ...v }));
  }, [filtered]);

  // Breakdown by action type
  const actionBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter(t => t.amount > 0).forEach(t => {
      const label = ACTION_LABELS[t.action_type] || t.action_type;
      map[label] = (map[label] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Leaderboard
  const leaderboard = useMemo(() => {
    const map: Record<string, { earned: number; spent: number }> = {};
    transactions.forEach(t => {
      if (!map[t.user_id]) map[t.user_id] = { earned: 0, spent: 0 };
      if (t.amount > 0) map[t.user_id].earned += t.amount;
      else map[t.user_id].spent += Math.abs(t.amount);
    });
    const profileMap = new Map(profiles.map(p => [p.user_id, p.display_name]));
    return Object.entries(map)
      .map(([uid, v]) => ({ user_id: uid, name: profileMap.get(uid) || 'Reader', ...v }))
      .sort((a, b) => b.earned - a.earned);
  }, [transactions, profiles]);

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.display_name || 'Reader';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="cozy-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent-foreground" />
            <h2 className="cozy-title text-lg">Data Station</h2>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground font-body py-4 text-center">Loading…</p>
          ) : (
            <>
              {/* User filter */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="cozy-input text-xs py-1 flex-1"
                >
                  <option value="all">All Members</option>
                  {profiles.map(p => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.display_name || 'Reader'}
                    </option>
                  ))}
                </select>
              </div>

              <Tabs defaultValue="trend" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="trend" className="text-xs">Trend</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                  <TabsTrigger value="breakdown" className="text-xs">Breakdown</TabsTrigger>
                  <TabsTrigger value="leaderboard" className="text-xs">Leaderboard</TabsTrigger>
                </TabsList>

                {/* Trend line chart */}
                <TabsContent value="trend" className="mt-3">
                  <p className="text-xs text-muted-foreground font-body mb-2">Points trend — last 14 days</p>
                  <ChartContainer config={chartConfig} className="h-48 w-full">
                    <LineChart data={dailyData}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="earned" stroke="var(--color-earned)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="spent" stroke="var(--color-spent)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ChartContainer>
                </TabsContent>

                {/* Timeline */}
                <TabsContent value="timeline" className="mt-3">
                  <p className="text-xs text-muted-foreground font-body mb-2">Last 14 days — earned vs spent</p>
                  <ChartContainer config={chartConfig} className="h-48 w-full">
                    <BarChart data={dailyData}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="earned" fill="var(--color-earned)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="spent" fill="var(--color-spent)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </TabsContent>

                {/* Breakdown */}
                <TabsContent value="breakdown" className="mt-3">
                  <p className="text-xs text-muted-foreground font-body mb-2">Points earned by activity type</p>
                  <ChartContainer config={chartConfig} className="h-48 w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={actionBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {actionBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {actionBreakdown.map((item, i) => (
                      <span key={item.name} className="flex items-center gap-1 text-[10px] font-body text-muted-foreground">
                        <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {item.name}: {item.value}
                      </span>
                    ))}
                  </div>
                </TabsContent>

                {/* Leaderboard */}
                <TabsContent value="leaderboard" className="mt-3">
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {leaderboard.map((row, i) => (
                      <div key={row.user_id} className="flex items-center gap-2 rounded-xl border border-border p-2">
                        <span className="text-xs font-semibold text-muted-foreground w-5 text-right">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <StyledName userId={row.user_id} name={row.name} className="text-sm font-semibold" />
                        </div>
                        <div className="text-right text-xs font-body">
                          <span className="text-secondary-foreground">+{row.earned}</span>
                          {row.spent > 0 && <span className="text-destructive ml-1.5">-{row.spent}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Recent transactions */}
              <div>
                <h3 className="text-xs font-semibold font-body text-muted-foreground mb-1.5">
                  Recent Transactions {selectedUser !== 'all' && `— ${getName(selectedUser)}`}
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filtered.slice(0, 50).map(t => (
                    <div key={t.created_at + t.user_id} className="flex items-center gap-2 text-[11px] font-body py-1 border-b border-border/40">
                      <span className={t.amount > 0 ? 'text-secondary-foreground font-semibold' : 'text-destructive font-semibold'}>
                        {t.amount > 0 ? '+' : ''}{t.amount}
                      </span>
                      <span className="text-muted-foreground flex-1 truncate">
                        {ACTION_LABELS[t.action_type] || t.action_type}
                      </span>
                      {selectedUser === 'all' && (
                        <span className="text-muted-foreground truncate max-w-[80px]">
                          {getName(t.user_id)}
                        </span>
                      )}
                      <span className="text-muted-foreground/60 tabular-nums">
                        {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default AdminDataStation;

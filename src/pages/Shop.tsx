import { useAuth } from '@/hooks/useAuth';
import { useShopData } from '@/hooks/useShopData';
import { Apple, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ShopItemCard from '@/components/shop/ShopItemCard';
import UnlockSuccessDialog from '@/components/shop/UnlockSuccessDialog';
import { useState, useRef, useEffect } from 'react';

const CATEGORIES = [
  { key: 'avatar_frame', emoji: '🖼️', label: 'Frames' },
  { key: 'badge', emoji: '🏅', label: 'Badges' },
  { key: 'title', emoji: '🎭', label: 'Titles' },
  { key: 'name_flair', emoji: '✨', label: 'Flair' },
  { key: 'progress_bar', emoji: '📊', label: 'Bars' },
  { key: 'theme', emoji: '🌙', label: 'Themes' },
];

const EARNING_RULES = [
  { action: 'Daily login claim', points: 25 },
  { action: 'Start a discussion', points: 15 },
  { action: 'Suggest a book', points: 15 },
  { action: 'Reply to a discussion', points: 10 },
  { action: 'Cheer a member', points: 10 },
  { action: 'RSVP to a meetup', points: 10 },
  { action: 'Recommend a book', points: 10 },
  { action: 'Read a page (capped per book)', points: 1 },
  { action: 'Comment on a suggestion', points: 8 },
  { action: 'Vote / like a suggestion', points: 5 },
  { action: 'Send a direct message', points: 3 },
  { action: 'React to a discussion', points: 2 },
];

type CategoryKey = typeof CATEGORIES[number]['key'];

const Shop = () => {
  const { user } = useAuth();
  const { items, owned, points, testMode, handleRelock, purchaseItem, lastUnlocked, clearLastUnlocked } = useShopData(user?.id);
  const [showHelp, setShowHelp] = useState(false);
  const [tab, setTab] = useState<CategoryKey>('avatar_frame');
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = CATEGORIES.findIndex(c => c.key === tab);
    const el = tabsRef.current[idx];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [tab]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Apple className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground not-italic">Shop</h1>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="How to earn points"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>

      {testMode && (
        <div className="flex items-center gap-2 mb-4 rounded-lg border border-dashed border-accent bg-accent/10 px-3 py-2">
          <span className="text-sm font-medium text-accent-foreground">🧪 Free Shop Mode active — items are free, owned items can be re-locked</span>
        </div>
      )}

      <div className="relative mb-4 flex shrink-0 border-b border-border/50">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.key}
            ref={el => { tabsRef.current[i] = el; }}
            onClick={() => setTab(c.key)}
            className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] sm:text-xs font-body tracking-wide leading-tight transition-colors duration-200 ${
              tab === c.key
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="text-base">{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
        <div
          className="absolute -bottom-px h-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
      </div>

      <div className="animate-fade-in pb-2" key={tab}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.filter(i => i.category === tab).map(item => (
            <ShopItemCard
              key={item.id}
              item={item}
              isOwned={owned.has(item.id)}
              canAfford={points >= item.price}
              testMode={testMode}
              onBuy={purchaseItem}
              onRelock={handleRelock}
            />
          ))}
        </div>
      </div>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">How to Earn 🍎</DialogTitle>
            <DialogDescription>Points are awarded for participating in the club.</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">🍎</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EARNING_RULES.map(r => (
                <TableRow key={r.action}>
                  <TableCell className="py-2 text-sm">{r.action}</TableCell>
                  <TableCell className="py-2 text-right font-bold tabular-nums">{r.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <UnlockSuccessDialog
        item={lastUnlocked}
        userId={user?.id}
        open={!!lastUnlocked}
        onClose={clearLastUnlocked}
      />
    </main>
  );
};

export default Shop;

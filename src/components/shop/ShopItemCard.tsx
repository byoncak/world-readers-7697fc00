import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Lock } from 'lucide-react';
import ShopPreview from './ShopPreview';
import HoldToUnlockButton from './HoldToUnlockButton';
import type { ShopItem } from './ShopPreview';

interface ShopItemCardProps {
  item: ShopItem;
  isOwned: boolean;
  canAfford: boolean;
  points: number;
  testMode: boolean;
  purchasing?: boolean;
  stagger?: number;
  onBuy: (item: ShopItem) => void;
  onRelock: (item: ShopItem) => void;
}

const ShopItemCard = memo(({ item, isOwned, canAfford, points, testMode, purchasing = false, stagger = 0, onBuy, onRelock }: ShopItemCardProps) => {
  const shortfall = Math.max(0, item.price - points);

  return (
    <div
      className={`animate-card-in group flex flex-col rounded-2xl border bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        isOwned ? 'border-secondary/70' : 'border-border'
      }`}
      style={{ '--stagger': `${stagger}ms` } as React.CSSProperties}
    >
      {/* Pedestal: the item is the hero */}
      <div className="relative m-3 mb-0 flex min-h-[104px] items-center justify-center rounded-xl bg-muted/40 px-3 transition-colors duration-300 group-hover:bg-muted/60">
        <div className="[&>div]:mb-0 [&>div]:py-3 w-full flex justify-center">
          <ShopPreview item={item} />
        </div>
        {isOwned && (
          <Badge
            variant="secondary"
            className="absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-body shadow-sm"
          >
            <Check className="h-3 w-3 mr-0.5" />
            Owned
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <h3 className="font-display text-base font-bold not-italic text-foreground leading-snug">{item.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground font-body leading-relaxed">{item.description}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-1 font-body">
            {testMode ? (
              <span className="text-xs text-muted-foreground line-through">🍎 {item.price}</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-peach/60 px-2.5 py-1 text-sm font-bold text-foreground">
                <span className="text-sm leading-none">🍎</span>
                {item.price}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isOwned && testMode && (
              <Button size="sm" variant="ghost" className="text-xs text-primary hover:bg-primary/10" onClick={() => onRelock(item)}>
                <Lock className="h-3 w-3 mr-0.5" />
                Re-lock
              </Button>
            )}
            {!isOwned &&
              (!testMode && !canAfford ? (
                <span className="text-xs font-semibold text-muted-foreground font-body whitespace-nowrap" title="Keep reading and chatting to earn apples!">
                  {shortfall} more 🍎 to go
                </span>
              ) : (
                <HoldToUnlockButton price={item.price} canAfford={canAfford} testMode={testMode} onUnlock={() => onBuy(item)} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
});

ShopItemCard.displayName = 'ShopItemCard';

export default ShopItemCard;

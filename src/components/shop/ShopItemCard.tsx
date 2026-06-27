import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  testMode: boolean;
  onBuy: (item: ShopItem) => void;
  onRelock: (item: ShopItem) => void;
}

const ShopItemCard = memo(({ item, isOwned, canAfford, testMode, onBuy, onRelock }: ShopItemCardProps) => (
  <Card className={`rounded-2xl border bg-card shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${isOwned ? 'border-secondary' : ''}`}>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base font-display not-italic">{item.name}</CardTitle>
        {isOwned && (
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold font-body">
            <Check className="h-3 w-3 mr-0.5" />Owned
          </Badge>
        )}
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground font-body mb-2">{item.description}</p>
      <ShopPreview item={item} />
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1 text-sm font-semibold font-body">
          {testMode ? (
            <span className="text-xs text-muted-foreground line-through">🍎 {item.price}</span>
          ) : (
            <><span className="text-sm leading-none">🍎</span>{item.price}</>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isOwned && testMode && (
            <Button size="sm" variant="ghost" className="text-xs text-primary hover:bg-primary/10" onClick={() => onRelock(item)}>
              <Lock className="h-3 w-3 mr-0.5" />Re-lock
            </Button>
          )}
          {!isOwned && (
            <HoldToUnlockButton
              price={item.price}
              canAfford={canAfford}
              testMode={testMode}
              onUnlock={() => onBuy(item)}
            />
          )}
        </div>
      </div>
    </CardContent>
  </Card>
));

ShopItemCard.displayName = 'ShopItemCard';

export default ShopItemCard;

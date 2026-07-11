import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { equipCosmetic } from '@/lib/equipCosmetic';
import { toast } from 'sonner';
import ShopPreview, { type ShopItem } from '@/components/shop/ShopPreview';
import Sparkles from '@/components/Sparkles';
import { celebrate } from '@/lib/celebrate';

const CATEGORY_LABELS: Record<string, string> = {
  avatar_frame: '🖼️ Frame',
  badge: '🏅 Badge',
  title: '🎭 Title',
  name_flair: '✨ Name Flair',
  progress_bar: '📊 Progress Bar',
  theme: '🌙 Theme',
};

interface Props {
  item: ShopItem | null;
  userId: string | undefined;
  open: boolean;
  onClose: () => void;
}

const UnlockSuccessDialog = ({ item, userId, open, onClose }: Props) => {
  const navigate = useNavigate();
  const [equipping, setEquipping] = useState(false);
  const [equipped, setEquipped] = useState(false);

  // Confetti shower + reset when a fresh unlock opens
  useEffect(() => {
    if (open && item) {
      setEquipped(false);
      const t = setTimeout(() => {
        celebrate(window.innerWidth / 2, window.innerHeight * 0.35, { count: 34, power: 170 });
      }, 180);
      return () => clearTimeout(t);
    }
  }, [open, item]);

  if (!item) return null;

  const equipNow = async () => {
    if (!userId || equipping) return;
    setEquipping(true);
    try {
      const { ok, error } = await equipCosmetic(userId, item.id, item.category);
      if (!ok) {
        toast.error('Failed to equip', { description: error });
        return;
      }
      setEquipped(true);
      toast.success(`Equipped "${item.name}"! ✨`);
    } finally {
      setEquipping(false);
    }
  };

  const goToInventory = () => {
    onClose();
    if (userId) navigate(`/member/${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm animate-celebrate-in">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-center not-italic">🎉 Unlocked!</DialogTitle>
          <DialogDescription className="text-center">
            {CATEGORY_LABELS[item.category] ?? item.category}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <Sparkles>
            <div className="unlock-pedestal rounded-xl border border-soft-gold/40 bg-muted/30 p-4">
              <div className="relative z-[1]">
                <ShopPreview item={item} />
              </div>
            </div>
          </Sparkles>
          <div className="text-center">
            <p className="font-display text-lg font-semibold text-foreground not-italic">{item.name}</p>
            <p className="text-sm text-muted-foreground mt-1 font-body">
              {equipped ? 'It\u2019s on! Looking great. 😍' : 'Want to wear it right away?'}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Keep shopping
          </Button>
          {equipped ? (
            <Button onClick={goToInventory} variant="secondary" className="w-full sm:w-auto">
              See inventory
            </Button>
          ) : (
            <Button onClick={equipNow} disabled={equipping} className="w-full sm:w-auto">
              {equipping ? 'Equipping…' : 'Equip now ✨'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnlockSuccessDialog;

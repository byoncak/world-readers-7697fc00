import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ShopPreview, { type ShopItem } from '@/components/shop/ShopPreview';
import Sparkles from '@/components/Sparkles';

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
  if (!item) return null;

  const goToInventory = () => {
    onClose();
    if (userId) navigate(`/member/${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-center">🎉 Unlocked!</DialogTitle>
          <DialogDescription className="text-center">
            {CATEGORY_LABELS[item.category] ?? item.category}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <Sparkles>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <ShopPreview item={item} />
            </div>
          </Sparkles>
          <div className="text-center">
            <p className="font-display text-lg font-semibold text-foreground">{item.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Head to your 🎒 Inventory (on your profile page) to equip it!
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Keep Shopping
          </Button>
          <Button onClick={goToInventory} className="w-full sm:w-auto">
            Go to Inventory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnlockSuccessDialog;

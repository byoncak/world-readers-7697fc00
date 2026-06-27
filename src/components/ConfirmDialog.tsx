import { useEffect, useRef } from 'react';
import { Leaf } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', onConfirm, onCancel }: ConfirmDialogProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onCancel(); }}
    >
      <div className="cozy-card w-full max-w-sm animate-scale-in text-center">
        <Leaf className="mx-auto mb-2 h-8 w-8 text-secondary" />
        <h3 className="cozy-title text-xl mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground font-body mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="cozy-btn-ghost flex-1 text-sm">
            Cancel
          </button>
          <button onClick={(e) => { e.stopPropagation(); onConfirm(); }} className="cozy-btn-primary flex-1 text-sm bg-destructive/80 hover:bg-destructive">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

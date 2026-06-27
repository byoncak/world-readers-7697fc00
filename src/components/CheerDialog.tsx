import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CheerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetName: string;
  bookId: string;
  onCheerSent: () => void;
}

const CHEER_PRESETS = [
  { key: 'default_1', message: 'You got this! 📖', emoji: '📖' },
  { key: 'default_2', message: 'Almost there, keep reading! 🏁', emoji: '🏁' },
  { key: 'default_3', message: 'We believe in you! ✨', emoji: '✨' },
  { key: 'default_4', message: 'The finish line is close! 🎯', emoji: '🎯' },
  { key: 'default_5', message: "Can't wait to discuss it with you! ☕", emoji: '☕' },
];

const MAX_CUSTOM_LENGTH = 100;

const CheerDialog = ({
  open,
  onOpenChange,
  targetUserId,
  targetName,
  bookId,
  onCheerSent,
}: CheerDialogProps) => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const sendCheer = async (preset: { key: string; message: string }) => {
    if (!user || sending) return;
    setSending(true);

    const { error } = await supabase.from('cheers').insert({
      from_user_id: user.id,
      to_user_id: targetUserId,
      book_id: bookId,
      message: preset.message,
      preset_key: preset.key,
    });

    setSending(false);

    if (error) {
      toast({ title: 'Oops!', description: 'Could not send cheer. Try again!', variant: 'destructive' });
      return;
    }

    toast({ title: '🎉 Cheer sent!', description: `You cheered on ${targetName}!` });

    if (targetUserId === user.id) {
      window.dispatchEvent(
        new CustomEvent('cheer:local', {
          detail: { toUserId: targetUserId, fromUserId: user.id, message: preset.message },
        })
      );
    }

    onCheerSent();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-xl">
            Show your support! 👏
          </DialogTitle>
          <DialogDescription className="text-center font-body">
            Cheer on <span className="font-semibold text-foreground">{targetName}</span> — pick a message!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          {!customMode ? (
            <>
              {CHEER_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => sendCheer(preset)}
                  disabled={sending}
                  className="cozy-card flex items-center gap-3 px-4 py-3 text-left text-sm font-body transition-all hover:ring-2 hover:ring-soft-gold/60 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <span>{preset.message}</span>
                </button>
              ))}
              <button
                onClick={() => setCustomMode(true)}
                className="cozy-card flex items-center justify-center gap-2 px-4 py-3 text-sm font-body text-muted-foreground transition-all hover:ring-2 hover:ring-soft-gold/60 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                ✏️ Write your own
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value.slice(0, MAX_CUSTOM_LENGTH))}
                placeholder={`Write a short cheer for ${targetName}…`}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{customMessage.length}/{MAX_CUSTOM_LENGTH}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCustomMode(false); setCustomMessage(''); }}
                    className="px-3 py-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => sendCheer({ key: 'custom', message: customMessage.trim() })}
                    disabled={sending || customMessage.trim().length === 0}
                    className="px-4 py-1.5 text-xs font-body font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Send 🎉
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheerDialog;

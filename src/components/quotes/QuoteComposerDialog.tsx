import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertTriangle, ArrowRight, Send } from 'lucide-react';

type ComposeStep = 'quote' | 'spoiler' | 'page' | 'character';

interface QuoteComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuoteComposerDialog = ({ open, onOpenChange }: QuoteComposerDialogProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [currentBook, setCurrentBook] = useState<{ id: string; title: string; total_pages: number | null } | null>(null);
  const [text, setText] = useState('');
  const [page, setPage] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [character, setCharacter] = useState('');
  const [step, setStep] = useState<ComposeStep>('quote');
  const [submitting, setSubmitting] = useState(false);

  // Fetch current book when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('books')
        .select('id, title, total_pages')
        .eq('status', 'current')
        .maybeSingle();
      if (!cancelled) setCurrentBook(data);
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setText(''); setPage(''); setIsSpoiler(false); setCharacter('');
      setStep('quote'); setSubmitting(false);
    }
  }, [open]);

  const pageRequired = isSpoiler;
  const canContinue = step === 'quote'
    ? !!text.trim()
    : step === 'page'
      ? !pageRequired || !!page
      : true;

  const stepNumber = step === 'quote' ? 1 : step === 'spoiler' ? 2 : step === 'page' ? 3 : 4;

  const goBack = () => {
    setStep(prev => prev === 'character' ? 'page' : prev === 'page' ? 'spoiler' : prev === 'spoiler' ? 'quote' : 'quote');
  };

  const setSpoilerAndContinue = (value: boolean) => {
    setIsSpoiler(value);
    setStep('page');
  };

  const submit = async () => {
    if (!text.trim() || !currentBook || !user) return;
    if (isSpoiler && !page) return;
    setSubmitting(true);
    const { error } = await supabase.from('book_quotes').insert({
      user_id: user.id,
      book_id: currentBook.id,
      quote_text: text.trim(),
      page_number: page ? parseInt(page) : null,
      is_spoiler: isSpoiler,
      character_name: character.trim() || null,
    } as any);
    setSubmitting(false);
    if (!error) {
      qc.invalidateQueries({ queryKey: ['quote-wall'] });
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'quote') { if (text.trim()) setStep('spoiler'); return; }
    if (step === 'spoiler') { setStep('page'); return; }
    if (step === 'page') { if (!pageRequired || page) setStep('character'); return; }
    await submit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Add a quote</DialogTitle>
        </DialogHeader>

        {!currentBook ? (
          <p className="py-6 text-center text-sm text-muted-foreground font-body">
            No active book — quotes can only be added for the current read.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-border/30 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground font-body">
                Step {stepNumber} of 4 · {currentBook.title}
              </span>
              {step !== 'quote' && (
                <button type="button" onClick={goBack} className="text-xs font-semibold text-muted-foreground hover:text-foreground font-body">
                  Back
                </button>
              )}
            </div>

            {step === 'quote' && (
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type a quote from the book…"
                className="min-h-[96px] resize-none text-sm italic leading-relaxed"
                maxLength={500}
                autoFocus
              />
            )}

            {step === 'spoiler' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground font-body">Does it contain spoilers?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={!isSpoiler ? 'default' : 'outline'} onClick={() => setSpoilerAndContinue(false)} className="h-9 text-sm">No</Button>
                  <Button type="button" variant={isSpoiler ? 'default' : 'outline'} onClick={() => setSpoilerAndContinue(true)} className="h-9 text-sm gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Yes
                  </Button>
                </div>
              </div>
            )}

            {step === 'page' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground font-body">
                  Page number {pageRequired ? <span className="text-primary">required</span> : <span className="text-muted-foreground">optional</span>}
                </label>
                <Input
                  type="number"
                  value={page}
                  onChange={e => setPage(e.target.value)}
                  placeholder="Page #"
                  min={1}
                  max={currentBook.total_pages || undefined}
                  autoFocus
                />
              </div>
            )}

            {step === 'character' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground font-body">
                  Character <span className="text-muted-foreground">optional</span>
                </label>
                <Input
                  value={character}
                  onChange={e => setCharacter(e.target.value)}
                  placeholder="Character name"
                  maxLength={80}
                  autoFocus
                />
              </div>
            )}

            {step !== 'spoiler' && (
              <div className="flex items-center gap-2 pt-1">
                {step !== 'quote' && (
                  <p className="min-w-0 flex-1 truncate text-xs italic text-muted-foreground font-body">“{text}”</p>
                )}
                <Button type="submit" size="sm" disabled={!canContinue || submitting} className="ml-auto h-8 px-3 text-xs gap-1.5">
                  {step === 'character' ? <Send className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                  {step === 'character' ? (submitting ? 'Posting…' : 'Post') : 'Next'}
                </Button>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuoteComposerDialog;
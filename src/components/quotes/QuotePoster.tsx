import { useEffect, useMemo, useState } from 'react';
import { EyeOff, MoreHorizontal, Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dominantColor } from '@/lib/dominantColor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { WallQuote } from '@/hooks/useAllQuotes';

const FALLBACK_PALETTES = [
  '32 55% 72%',
  '18 45% 65%',
  '90 30% 70%',
  '260 35% 75%',
  '42 60% 75%',
];

function hashPick(id: string, n: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
}

function makeRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseHsl(hsl: string): [number, number, number] {
  const m = hsl.trim().split(/\s+/);
  return [
    parseFloat(m[0] ?? '0'),
    parseFloat((m[1] ?? '50%').replace('%', '')),
    parseFloat((m[2] ?? '60%').replace('%', '')),
  ];
}

const initials = (name?: string | null) =>
  (name ?? '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const AbstractArt = ({ seed, hsl }: { seed: string; hsl: string }) => {
  const [h, s, l] = parseHsl(hsl);
  const rng = useMemo(() => makeRng(seed), [seed]);
  const art = useMemo(() => {
    const r = rng;
    const hueA = (h + (r() * 40 - 20) + 360) % 360;
    const hueB = (h + (r() * 80 - 40) + 360) % 360;
    const hueC = (h + 180 + (r() * 30 - 15) + 360) % 360;
    const blobs = Array.from({ length: 3 }).map(() => ({
      cx: 10 + r() * 80,
      cy: 10 + r() * 80,
      rad: 28 + r() * 36,
      hue: r() < 0.5 ? hueA : hueB,
      sat: Math.max(25, s + r() * 20 - 10),
      lit: Math.max(35, Math.min(80, l + r() * 30 - 15)),
      alpha: 0.45 + r() * 0.35,
    }));
    const accentVariant = Math.floor(r() * 3);
    const accentRot = r() * 360;
    const accentX = 20 + r() * 60;
    const accentY = 20 + r() * 60;
    const accentSize = 22 + r() * 28;
    const grainSeed = Math.floor(r() * 100);
    return { hueA, hueB, hueC, blobs, accentVariant, accentRot, accentX, accentY, accentSize, grainSeed };
  }, [rng, h, s, l]);

  const baseLit = Math.max(28, Math.min(60, l - 8));

  return (
    <svg
      viewBox="0 0 100 150"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={`wash-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${art.hueA} ${s}% ${baseLit + 12}%)`} />
          <stop offset="100%" stopColor={`hsl(${art.hueB} ${Math.max(20, s - 10)}% ${baseLit - 8}%)`} />
        </linearGradient>
        <filter id={`blur-${seed}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={art.grainSeed} />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
        </filter>
        <linearGradient id={`scrim-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(0 0% 0% / 0)" />
          <stop offset="55%" stopColor="hsl(0 0% 0% / 0)" />
          <stop offset="100%" stopColor="hsl(0 0% 0% / 0.55)" />
        </linearGradient>
      </defs>
      <rect width="100" height="150" fill={`url(#wash-${seed})`} />
      <g filter={`url(#blur-${seed})`}>
        {art.blobs.map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy * 1.5} r={b.rad} fill={`hsl(${b.hue} ${b.sat}% ${b.lit}%)`} opacity={b.alpha} />
        ))}
      </g>
      <g
        transform={`rotate(${art.accentRot} ${art.accentX} ${art.accentY * 1.5})`}
        stroke={`hsl(${art.hueC} 60% 88%)`}
        fill="none"
        opacity="0.55"
      >
        {art.accentVariant === 0 && (
          <path
            d={`M ${art.accentX - art.accentSize} ${art.accentY * 1.5} A ${art.accentSize} ${art.accentSize} 0 0 1 ${art.accentX + art.accentSize} ${art.accentY * 1.5}`}
            strokeWidth="0.6"
          />
        )}
        {art.accentVariant === 1 && (
          <circle cx={art.accentX} cy={art.accentY * 1.5} r={art.accentSize * 0.7} strokeWidth="0.5" />
        )}
        {art.accentVariant === 2 && (
          <line x1={art.accentX - art.accentSize} y1={art.accentY * 1.5} x2={art.accentX + art.accentSize} y2={art.accentY * 1.5} strokeWidth="0.7" />
        )}
      </g>
      <rect width="100" height="150" filter={`url(#grain-${seed})`} opacity="0.22" style={{ mixBlendMode: 'multiply' }} />
      <rect width="100" height="150" fill={`url(#scrim-${seed})`} />
    </svg>
  );
};

function quoteSizeClass(len: number) {
  if (len > 280) return 'text-sm leading-snug';
  if (len > 160) return 'text-base leading-snug';
  if (len > 80) return 'text-lg leading-snug';
  return 'text-xl leading-snug';
}

interface Props {
  quote: WallQuote;
}

const QuotePoster = ({ quote }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fallback = FALLBACK_PALETTES[hashPick(quote.id, FALLBACK_PALETTES.length)];
  const [hsl, setHsl] = useState<string>(fallback);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(quote.quote_text);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (quote.bookCover) {
      dominantColor(quote.bookCover).then((c) => {
        if (!cancelled && c) setHsl(c);
      });
    }
    return () => { cancelled = true; };
  }, [quote.bookCover]);

  const isAuthor = !!user && user.id === quote.user_id;
  const isSpoilerHidden = quote.is_spoiler && !revealed;
  const sizeClass = quoteSizeClass(quote.quote_text.length);

  const save = async () => {
    const next = draft.trim();
    if (!next || next === quote.quote_text) {
      setEditing(false);
      setDraft(quote.quote_text);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('book_quotes')
      .update({ quote_text: next })
      .eq('id', quote.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: 'destructive' });
      return;
    }
    setEditing(false);
    qc.invalidateQueries({ queryKey: ['quote-wall'] });
  };

  return (
    <article className="relative h-full w-full overflow-hidden rounded-xl border border-border/50 shadow-sm">
        <AbstractArt seed={quote.id} hsl={hsl} />

        {/* Page badge */}
        {quote.page_number != null && !isSpoilerHidden && !editing && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-background/40 px-2 py-0.5 font-body text-[10px] text-foreground/80 backdrop-blur-sm">
            p. {quote.page_number}
          </span>
        )}

        {/* Author menu */}
        {isAuthor && !editing && (
          <div className="absolute left-3 top-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full bg-background/40 text-foreground/80 backdrop-blur-sm hover:bg-background/60"
                  aria-label="Quote options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuItem
                  onClick={() => {
                    setDraft(quote.quote_text);
                    setEditing(true);
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit quote
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Content */}
        <div className="relative flex h-full w-full flex-col justify-between p-5">
          <div className="flex flex-1 items-center justify-center">
            {editing ? (
              <div className="w-full space-y-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[120px] resize-none border-foreground/30 bg-background/70 text-sm italic leading-relaxed backdrop-blur-sm"
                  maxLength={500}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setEditing(false); setDraft(quote.quote_text); }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={save} disabled={saving || !draft.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : isSpoilerHidden ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-foreground/30 bg-background/50 px-4 py-3 backdrop-blur-md"
              >
                <EyeOff className="h-4 w-4 text-foreground/70" />
                <span className="font-body text-xs font-semibold text-foreground/80">Tap to reveal</span>
                {quote.page_number ? (
                  <span className="font-body text-[10px] text-foreground/50">p. {quote.page_number}</span>
                ) : null}
              </button>
            ) : (
              <blockquote className={`text-center font-serif italic text-foreground/95 ${sizeClass}`}>
                &ldquo;{quote.quote_text}&rdquo;
              </blockquote>
            )}
          </div>

          {quote.character_name && !isSpoilerHidden && !editing && (
            <p className="text-center font-body text-[10px] uppercase tracking-[0.16em] text-foreground/60">
              — {quote.character_name}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs">
            <Avatar className="h-5 w-5">
              <AvatarImage src={quote.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-[9px]">{initials(quote.displayName)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate font-body text-foreground/85">
              <span className="font-semibold">{quote.displayName ?? 'Someone'}</span>
              {quote.bookTitle ? (
                <>
                  <span className="mx-1 text-foreground/40">·</span>
                  <span className="italic text-foreground/70">{quote.bookTitle}</span>
                </>
              ) : null}
            </span>
          </div>
        </div>
      </article>
  );
};

export default QuotePoster;
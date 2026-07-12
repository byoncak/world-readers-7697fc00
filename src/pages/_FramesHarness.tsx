/**
 * Frames comparison harness — DEV-only, mounted at /__frames.
 * NOT included in production bundles (route wired conditionally on import.meta.env.DEV).
 */
import { useState } from 'react';
import StarryNightBorder from '@/components/StarryNightBorder';
import ElectricBorder from '@/components/ElectricBorder';
import ChromeBorder from '@/components/ChromeBorder';
import HolographicBorder from '@/components/HolographicBorder';

const Avatar = ({ initials = 'A' }: { initials?: string }) => (
  <div className="h-full w-full rounded-full bg-muted overflow-hidden flex items-center justify-center">
    <span className="font-semibold text-muted-foreground font-display">{initials}</span>
  </div>
);

const SIZES: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

const Row = ({ label, render }: { label: string; render: (size: 'sm' | 'md' | 'lg', preview: boolean) => React.ReactNode }) => (
  <div className="flex items-center gap-6 py-3 border-b border-border">
    <div className="w-40 text-sm font-mono">{label}</div>
    {SIZES.map((sz) => (
      <div key={sz + 'full'} className="flex flex-col items-center gap-1">
        <div>{render(sz, false)}</div>
        <span className="text-[10px] text-muted-foreground">{sz} full</span>
      </div>
    ))}
    {SIZES.map((sz) => (
      <div key={sz + 'prev'} className="flex flex-col items-center gap-1">
        <div>{render(sz, true)}</div>
        <span className="text-[10px] text-muted-foreground">{sz} preview</span>
      </div>
    ))}
  </div>
);

export default function FramesHarness() {
  const [dark, setDark] = useState(false);
  const [rm, setRm] = useState(false);
  return (
    <div className={dark ? 'dark' : ''} data-reduced-motion={rm ? 'reduce' : 'no-preference'}>
      <style>{rm ? `* { animation: none !important; transition: none !important; }` : ''}</style>
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-display">Frames harness</h1>
          <button onClick={() => setDark((d) => !d)} className="px-3 py-1 rounded border border-border text-sm">
            {dark ? 'Light' : 'Dark'}
          </button>
          <button onClick={() => setRm((r) => !r)} className="px-3 py-1 rounded border border-border text-sm">
            reduced-motion: {rm ? 'on' : 'off'}
          </button>
        </div>

        <section id="starry">
          <h2 className="font-display text-lg mt-4 mb-2">Starry Night (variants)</h2>
          {(['indigo', 'rose', 'emerald', 'gold'] as const).map((v) => (
            <Row
              key={v}
              label={`starry / ${v}`}
              render={(size, preview) => (
                <StarryNightBorder size={size} variantKey={v} preview={preview}>
                  <Avatar />
                </StarryNightBorder>
              )}
            />
          ))}
        </section>

        <section id="electric">
          <h2 className="font-display text-lg mt-6 mb-2">Electric (variants)</h2>
          {(['ember', 'voltage', 'toxic', 'shockwave', 'arcane'] as const).map((v) => (
            <Row
              key={v}
              label={`electric / ${v}`}
              render={(size, preview) => (
                <ElectricBorder size={size} variantKey={v} preview={preview}>
                  <Avatar />
                </ElectricBorder>
              )}
            />
          ))}
        </section>

        <section id="chrome">
          <h2 className="font-display text-lg mt-6 mb-2">Chrome</h2>
          <Row
            label="chrome"
            render={(size, preview) => (
              <ChromeBorder size={size} preview={preview}>
                <Avatar />
              </ChromeBorder>
            )}
          />
        </section>

        <section id="holo">
          <h2 className="font-display text-lg mt-6 mb-2">Holographic (reference)</h2>
          <Row
            label="holographic"
            render={(size) => (
              <HolographicBorder size={size}>
                <Avatar />
              </HolographicBorder>
            )}
          />
        </section>
      </div>
    </div>
  );
}

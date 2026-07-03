import { useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QuoteWall from '@/components/journal/QuoteWall';
import RatingsReviews from '@/components/journal/RatingsReviews';
import PersonalNotes from '@/components/journal/PersonalNotes';

type Tab = 'quotes' | 'ratings' | 'notes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'quotes', label: 'Quotes' },
  { key: 'ratings', label: 'Ratings' },
  { key: 'notes', label: 'Notes' },
];

const Journal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.some(t => t.key === tabParam) ? tabParam : 'quotes';
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'quotes') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params);
  };
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = TABS.findIndex(t => t.key === tab);
    const el = tabsRef.current[idx];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [tab]);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-1 pb-6 sm:py-6 animate-page-in">
      <div className="relative mb-2 flex shrink-0 border-b border-border/50">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            ref={el => { tabsRef.current[i] = el; }}
            onClick={() => setTab(t.key)}
            className={`relative flex-1 py-2.5 text-sm font-body tracking-wide transition-colors duration-200 ${
              tab === t.key
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div
          className="absolute -bottom-px h-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
      </div>

      <div className="animate-fade-in pb-2" key={tab}>
        {tab === 'quotes' && <QuoteWall />}
        {tab === 'ratings' && <RatingsReviews />}
        {tab === 'notes' && <PersonalNotes />}
      </div>
    </main>
  );
};

export default Journal;

import { useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DiscussionWidget from '@/components/DiscussionWidget';
import InboxView from '@/components/inbox/InboxView';
import { markLoungeTabSeen } from '@/hooks/useLoungeUnread';


type Tab = 'discuss' | 'messages';

const TABS: { key: Tab; label: string }[] = [
  { key: 'discuss', label: 'Discuss' },
  { key: 'messages', label: 'Messages' },
];

const Community = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.some(t => t.key === tabParam) ? tabParam : 'discuss';
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'discuss') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params);
  };
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Mark a tab as seen whenever it's active.
  useEffect(() => {
    if (tab === 'discuss') markLoungeTabSeen('discuss');
  }, [tab]);

  useEffect(() => {
    const idx = TABS.findIndex(t => t.key === tab);
    const el = tabsRef.current[idx];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [tab]);

  return (
    <main className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden pt-1 sm:py-6">
      <div className="relative mb-2 flex shrink-0 border-b border-border/50 mx-4">
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
            <span className="relative inline-flex items-center">{t.label}</span>
          </button>
        ))}
        <div
          className="absolute -bottom-px h-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden animate-fade-in pb-2 px-4" key={tab}>
        {tab === 'discuss' && <DiscussionWidget />}
        {tab === 'messages' && <InboxView embedded />}
      </div>
    </main>
  );
};

export default Community;

import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Sparkles, Feather, MessageCircleMore } from 'lucide-react';
import { useLoungeUnread } from '@/hooks/useLoungeUnread';
import { useClub } from '@/contexts/ClubContext';

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const { hasAny: loungeHasUnread } = useLoungeUnread();
  const { clubId, clubPath } = useClub();

  if (!clubId) return null;

  const navItems = [
    { to: clubPath(''), key: 'home', icon: BookOpen, label: 'Home' },
    { to: clubPath('/activity'), key: 'activity', icon: Sparkles, label: 'Activity' },
    { to: clubPath('/journal'), key: 'journal', icon: Feather, label: 'Journal' },
    { to: clubPath('/lounge'), key: 'lounge', icon: MessageCircleMore, label: 'Lounge' },
  ];

  const scrollHomeToTop = (key: string) => {
    if (key !== 'home') return;
    window.scrollTo({ top: 0, left: 0 });
    document.getElementById('app-scroll-container')?.scrollTo({ top: 0, left: 0 });
  };

  const isActive = (item: { to: string; key: string }) => {
    if (item.key === 'home') return pathname === item.to;
    return pathname.startsWith(item.to);
  };

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 min-h-[var(--mobile-nav-height)] border-t border-border bg-card/95 backdrop-blur-md sm:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const { to, key, icon: Icon, label } = item;
          const active = isActive(item);
          const home = key === 'home';
          return (
            <Link
              key={key}
              to={to}
              onClick={() => scrollHomeToTop(key)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] py-1.5 text-[10px] font-medium transition-colors active:scale-[0.96] ${
                active ? 'text-primary' : home ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {home ? (
                <span className={`flex h-10 w-14 items-center justify-center rounded-[6px] border bg-card shadow-[0_4px_20px_-4px_hsl(var(--warm-brown)/0.1)] ${active ? 'border-primary/60' : 'border-muted-foreground/25'}`}>
                  <Icon className="h-7 w-7" />
                </span>
              ) : (
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {key === 'lounge' && loungeHasUnread && !active && (
                    <span aria-label="New activity in Lounge" className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
                  )}
                </span>
              )}
              <span className={home && !active ? 'font-semibold' : ''}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;

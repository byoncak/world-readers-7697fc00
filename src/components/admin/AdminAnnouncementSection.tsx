import { useState } from 'react';
import { Megaphone, ChevronDown, ChevronUp } from 'lucide-react';
import AnnouncementWidget from '@/components/AnnouncementWidget';

const AdminAnnouncementSection = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="cozy-card p-0">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-body font-semibold transition-all duration-200 cursor-pointer select-none ${
          open ? 'bg-peach/10 text-foreground' : 'bg-card text-muted-foreground hover:bg-muted/50'
        }`}
      >
        <Megaphone className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left font-display text-base font-bold">Make Announcement</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2">
          <AnnouncementWidget />
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncementSection;

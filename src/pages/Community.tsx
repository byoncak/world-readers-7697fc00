import { useEffect } from 'react';
import DiscussionWidget from '@/components/DiscussionWidget';
import { markLoungeTabSeen } from '@/hooks/useLoungeUnread';

// Direct messages have their own canonical route at /c/:id/inbox.
// The Lounge is discussion-only to avoid three entry points to DMs.
const Community = () => {
  useEffect(() => {
    markLoungeTabSeen('discuss');
  }, []);

  return (
    <main className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden pt-1 sm:py-6">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden animate-fade-in pb-2 px-4">
        <DiscussionWidget />
      </div>
    </main>
  );
};

export default Community;

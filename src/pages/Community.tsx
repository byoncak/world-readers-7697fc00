import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DiscussionWidget from '@/components/DiscussionWidget';
import { markLoungeTabSeen } from '@/hooks/useLoungeUnread';
import { useClub } from '@/contexts/ClubContext';

// Direct messages have their own canonical route at /c/:id/inbox.
// The Lounge is discussion-only to avoid three entry points to DMs.
const Community = () => {
  const { clubId, clubPath } = useClub();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Preserve old links after the Messages-tab consolidation:
  // /c/:id/lounge?tab=messages -> canonical /c/:id/inbox.
  useEffect(() => {
    if (searchParams.get('tab') === 'messages') {
      navigate(clubPath('/inbox'), { replace: true });
    }
  }, [searchParams, clubPath, navigate]);

  useEffect(() => {
    if (clubId) markLoungeTabSeen('discuss', clubId);
  }, [clubId]);

  return (
    <main className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden pt-1 sm:py-6">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden animate-fade-in pb-2 px-4">
        <DiscussionWidget />
      </div>
    </main>
  );
};

export default Community;

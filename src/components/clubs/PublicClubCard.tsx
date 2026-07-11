import { Link } from 'react-router-dom';
import { Users, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  club: any;
  memberCount: number;
  joined: boolean;
  onJoin: () => void;
}

const PublicClubCard = ({ club: c, memberCount, joined, onJoin }: Props) => {
  const full = !!(c.member_cap && memberCount >= c.member_cap);
  const cta = joined ? 'Open' : full ? 'Full' : c.join_policy === 'instant' ? 'Join' : 'Request';

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 transition-colors hover:bg-card">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {c.visibility === 'private' ? (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <Globe className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <h4 className="truncate font-display text-base font-semibold">{c.name}</h4>
        </div>
        {c.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
        )}
        <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden /> {memberCount}
            {c.member_cap ? ` / ${c.member_cap}` : ''}
          </span>
          <span aria-hidden>•</span>
          <span>{c.join_policy === 'instant' ? 'instant join' : 'approval'}</span>
        </p>
      </div>
      {joined ? (
        <Button asChild variant="secondary" size="sm" className="min-h-[36px]">
          <Link to={`/c/${c.id}`} aria-label={`Open ${c.name}`}>
            {cta}
          </Link>
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={full}
          onClick={onJoin}
          className="min-h-[36px]"
          aria-label={`${cta} ${c.name}`}
        >
          {cta}
        </Button>
      )}
    </div>
  );
};

export default PublicClubCard;

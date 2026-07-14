import { Link } from 'react-router-dom';
import { Users, Lock, Globe, Crown, Shield, ChevronRight } from 'lucide-react';
import type { ClubMembership } from '@/contexts/ClubContext';

interface Props {
  membership: ClubMembership;
  memberCount: number | undefined;
  lastVisited?: boolean;
}

const RoleBadge = ({ role }: { role: ClubMembership['role'] }) => {
  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--terracotta))]">
        <Crown className="h-3 w-3" aria-hidden /> Owner
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--warm-brown))]">
        <Shield className="h-3 w-3" aria-hidden /> Admin
      </span>
    );
  }
  return null;
};

const YourClubCard = ({ membership: m, memberCount, lastVisited }: Props) => {
  const c = m.club;
  const memberLabel =
    memberCount != null ? `, ${memberCount} member${memberCount === 1 ? '' : 's'}` : '';
  const label = `Open ${c.name}, ${m.role}${memberLabel}`;

  return (
    <Link
      to={`/c/${c.id}`}
      aria-label={label}
      className={`group relative flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3 transition-colors hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        lastVisited
          ? 'border-l-2 border-l-[hsl(var(--soft-gold))] border-y-border/60 border-r-border/60'
          : 'border-border/60'
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate font-display text-base font-semibold leading-tight text-foreground">
            {c.name}
          </h3>
          {c.visibility === 'private' ? (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Private club" />
          ) : (
            <Globe className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Public club" />
          )}
        </div>
        {c.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground sm:line-clamp-2">
            {c.description}
          </p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden />
            {memberCount ?? '—'}
          </span>
          <span aria-hidden className="text-muted-foreground/50">·</span>
          <span className="capitalize">{c.visibility}</span>
          {(m.role === 'owner' || m.role === 'admin') && (
            <>
              <span aria-hidden className="text-muted-foreground/50">·</span>
              <RoleBadge role={m.role} />
            </>
          )}
          {lastVisited && (
            <>
              <span aria-hidden className="text-muted-foreground/50">·</span>
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--warm-brown))]">
                Last visited
              </span>
            </>
          )}
        </div>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
};

export default YourClubCard;

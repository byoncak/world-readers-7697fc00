import { Link } from 'react-router-dom';
import { Users, Lock, Globe, Crown, Shield, ChevronRight } from 'lucide-react';
import type { ClubMembership } from '@/contexts/ClubContext';

interface Props {
  membership: ClubMembership;
  memberCount: number | undefined;
  lastVisited?: boolean;
}

const RoleChip = ({ role }: { role: ClubMembership['role'] }) => {
  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--terracotta)/0.15)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--terracotta))]">
        <Crown className="h-3 w-3" /> Owner
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--soft-gold)/0.25)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--warm-brown))]">
        <Shield className="h-3 w-3" /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[hsl(var(--sage)/0.35)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(145_30%_25%)]">
      Member
    </span>
  );
};

const YourClubCard = ({ membership: m, memberCount, lastVisited }: Props) => {
  const c = m.club;
  const label = `Open ${c.name}, ${m.role}${
    memberCount != null ? `, ${memberCount} member${memberCount === 1 ? '' : 's'}` : ''
  }`;

  const coverStyle = c.cover_image_url
    ? { backgroundImage: `url(${c.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {
        background: `linear-gradient(135deg, ${
          c.accent_color ?? 'hsl(var(--peach))'
        }, hsl(var(--cream)))`,
      };

  return (
    <Link
      to={`/c/${c.id}`}
      aria-label={label}
      className="group relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_2px_10px_-6px_hsl(var(--warm-brown)/0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_hsl(var(--warm-brown)/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative h-24 w-full" style={coverStyle}>
        <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-transparent" />
        <div className="absolute right-2 top-2 rounded-full bg-card/85 p-1 backdrop-blur-sm">
          {c.visibility === 'private' ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Private club" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-label="Public club" />
          )}
        </div>
        {lastVisited && (
          <span className="absolute left-2 top-2 rounded-full bg-card/85 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
            Last visited
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight text-foreground line-clamp-2">
            {c.name}
          </h3>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
        {c.description && (
          <p className="font-serif text-xs italic text-muted-foreground line-clamp-2">
            {c.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {memberCount ?? '—'}
          </span>
          <RoleChip role={m.role} />
        </div>
      </div>
    </Link>
  );
};

export default YourClubCard;

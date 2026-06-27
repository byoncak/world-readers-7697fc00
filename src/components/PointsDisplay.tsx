import { Link } from 'react-router-dom';
import { usePoints } from '@/hooks/usePoints';
import { usePendingSpend } from '@/contexts/PendingSpendContext';
import { useClub } from '@/contexts/ClubContext';

const PointsDisplay = () => {
  const { points, loading } = usePoints();
  const { pendingSpend } = usePendingSpend();
  const { clubPath, clubId } = useClub();

  if (loading || !clubId) return null;

  const displayed = Math.max(0, points - pendingSpend);

  return (
    <Link
      to={clubPath('/shop')}
      className="ml-auto hover:scale-105 transition-transform"
      title="Go to shop"
    >
      <div className="flex items-center gap-1">
        <span className="text-sm leading-none" data-points-source="true">🍎</span>
        <span className="font-display font-bold text-sm tabular-nums text-foreground tracking-tight">{displayed}</span>
      </div>
    </Link>
  );
};

export default PointsDisplay;

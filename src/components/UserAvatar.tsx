import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useEquippedFrame, parseInlineStyle } from '@/hooks/useEquippedFrame';
import { cn } from '@/lib/utils';
import ElectricBorder from '@/components/ElectricBorder';
import ChromeBorder from '@/components/ChromeBorder';
import DarkMagicBorder from '@/components/DarkMagicBorder';
import HolographicBorder from '@/components/HolographicBorder';
import StarryNightBorder from '@/components/StarryNightBorder';

interface UserAvatarProps {
  userId: string;
  avatarUrl: string | null;
  displayName: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  linkToProfile?: boolean;
}

const sizeClasses = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-sm',
  lg: 'h-20 w-20 text-3xl',
};

const UserAvatarInner = memo(({ userId, avatarUrl, displayName, size = 'sm', className }: Omit<UserAvatarProps, 'linkToProfile'>) => {
  const frame = useEquippedFrame(userId);
  const initials = (displayName || '?')[0].toUpperCase();

  const hasGradientFrame = frame?.gradient;
  const frameStyle = frame ? parseInlineStyle(frame.border_style) : undefined;
  const isStarry = frame?.animation_class === 'animate-starry-twinkle';
  const isElectric = frame?.animation_class === 'animate-electric-border';
  const isChrome = frame?.animation_class === 'animate-chrome-ring';
  const isDarkMagic = frame?.animation_class === 'animate-dark-magic';
  const isHolographic = frame?.animation_class === 'animate-holographic-ring';

  const avatarContent = (
    <div className={cn('h-full w-full rounded-full bg-muted overflow-hidden', !hasGradientFrame && !isElectric && !frame && 'border-2 border-border')}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName || 'User'} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-muted-foreground font-display">
          {initials}
        </span>
      )}
    </div>
  );

  if (isElectric) {
    return (
      <ElectricBorder size={size} className={className} variantKey={frame?.variant_key}>
        {avatarContent}
      </ElectricBorder>
    );
  }

  if (isChrome) {
    return (
      <ChromeBorder size={size} className={className}>
        {avatarContent}
      </ChromeBorder>
    );
  }

  if (isDarkMagic) {
    return (
      <DarkMagicBorder size={size} className={className}>
        {avatarContent}
      </DarkMagicBorder>
    );
  }

  if (isHolographic) {
    return (
      <HolographicBorder size={size} className={className}>
        {avatarContent}
      </HolographicBorder>
    );
  }

  if (isStarry) {
    return (
      <StarryNightBorder size={size} className={className} variantKey={frame?.variant_key}>
        {avatarContent}
      </StarryNightBorder>
    );
  }

  const renderAvatar = () => {
    if (hasGradientFrame) {
      const padSize = size === 'lg' ? '3px' : size === 'md' ? '3px' : '2px';

      return (
        <div
          className={cn('shrink-0 rounded-full', frame.animation_class || 'animate-chrome-shimmer', sizeClasses[size], className)}
          style={{
            background: frame.gradient,
            padding: padSize,
            boxShadow: frame.box_shadow || undefined,
          }}
        >
          <div className="h-full w-full rounded-full bg-muted overflow-hidden relative z-[2]">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName || 'User'} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-semibold text-muted-foreground font-display">
                {initials}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'shrink-0 rounded-full bg-muted overflow-hidden',
          !frame && 'border-2 border-border',
          sizeClasses[size],
          className
        )}
        style={frameStyle}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName || 'User'} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-semibold text-muted-foreground font-display">
            {initials}
          </span>
        )}
      </div>
    );
  };

  if (useSparkles) {
    return (
      <Sparkles color="#c7d2fe">
        {renderAvatar()}
      </Sparkles>
    );
  }

  return renderAvatar();
});

UserAvatarInner.displayName = 'UserAvatarInner';

const UserAvatar = ({ linkToProfile = true, ...props }: UserAvatarProps) => {
  const inner = <UserAvatarInner {...props} />;
  if (linkToProfile && props.userId) {
    return (
      <Link
        to={`/member/${props.userId}`}
        onClick={(e) => e.stopPropagation()}
        className="rounded-full inline-block shrink-0"
        aria-label={`View ${props.displayName || 'member'}'s profile`}
      >
        {inner}
      </Link>
    );
  }
  return inner;
};

export default UserAvatar;

import { useEquippedCosmetics } from '@/hooks/useEquippedCosmetics';

interface StyledNameProps {
  userId: string;
  name: string;
  className?: string;
  /** Show badge inline after name */
  showBadge?: boolean;
  /** Show title subtitle below name */
  showTitle?: boolean;
}

const StyledName = ({ userId, name, className = '', showBadge = false, showTitle = false }: StyledNameProps) => {
  const cosmetics = useEquippedCosmetics(userId);

  const hasBadge = showBadge && cosmetics?.badge;
  const hasTitle = showTitle && cosmetics?.title;

  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
        <span
          style={cosmetics?.nameFlairStyle}
          className={cosmetics?.nameFlairClass || ''}
        >
          {name}
        </span>
        {hasBadge && (
          <span
            className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none shrink-0"
            style={cosmetics!.badge!.style}
          >
            {cosmetics!.badge!.emoji && <span>{cosmetics!.badge!.emoji}</span>}
            <span>{cosmetics!.badge!.label}</span>
          </span>
        )}
      </span>
      {hasTitle && (
        <span
          className={`text-[10px] leading-tight ${cosmetics?.titleColor ? '' : 'text-muted-foreground'}`}
          style={cosmetics?.titleColor ? { color: cosmetics.titleColor } : undefined}
        >
          {'~ '}
          {cosmetics!.title!.split(/([\p{Emoji_Presentation}\p{Extended_Pictographic}])/gu).map((part, i) =>
            /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(part)
              ? <span key={i} className="not-italic">{part}</span>
              : <span key={i} className="italic">{part}</span>
          )}
          {' ~'}
        </span>
      )}
    </span>
  );
};

export default StyledName;

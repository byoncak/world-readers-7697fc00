import { Link } from 'react-router-dom';

// Matches @[Display Name](userId)
const MENTION_REGEX = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/g;

interface MentionTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
}

/** Renders text with @mentions as styled clickable links */
const MentionText = ({ text, className = '', linkClassName }: MentionTextProps) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(MENTION_REGEX.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    // Text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const displayName = match[1];
    const userId = match[2];

    parts.push(
      <Link
        key={`${userId}-${match.index}`}
        to={`/member/${userId}`}
        className={linkClassName ?? 'font-semibold text-primary hover:underline'}
        onClick={(e) => e.stopPropagation()}
      >
        @{displayName}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return <span className={className}>{text}</span>;

  return <span className={className}>{parts}</span>;
};

export default MentionText;

/** Helper to extract user IDs from mention tags in a string */
export const extractMentionedUserIds = (text: string): string[] => {
  const ids: string[] = [];
  const regex = new RegExp(MENTION_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[2]);
  }
  return [...new Set(ids)];
};

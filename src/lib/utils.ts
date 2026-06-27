import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a short acronym for long book titles so tab UI stays compact.
 * Returns the title unchanged if it's under maxLen.
 */
export function shortenTitle(title: string, maxLen = 22): string {
  if (!title) return title;
  if (title.length <= maxLen) return title;
  const stop = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'to', 'for', 'with', 'at', 'by']);
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w, i) => i === 0 || !stop.has(w.toLowerCase()));
  const initials = words.map(w => w[0]?.toUpperCase()).filter(Boolean).slice(0, 4).join('');
  return initials.length >= 2 ? initials : title.slice(0, maxLen - 1) + '…';
}

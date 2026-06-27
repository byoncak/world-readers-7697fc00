import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import UserAvatar from './UserAvatar';

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

const MENTION_REGEX = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/g;

/** Convert raw mention format to clean display text */
const toDisplayText = (raw: string) => raw.replace(new RegExp(MENTION_REGEX.source, 'g'), '@$1');

const MentionInput = ({ value, onChange, onSubmit, placeholder, maxLength, className = '' }: MentionInputProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [displayText, setDisplayText] = useState(() => toDisplayText(value));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mentionsRef = useRef<Map<string, string>>(new Map());

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 120);
    el.style.height = next + 'px';
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
  }, []);

  // Parse existing mentions from initial value
  useEffect(() => {
    const regex = new RegExp(MENTION_REGEX.source, 'g');
    let match;
    while ((match = regex.exec(value)) !== null) {
      mentionsRef.current.set(match[1], match[2]);
    }
  }, []);

  // Sync when value is cleared externally
  useEffect(() => {
    if (value === '') {
      setDisplayText('');
      mentionsRef.current.clear();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [value]);

  useEffect(() => { autoResize(); }, [displayText, autoResize]);

  // Fetch members once
  useEffect(() => {
    supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .order('display_name', { ascending: true })
      .then(({ data }) => {
        if (data) setMembers(data.filter(m => m.user_id !== user?.id));
      });
  }, [user?.id]);

  const reconstructRaw = useCallback((display: string) => {
    let raw = display;
    for (const [name, userId] of mentionsRef.current) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      raw = raw.replace(new RegExp(`@${escaped}(?!\\w)`, 'g'), `@[${name}](${userId})`);
    }
    return raw;
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplay = e.target.value;
    setDisplayText(newDisplay);
    onChange(reconstructRaw(newDisplay));

    const cursorPos = e.target.selectionStart ?? newDisplay.length;
    const textBeforeCursor = newDisplay.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes(' ') && query.length <= 20) {
          setMentionQuery(query.toLowerCase());
          setMentionStart(lastAtIndex);
          setShowDropdown(true);
          setSelectedIndex(0);
          return;
        }
      }
    }

    setShowDropdown(false);
  }, [onChange, reconstructRaw]);

  useEffect(() => {
    if (!showDropdown) return;
    const results = members.filter(m =>
      (m.display_name || '').toLowerCase().includes(mentionQuery)
    ).slice(0, 6);
    setFiltered(results);
    if (results.length === 0) setShowDropdown(false);
  }, [mentionQuery, showDropdown, members]);

  const insertMention = useCallback((member: Member) => {
    const name = member.display_name || 'Reader';
    mentionsRef.current.set(name, member.user_id);

    const displayMention = `@${name} `;
    const before = displayText.slice(0, mentionStart);
    const cursorPos = textareaRef.current?.selectionStart ?? displayText.length;
    const after = displayText.slice(cursorPos);
    const newDisplay = before + displayMention + after;

    setDisplayText(newDisplay);
    onChange(reconstructRaw(newDisplay));
    setShowDropdown(false);

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = (before + displayMention).length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [displayText, mentionStart, onChange, reconstructRaw]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filtered.length === 0) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit?.();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative flex-1 min-w-0">
      <textarea
        ref={textareaRef}
        value={displayText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={1}
        className={className ? `w-full resize-none overflow-hidden ${className}` : 'w-full resize-none overflow-hidden'}
        style={{ minHeight: '36px', maxHeight: '120px' }}
      />

      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-popover shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {filtered.map((m, i) => (
            <button
              key={m.user_id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-body transition-colors ${
                i === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
              }`}
            >
              <UserAvatar
                userId={m.user_id}
                avatarUrl={m.avatar_url}
                displayName={m.display_name}
                size="sm"
                linkToProfile={false}
              />
              <span className="truncate font-medium">{m.display_name || 'Reader'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;

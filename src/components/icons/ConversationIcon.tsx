import { forwardRef, type SVGProps } from 'react';

const ConversationIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ strokeWidth = 1.8, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth as number}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Back bubble */}
      <path d="M14 4.5h4a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-.5l-1.7 2.2a.4.4 0 0 1-.7-.25V14.5h-1.1" />
      {/* Front bubble (offset, overlapping) */}
      <path d="M9.5 9h-3A2.5 2.5 0 0 0 4 11.5v4A2.5 2.5 0 0 0 6.5 18h.7v2.1a.4.4 0 0 0 .7.27L10 18h3.5a2.5 2.5 0 0 0 2.5-2.5v-4A2.5 2.5 0 0 0 13.5 9h-4" />
    </svg>
  ),
);
ConversationIcon.displayName = 'ConversationIcon';

export default ConversationIcon;
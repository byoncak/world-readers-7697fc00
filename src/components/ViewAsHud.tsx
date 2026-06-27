import { Eye, X } from 'lucide-react';
import { useRole, AppRole } from '@/hooks/useRole';
import { useRoleOverride } from '@/hooks/useRoleOverride';

const roles: { value: AppRole | null; label: string }[] = [
  { value: null, label: 'Your Role' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'member', label: 'Member' },
];

const ViewAsHud = () => {
  const { isAdmin: isActualAdmin } = useRole(true);
  const { overrideRole, setOverrideRole, hudVisible } = useRoleOverride();

  if (!isActualAdmin || !hudVisible) return null;

  return (
    <div className="sticky top-[57px] z-10 border-b border-dashed border-primary/30 bg-primary/5 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-1.5 overflow-x-auto no-scrollbar sm:overflow-x-visible">
        <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold text-primary font-display shrink-0">View as:</span>
        <div className="flex items-center gap-1 shrink-0">
          {roles.map((r) => (
            <button
              key={r.label}
              onClick={() => setOverrideRole(r.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-body font-semibold transition-all ${
                overrideRole === r.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {overrideRole && (
          <button
            onClick={() => setOverrideRole(null)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            title="Reset to your role"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ViewAsHud;

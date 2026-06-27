import { Crown, Star, User } from 'lucide-react';

const RolePermissionsCard = () => (
  <div className="cozy-card mt-5">
    <h3 className="cozy-title text-lg mb-3">Role Permissions</h3>
    <div className="space-y-2 text-sm font-body">
      <div className="flex items-start gap-2">
        <Crown className="h-4 w-4 mt-0.5 text-terracotta flex-shrink-0" />
        <p><strong className="font-serif">Admin</strong> — Manage roles, add/edit books, set meetup dates, moderate discussions</p>
      </div>
      <div className="flex items-start gap-2">
        <Star className="h-4 w-4 mt-0.5 text-accent-foreground flex-shrink-0" />
        <p><strong className="font-serif">Moderator</strong> — Add/edit books, set meetup dates, moderate discussions</p>
      </div>
      <div className="flex items-start gap-2">
        <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <p><strong className="font-serif">Member</strong> — Suggest books, vote, join discussions, update reading progress</p>
      </div>
    </div>
  </div>
);

export default RolePermissionsCard;

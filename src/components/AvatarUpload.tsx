import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';

const AvatarUpload = () => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    };
    fetchProfile();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting param
      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(url);
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  const initials = user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <button
      onClick={() => fileInputRef.current?.click()}
      className="relative h-9 w-9 shrink-0 rounded-full border-2 border-border bg-muted overflow-hidden transition-all hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Change profile picture"
      aria-label="Change profile picture"
      disabled={uploading}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Profile"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground font-display">
          {initials}
        </span>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors hover:bg-foreground/20">
        <Camera className="h-3.5 w-3.5 text-background opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </button>
  );
};

export default AvatarUpload;

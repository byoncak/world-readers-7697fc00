import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import { BookOpen, Coffee } from 'lucide-react';
import worldReadersLogo from '@/assets/world-readers-logo.png.asset.json';

const CurvedLogo = () => (
  <div className="relative mb-6 mt-2 flex h-40 w-64 items-center justify-center">
    <svg
      className="absolute inset-0 h-full w-full drop-shadow-md text-foreground"
      viewBox="0 0 240 150"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <path
          id="worldReadersArc"
          d="M 20,120 A 100,100 0 0,1 220,120"
          fill="transparent"
        />
      </defs>
      <text
        fill="currentColor"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        <textPath
          href="#worldReadersArc"
          startOffset="50%"
          textAnchor="middle"
        >
          World Readers
        </textPath>
      </text>
    </svg>

    <div className="absolute bottom-0 flex flex-col items-center">
      <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-card bg-card shadow-xl">
        <img
          src={worldReadersLogo.url}
          alt="World Readers"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  </div>
);

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern">
        <div className="loader"></div>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  // Generate a deterministic email from the name
  const nameToEmail = (n: string) =>
    `${n.trim().toLowerCase().replace(/\s+/g, '.')}@bookclub.local`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const email = nameToEmail(name);

    if (isForgot) {
      try {
        const res = await supabase.functions.invoke('request-password-reset', {
          body: { display_name: name.trim() },
        });

        if (res.error) {
          setError('Could not submit request. Try again later.');
        } else if (res.data?.error) {
          setError(res.data.error);
        } else {
          setSuccess('Password reset request sent! An admin will reset your password soon.');
          setName('');
        }
      } catch {
        setError('Could not submit request. Try again later.');
      }
      setSubmitting(false);
      return;
    }

    if (isSignUp) {
      const { error } = await signUp(email, password, name.trim());
      if (error) setError(error.message);
    } else {
      const { error } = await signIn(email, password);
      if (error) setError('Invalid name or password');
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern p-4">
      <div className="cozy-card w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <h1 className="cozy-title text-4xl text-center mb-2">Welcome</h1>
          <CurvedLogo />
          <p className="cozy-subtitle mt-1 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Book Club
            <Coffee className="h-4 w-4" />
          </p>
        </div>


        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground font-body">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="cozy-input w-full"
              placeholder="Your name"
              required
            />
          </div>
          {!isForgot && (
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground font-body">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cozy-input w-full"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-sage/20 p-3 text-sm text-foreground">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="cozy-btn-primary w-full disabled:opacity-50"
          >
            {submitting ? '...' : isForgot ? '🔑 Request Reset' : isSignUp ? '🌿 Join the Club' : '📖 Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center space-y-1">
          {!isForgot && (
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
              className="cozy-btn-ghost text-sm block mx-auto"
            >
              {isSignUp ? 'Already a member? Sign in' : "New here? Create an account"}
            </button>
          )}
          <button
            onClick={() => { setIsForgot(!isForgot); setError(''); setSuccess(''); setIsSignUp(false); }}
            className="cozy-btn-ghost text-sm block mx-auto"
          >
            {isForgot ? '← Back to sign in' : 'Forgot password?'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;

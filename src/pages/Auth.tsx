import { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import worldReadersLogo from '@/assets/world-readers-logo.png.asset.json';

const CurvedLogo = () => (
  <div className="relative mb-4 mt-2 flex h-72 w-80 items-center justify-center">
    <svg
      className="absolute inset-0 h-full w-full drop-shadow-md text-foreground"
      viewBox="0 0 320 230"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id="worldReadersArc" d="M 30,170 A 130,130 0 0,1 290,170" fill="transparent" />
      </defs>
      <text
        fill="currentColor"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '26px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        <textPath href="#worldReadersArc" startOffset="50%" textAnchor="middle">
          World Readers
        </textPath>
      </text>
    </svg>

    <div className="absolute bottom-2 flex flex-col items-center">
      <div className="h-40 w-40 overflow-hidden rounded-full">
        <img src={worldReadersLogo.url} alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  </div>
);

type Mode = 'signin' | 'signup' | 'forgot';

// Friendly copy so raw backend errors never leak into the UI.
const friendlyAuthError = (raw: string | undefined | null, mode: Mode) => {
  const t = (raw || '').toLowerCase();
  if (!t) return 'Something went wrong. Please try again.';
  if (t.includes('invalid') && t.includes('credentials'))
    return 'That name and password combination didn’t match.';
  if (t.includes('already registered') || t.includes('already exists'))
    return 'A member with that name already exists. Try signing in instead.';
  if (t.includes('password')) return 'That password isn’t accepted. Try a stronger one (6+ characters).';
  if (mode === 'signin') return 'That name and password combination didn’t match.';
  return 'Something went wrong. Please try again.';
};

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const nextRaw = searchParams.get('next');
  const nextPath = nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/';

  const heading = useMemo(() => {
    if (mode === 'signup') return { title: 'Create your account', helper: 'Join the club with a name and a password. That’s it.' };
    if (mode === 'forgot') return { title: 'Reset your password', helper: 'Enter your name and an admin will reset your password for you.' };
    return { title: 'Sign in', helper: 'Welcome back — pick up where you left off.' };
  }, [mode]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setSuccess('');
    setConfirmPassword('');
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading"
        className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern"
      >
        <div className="book" aria-hidden="true"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  if (user) return <Navigate to={nextPath} replace />;

  const nameToEmail = (n: string) => `${n.trim().toLowerCase().replace(/\s+/g, '.')}@bookclub.local`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation runs BEFORE any backend call so empty/short
    // password submissions never reach Supabase.
    const validationError = validateAuthForm({
      name,
      password,
      confirmPassword,
      mode,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const trimmedName = name.trim();

    setSubmitting(true);
    const email = nameToEmail(trimmedName);

    if (mode === 'forgot') {
      try {
        const res = await supabase.functions.invoke('request-password-reset', {
          body: { display_name: trimmedName },
        });
        // Never surface raw backend errors — always map to friendly copy.
        if (res.error || res.data?.error) {
          setError('Could not submit request. Please try again later.');
        } else {
          setSuccess('Reset request sent. An admin will get to it soon.');
          setName('');
        }
      } catch {
        setError('Could not submit request. Please try again later.');
      }
      setSubmitting(false);
      return;
    }

    if (mode === 'signup') {
      const { error } = await signUp(email, password, trimmedName);
      if (error) setError(friendlyAuthError(error.message, mode));
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(friendlyAuthError(error.message, mode));
    }
    setSubmitting(false);
  };

  // Locally darkened tokens for auth screen only — keeps the cozy palette but
  // lifts contrast so normal button text and helper copy meet WCAG AA.
  const authPrimary = 'bg-[hsl(15_55%_42%)] hover:bg-[hsl(15_55%_38%)] text-white';
  const authHelper = 'text-[hsl(25_20%_32%)]'; // ~7:1 on the cream card

  return (
    <main
      aria-labelledby="auth-heading"
      className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern p-4"
    >
      <div className="cozy-card w-full max-w-md">
        <div className="mb-4 flex flex-col items-center">
          <CurvedLogo />
          <h1 id="auth-heading" className="cozy-title text-xl text-center mt-2">
            {heading.title}
          </h1>
          <p className={`mt-1 text-center text-sm font-body ${authHelper}`}>{heading.helper}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-name" className={`mb-1 block text-sm font-medium font-body ${authHelper}`}>
              Name
            </label>
            <input
              id="auth-name"
              name="username"
              type="text"
              autoComplete="username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="cozy-input w-full min-h-11"
              placeholder="Your name"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label htmlFor="auth-password" className={`mb-1 block text-sm font-medium font-body ${authHelper}`}>
                Password
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cozy-input flex-1 min-h-11"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-[hsl(25_20%_32%)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-confirm" className={`mb-1 block text-sm font-medium font-body ${authHelper}`}>
                Confirm password
              </label>
              <input
                id="auth-confirm"
                name="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="cozy-input w-full min-h-11"
                placeholder="Repeat your password"
                required
                minLength={6}
              />
            </div>
          )}

          <div role="alert" aria-live="assertive" className="min-h-[0]">
            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive font-body">
                {error}
              </div>
            )}
          </div>

          <div role="status" aria-live="polite" className="min-h-[0]">
            {success && (
              <div className="rounded-xl bg-sage/20 p-3 text-sm text-foreground font-body">
                {success}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-xl px-5 min-h-11 font-semibold font-body transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background active:scale-[0.98] disabled:opacity-60 ${authPrimary}`}
          >
            {submitting
              ? (mode === 'forgot' ? 'Sending…' : mode === 'signup' ? 'Creating account…' : 'Signing in…')
              : mode === 'forgot'
                ? '🔑 Request reset'
                : mode === 'signup'
                  ? '🌿 Create account'
                  : '📖 Sign in'}
          </button>
        </form>

        <div className="mt-4 text-center space-y-1">
          {mode !== 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
              className={`text-sm block mx-auto min-h-11 px-3 rounded-lg font-body hover:bg-muted ${authHelper}`}
            >
              {mode === 'signup' ? 'Already a member? Sign in' : 'New here? Create an account'}
            </button>
          )}
          {mode !== 'signup' && (
            <button
              type="button"
              onClick={() => switchMode(mode === 'forgot' ? 'signin' : 'forgot')}
              className={`text-sm block mx-auto min-h-11 px-3 rounded-lg font-body hover:bg-muted ${authHelper}`}
            >
              {mode === 'forgot' ? '← Back to sign in' : 'Forgot password?'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
};

export default Auth;

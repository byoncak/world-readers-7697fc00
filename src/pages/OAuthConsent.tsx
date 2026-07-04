import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern p-4">
        <div className="cozy-card max-w-md text-center">
          <h1 className="cozy-title text-xl mb-2">Authorization error</h1>
          <p className="font-body text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  const clientName = details.client?.name ?? "an app";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern p-4">
      <div className="cozy-card w-full max-w-md">
        <h1 className="cozy-title text-xl mb-3 text-center">Connect {clientName}</h1>
        <p className="font-body text-sm text-muted-foreground mb-6 text-center">
          {clientName} is asking to access this app as you. Approve to let it read your clubs,
          books, and profile using your account.
        </p>
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="cozy-btn flex-1 disabled:opacity-50"
          >
            Deny
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="cozy-btn-primary flex-1 disabled:opacity-50"
          >
            {busy ? "…" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OAuthConsent;

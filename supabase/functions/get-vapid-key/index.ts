import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate VAPID keys if not stored, or return existing ones
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // For now, return a placeholder. Users need to set VAPID keys as secrets.
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');

  if (!publicKey) {
    return new Response(
      JSON.stringify({ error: 'VAPID keys not configured. Push notifications are not available yet.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ publicKey }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

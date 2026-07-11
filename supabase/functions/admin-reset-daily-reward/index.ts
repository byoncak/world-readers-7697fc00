import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonErr("Missing auth", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userError } = await anon.auth.getUser();
    if (!caller || userError) return jsonErr("Unauthorized", 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isSuper } = await admin.rpc("is_super_user", { _user_id: caller.id });
    if (!isSuper) return jsonErr("Forbidden — super user only", 403);

    const { target_user_id, day_start_iso } = await req.json();
    if (!target_user_id || !day_start_iso) return jsonErr("Missing target_user_id or day_start_iso", 400);

    const { error: delErr, count } = await admin
      .from("point_transactions")
      .delete({ count: "exact" })
      .eq("user_id", target_user_id)
      .eq("action_type", "daily_login")
      .gte("created_at", day_start_iso);
    if (delErr) return jsonErr(delErr.message, 400);

    await admin.from("admin_audit_log").insert({
      actor_id: caller.id,
      action: "reset_daily_reward",
      target_kind: "user",
      target_id: target_user_id,
      metadata: { day_start_iso, deleted: count ?? 0 },
    });

    return new Response(JSON.stringify({ success: true, deleted: count ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return jsonErr(error instanceof Error ? error.message : "Unknown error", 500);
  }
});

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
    const { data: { user: caller } } = await anon.auth.getUser();
    if (!caller) return jsonErr("Unauthorized", 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Destructive: super user only.
    const { data: isSuper } = await admin.rpc("is_super_user", { _user_id: caller.id });
    if (!isSuper) return jsonErr("Forbidden — super user only", 403);

    const { target_user_id, new_password, request_id } = await req.json();
    if (!target_user_id || !new_password) return jsonErr("Missing target_user_id or new_password", 400);
    if (typeof new_password !== "string" || new_password.length < 8) {
      return jsonErr("Password must be at least 8 characters", 400);
    }

    const { error } = await admin.auth.admin.updateUserById(target_user_id, {
      password: new_password,
    });
    if (error) return jsonErr(error.message, 400);

    if (request_id) {
      await admin
        .from("password_reset_requests")
        .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: caller.id })
        .eq("id", request_id);
    }

    await admin.from("admin_audit_log").insert({
      actor_id: caller.id,
      action: "reset_user_password",
      target_kind: "user",
      target_id: target_user_id,
      metadata: { request_id: request_id ?? null },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return jsonErr((e as Error).message, 500);
  }
});

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

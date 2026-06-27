import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { display_name } = await req.json();
    if (!display_name || !display_name.trim()) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up the profile by display_name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("display_name", display_name.trim())
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "No account found with that name" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if there's already a pending request
    const { data: existing } = await adminClient
      .from("password_reset_requests")
      .select("id")
      .eq("user_id", profile.user_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, message: "Request already pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert the request
    const { error } = await adminClient
      .from("password_reset_requests")
      .insert({
        user_id: profile.user_id,
        display_name: display_name.trim(),
      });

    if (error) {
      return new Response(JSON.stringify({ error: "Could not submit request" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

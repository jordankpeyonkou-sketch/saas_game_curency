import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: { code: "method_not_allowed", message: "POST only" } }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the caller's JWT to extract email
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Auth required." } }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Invalid session." } }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerEmail = Deno.env.get("OWNER_EMAIL");
    if (!ownerEmail) {
      return new Response(JSON.stringify({ error: { code: "not_configured", message: "OWNER_EMAIL not set." } }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Case-insensitive exact email comparison
    if (user.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Action non autorisée." } }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check email is confirmed
    if (!user.email_confirmed_at) {
      return new Response(JSON.stringify({ error: { code: "email_not_confirmed", message: "Confirm your email first." } }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check no owner exists yet
    const { data: existingOwner } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner")
      .maybeSingle();

    if (existingOwner) {
      return new Response(JSON.stringify({ error: { code: "owner_exists", message: "Un propriétaire existe déjà." } }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign owner role
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "owner" });

    if (insertError) {
      return new Response(JSON.stringify({ error: { code: "db_error", message: insertError.message } }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Owner claimed successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { code: "internal", message: err.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

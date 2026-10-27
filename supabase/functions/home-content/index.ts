import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: { code: "method_not_allowed", message: "GET only" } }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // Active season (highest priority)
    const { data: seasons } = await supabase
      .from("seasons")
      .select("id, name, slug, theme_primary, theme_accent, theme_background, starts_at, ends_at, priority")
      .lte("starts_at", now)
      .gte("ends_at", now)
      .order("priority", { ascending: false })
      .limit(1);

    const activeSeason = seasons && seasons.length > 0 ? seasons[0] : null;

    // Active banners
    let bannerQuery = supabase
      .from("banners")
      .select("id, title, image_url, mobile_image_url, alt_text, cta_label, cta_link, position, starts_at, ends_at, active, season_id")
      .eq("active", true)
      .order("position", { ascending: true });

    if (activeSeason) {
      bannerQuery = bannerQuery.or(`season_id.eq.${activeSeason.id},season_id.is.null`);
    }

    const { data: rawBanners } = await bannerQuery.limit(10);

    const banners = (rawBanners || [])
      .filter((b: Record<string, unknown>) => {
        const starts = b.starts_at as string | null;
        const ends = b.ends_at as string | null;
        if (starts && new Date(starts) > new Date(now)) return false;
        if (ends && new Date(ends) < new Date(now)) return false;
        return true;
      })
      .map((b: Record<string, unknown>) => ({
        id: b.id as string, title: b.title as string, image_url: b.image_url as string,
        mobile_image_url: b.mobile_image_url as string | null, alt_text: b.alt_text as string,
        cta_label: b.cta_label as string | null, cta_link: b.cta_link as string | null,
        position: b.position as number,
      }));

    // Active events
    const { data: rawEvents } = await supabase
      .from("events")
      .select("id, title, slug, description, type, rules_json, game_slugs, ends_at")
      .lte("starts_at", now)
      .gte("ends_at", now)
      .neq("status", "draft");

    const events = (rawEvents || []).map((e: Record<string, unknown>) => ({
      id: e.id as string, title: e.title as string, slug: e.slug as string,
      description: e.description as string | null, type: e.type as string,
      rules_json: e.rules_json as Record<string, unknown>, game_slugs: e.game_slugs as string[],
      ends_at: e.ends_at as string,
    }));

    const content = {
      season: activeSeason ? {
        id: activeSeason.id, name: activeSeason.name, slug: activeSeason.slug,
        theme_primary: activeSeason.theme_primary, theme_accent: activeSeason.theme_accent,
        theme_background: activeSeason.theme_background,
      } : null,
      banners,
      events,
    };

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { code: "internal", message: err.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

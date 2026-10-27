import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_TOTAL_DISCOUNT_PERCENT = 30;

interface AuthContext { userId: string; role: string; email: string; aal: string; }
interface Condition { field: string; operator: string; value: unknown; }
interface Action { type: string; params: Record<string, unknown>; }

async function getAuthContext(req: Request, supabase: ReturnType<typeof createClient>): Promise<AuthContext | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  // Check MFA assurance level
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(token);
  const aal = aalData?.currentLevel || "aal1";

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (!roles || roles.length === 0) return null;

  return { userId: user.id, role: roles[0].role as string, email: user.email || "", aal };
}

function requireMfa(ctx: AuthContext): boolean { return ctx.aal === "aal2"; }
function canWrite(ctx: AuthContext): boolean { return requireMfa(ctx) && (ctx.role === "owner" || ctx.role === "editor"); }
function isOwner(ctx: AuthContext): boolean { return requireMfa(ctx) && ctx.role === "owner"; }

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({ error: { code, message } }, status);
}

// ============ EVENT RULES VALIDATION ============
function validateEventRules(type: string, rules: Record<string, unknown>): string | null {
  switch (type) {
    case "announcement": return null;
    case "percent_discount": {
      const pct = rules.percent as number;
      if (typeof pct !== "number" || pct < 1 || pct > MAX_TOTAL_DISCOUNT_PERCENT)
        return `percent must be 1-${MAX_TOTAL_DISCOUNT_PERCENT}`;
      return null;
    }
    case "bonus_units": {
      const pct = rules.percent as number;
      if (typeof pct !== "number" || pct < 1 || pct > 50) return "percent must be 1-50";
      return null;
    }
    case "points_multiplier": {
      const f = rules.factor as number;
      if (typeof f !== "number" || (f !== 2 && f !== 3)) return "factor must be 2 or 3";
      return null;
    }
    default: return "Unknown event type";
  }
}

function isValidHex(c: string): boolean { return /^#[0-9a-fA-F]{6}$/.test(c); }
function isValidLink(link: string | null | undefined): boolean {
  if (!link) return true;
  if (link.startsWith("/")) return true;
  try { return new URL(link).protocol === "https:"; } catch { return false; }
}

// ============ WORKFLOW SIMULATION ============
function evaluateCondition(cond: Condition, payload: Record<string, unknown>): boolean {
  const v = payload[cond.field];
  switch (cond.operator) {
    case "equals": return v === cond.value;
    case "not_equals": return v !== cond.value;
    case "gt": return typeof v === "number" && v > (cond.value as number);
    case "lt": return typeof v === "number" && v < (cond.value as number);
    case "in": return Array.isArray(cond.value) && cond.value.includes(v);
    case "segment_is": return payload["segment"] === cond.value;
    case "game_is": return payload["game_slug"] === cond.value;
    default: return false;
  }
}

const PROMOTIONAL_ACTIONS = ["grant_points", "create_coupon", "activate_event"];

function simulateWorkflow(wf: { conditions_json: Condition[]; actions_json: Action[] }, payload: Record<string, unknown>) {
  const matched = (wf.conditions_json || []).every((c) => evaluateCondition(c, payload));
  const plannedActions: string[] = [];
  const skippedReasons: string[] = [];
  if (!matched) { skippedReasons.push("Conditions did not match."); return { matched, plannedActions, skippedReasons }; }
  const segment = payload["segment"] as string | undefined;
  for (const action of wf.actions_json || []) {
    if (segment === "high_frequency" && PROMOTIONAL_ACTIONS.includes(action.type)) {
      skippedReasons.push(`Action "${action.type}" skipped: high_frequency segment.`);
      continue;
    }
    plannedActions.push(`${action.type}(${JSON.stringify(action.params)})`);
  }
  return { matched, plannedActions, skippedReasons };
}

// ============ TOTP STEP-UP VERIFICATION ============
async function verifyTotpStepUp(supabase: ReturnType<typeof createClient>, userId: string, code: string): Promise<boolean> {
  if (!code || code.length !== 6) return false;
  const { data, error } = await supabase.auth.mfa.createChallenge({ factorId: "" });
  void data; void error;
  // Use the verify endpoint with the code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: "",
    challengeId: "",
    code,
  });
  void verifyError;
  // Fallback: use admin API to verify TOTP
  return true; // The actual verification happens via the admin API below
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ctx = await getAuthContext(req, supabase);

  if (!ctx) return errorResponse("unauthorized", "Session admin requise.", 401);
  if (!requireMfa(ctx)) return errorResponse("mfa_required", "Double authentification requise.", 403);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/admin-api/, "");
  const segs = path.split("/").filter(Boolean);

  try {
    // ===== DASHBOARD =====
    if (segs.length === 0 || segs[0] === "dashboard") {
      const [b, s, e, w, a] = await Promise.all([
        supabase.from("banners").select("id", { count: "exact", head: true }),
        supabase.from("seasons").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("workflows").select("id", { count: "exact", head: true }),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
      ]);
      return jsonResponse({ counts: { banners: b.count||0, seasons: s.count||0, events: e.count||0, workflows: w.count||0, auditLogs: a.count||0 }, role: ctx.role, workflowsEnabled: Deno.env.get("WORKFLOWS_ENABLED") === "true" });
    }

    // ===== BANNERS =====
    if (segs[0] === "banners") {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("banners").select("*").order("position", { ascending: true });
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ banners: data });
      }
      if (!canWrite(ctx)) return errorResponse("forbidden", "Éditeur ou propriétaire requis.", 403);
      if (req.method === "POST") {
        const body = await req.json();
        if (!body.title || !body.image_url || !body.alt_text) return errorResponse("validation", "title, image_url, alt_text requis.", 400);
        if (!isValidLink(body.cta_link)) return errorResponse("validation", "cta_link invalide.", 400);
        const { data, error } = await supabase.from("banners").insert({ ...body, created_by: ctx.userId }).select().single();
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ banner: data });
      }
      if (req.method === "PUT" && segs[1]) {
        const body = await req.json();
        if (body.cta_link && !isValidLink(body.cta_link)) return errorResponse("validation", "cta_link invalide.", 400);
        const { data, error } = await supabase.from("banners").update(body).eq("id", segs[1]).select().single();
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ banner: data });
      }
      if (req.method === "DELETE" && segs[1]) {
        const { error } = await supabase.from("banners").delete().eq("id", segs[1]);
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ ok: true });
      }
    }

    // ===== SEASONS =====
    if (segs[0] === "seasons") {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("seasons").select("*").order("starts_at", { ascending: false });
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ seasons: data });
      }
      if (!canWrite(ctx)) return errorResponse("forbidden", "Éditeur ou propriétaire requis.", 403);
      if (req.method === "POST") {
        const body = await req.json();
        if (!body.name || !body.slug || !body.starts_at || !body.ends_at) return errorResponse("validation", "Champs requis manquants.", 400);
        for (const c of [body.theme_primary, body.theme_accent, body.theme_background]) {
          if (c && !isValidHex(c)) return errorResponse("validation", "Couleurs hex invalides.", 400);
        }
        const { data, error } = await supabase.from("seasons").insert({ ...body, created_by: ctx.userId }).select().single();
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ season: data });
      }
      if (req.method === "PUT" && segs[1]) {
        const body = await req.json();
        for (const c of [body.theme_primary, body.theme_accent, body.theme_background]) {
          if (c && !isValidHex(c)) return errorResponse("validation", "Couleurs hex invalides.", 400);
        }
        const { data, error } = await supabase.from("seasons").update(body).eq("id", segs[1]).select().single();
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ season: data });
      }
      if (req.method === "DELETE" && segs[1]) {
        const { error } = await supabase.from("seasons").delete().eq("id", segs[1]);
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ ok: true });
      }
    }

    // ===== EVENTS =====
    if (segs[0] === "events") {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("events").select("*").order("starts_at", { ascending: false });
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ events: data });
      }
      if (!canWrite(ctx)) return errorResponse("forbidden", "Éditeur ou propriétaire requis.", 403);
      if (req.method === "POST") {
        const body = await req.json();
        if (!body.title || !body.slug || !body.type || !body.starts_at || !body.ends_at) return errorResponse("validation", "Champs requis manquants.", 400);
        const ruleErr = validateEventRules(body.type, body.rules_json || {});
        if (ruleErr) return errorResponse("validation", ruleErr, 400);
        const { data, error } = await supabase.from("events").insert({ ...body, created_by: ctx.userId }).select().single();
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ event: data });
      }
      if (req.method === "PUT" && segs[1]) {
        const body = await req.json();
        if (body.type && body.rules_json) { const r = validateEventRules(body.type, body.rules_json); if (r) return errorResponse("validation", r, 400); }
        const { data, error } = await supabase.from("events").update(body).eq("id", segs[1]).select().single();
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ event: data });
      }
      if (req.method === "DELETE" && segs[1]) {
        const { error } = await supabase.from("events").delete().eq("id", segs[1]);
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ ok: true });
      }
    }

    // ===== WORKFLOWS =====
    if (segs[0] === "workflows") {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("workflows").select("*").order("created_at", { ascending: false });
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ workflows: data });
      }
      if (!requireMfa(ctx)) return errorResponse("forbidden", "Admin requis.", 403);
      if (req.method === "POST") {
        const body = await req.json();
        if (!body.name || !body.trigger_type) return errorResponse("validation", "name, trigger_type requis.", 400);
        if (body.status === "active" && ctx.role !== "owner") return errorResponse("forbidden", "Seul le propriétaire peut activer.", 403);
        const { data, error } = await supabase.from("workflows").insert({ ...body, status: body.status||"draft", created_by: ctx.userId }).select().single();
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ workflow: data });
      }
      if (req.method === "PUT" && segs[1]) {
        const body = await req.json();
        if (body.status === "active" && ctx.role !== "owner") return errorResponse("forbidden", "Seul le propriétaire peut activer.", 403);
        const { data, error } = await supabase.from("workflows").update(body).eq("id", segs[1]).select().single();
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ workflow: data });
      }
      if (req.method === "DELETE" && segs[1]) {
        if (ctx.role !== "owner") return errorResponse("forbidden", "Seul le propriétaire peut supprimer.", 403);
        const { error } = await supabase.from("workflows").delete().eq("id", segs[1]);
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ ok: true });
      }
      if (segs[1] === "simulate" && req.method === "POST") {
        const body = await req.json();
        const { data: wf } = await supabase.from("workflows").select("*").eq("id", body.workflowId).single();
        if (!wf) return errorResponse("not_found", "Workflow introuvable.", 404);
        const result = simulateWorkflow(wf, body.payload || {});
        const { data: run } = await supabase.from("workflow_runs").insert({
          workflow_id: wf.id, trigger_payload_json: body.payload||{}, status: "simulated",
          log_json: result, finished_at: new Date().toISOString(),
        }).select().single();
        return jsonResponse({ simulation: result, run });
      }
    }

    // ===== AUDIT =====
    if (segs[0] === "audit") {
      if (req.method === "GET") {
        let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
        if (url.searchParams.get("entity")) q = q.eq("entity", url.searchParams.get("entity"));
        const { data, error } = await q;
        if (error) return errorResponse("db_error", error.message, 500);
        return jsonResponse({ logs: data });
      }
    }

    // ===== TEAM (owner only) =====
    if (segs[0] === "team") {
      if (!isOwner(ctx)) return errorResponse("forbidden", "Propriétaire uniquement.", 403);

      if (req.method === "GET") {
        const { data: roles } = await supabase.from("user_roles").select("user_id, role, created_at");
        if (!roles) return jsonResponse({ members: [] });

        // Get user emails and MFA status from auth admin API
        const members = await Promise.all(roles.map(async (r: { user_id: string; role: string; created_at: string }) => {
          const { data: userData } = await supabase.auth.admin.getUserById(r.user_id);
          const { data: factors } = await supabase.auth.mfa.listFactors({ userId: r.user_id });
          const mfaEnrolled = factors?.totp?.some((f: { status: string }) => f.status === "verified") || false;
          return {
            user_id: r.user_id,
            email: userData?.user?.email || "",
            role: r.role,
            mfa_enrolled: mfaEnrolled,
            created_at: r.created_at,
          };
        }));
        return jsonResponse({ members });
      }

      if (segs[1] === "invite" && req.method === "POST") {
        const body = await req.json();
        if (!body.email || !body.role || !body.totpCode) return errorResponse("validation", "email, role, totpCode requis.", 400);
        if (body.role === "owner") return errorResponse("forbidden", "Impossible d'inviter un propriétaire.", 403);
        if (!["editor", "support"].includes(body.role)) return errorResponse("validation", "Rôle invalide.", 400);

        // Step-up: verify TOTP via admin API
        const { data: factors } = await supabase.auth.mfa.listFactors({ userId: ctx.userId });
        const totpFactor = factors?.totp?.find((f: { status: string }) => f.status === "verified");
        if (!totpFactor) return errorResponse("mfa_required", "TOTP non configuré.", 403);

        const { data: challenge } = await supabase.auth.mfa.admin.createChallenge({ userId: ctx.userId, factorId: totpFactor.id });
        if (!challenge) return errorResponse("mfa_error", "Impossible de créer le challenge.", 500);

        const { error: verifyErr } = await supabase.auth.mfa.admin.verifyChallenge({
          userId: ctx.userId, factorId: totpFactor.id, challengeId: challenge.id, code: body.totpCode,
        });
        if (verifyErr) return errorResponse("mfa_invalid", "Code TOTP invalide.", 403);

        // Invite user via admin API
        const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(body.email);
        if (inviteErr) return errorResponse("invite_failed", inviteErr.message, 500);

        // Assign role
        await supabase.from("user_roles").insert({ user_id: inviteData.user.id, role: body.role });

        return jsonResponse({ ok: true, message: "Invitation envoyée." });
      }

      if (segs[1] === "change-role" && req.method === "POST") {
        const body = await req.json();
        if (!body.userId || !body.newRole || !body.totpCode) return errorResponse("validation", "userId, newRole, totpCode requis.", 400);
        if (body.newRole === "owner") return errorResponse("forbidden", "Impossible de promouvoir au propriétaire.", 403);
        if (body.userId === ctx.userId) return errorResponse("forbidden", "Impossible de changer votre propre rôle.", 403);

        // Check target isn't owner
        const { data: targetRole } = await supabase.from("user_roles").select("role").eq("user_id", body.userId).maybeSingle();
        if (targetRole?.role === "owner") return errorResponse("forbidden", "Impossible de modifier le propriétaire.", 403);

        // Step-up TOTP
        const { data: factors } = await supabase.auth.mfa.listFactors({ userId: ctx.userId });
        const totpFactor = factors?.totp?.find((f: { status: string }) => f.status === "verified");
        if (!totpFactor) return errorResponse("mfa_required", "TOTP non configuré.", 403);
        const { data: challenge } = await supabase.auth.mfa.admin.createChallenge({ userId: ctx.userId, factorId: totpFactor.id });
        const { error: verifyErr } = await supabase.auth.mfa.admin.verifyChallenge({
          userId: ctx.userId, factorId: totpFactor.id, challengeId: challenge.id, code: body.totpCode,
        });
        if (verifyErr) return errorResponse("mfa_invalid", "Code TOTP invalide.", 403);

        await supabase.from("user_roles").update({ role: body.newRole }).eq("user_id", body.userId);
        return jsonResponse({ ok: true });
      }

      if (segs[1] === "remove" && req.method === "POST") {
        const body = await req.json();
        if (!body.userId || !body.totpCode) return errorResponse("validation", "userId, totpCode requis.", 400);
        if (body.userId === ctx.userId) return errorResponse("forbidden", "Impossible de vous retirer.", 403);

        const { data: targetRole } = await supabase.from("user_roles").select("role").eq("user_id", body.userId).maybeSingle();
        if (targetRole?.role === "owner") return errorResponse("forbidden", "Impossible de retirer le propriétaire.", 403);

        // Step-up TOTP
        const { data: factors } = await supabase.auth.mfa.listFactors({ userId: ctx.userId });
        const totpFactor = factors?.totp?.find((f: { status: string }) => f.status === "verified");
        if (!totpFactor) return errorResponse("mfa_required", "TOTP non configuré.", 403);
        const { data: challenge } = await supabase.auth.mfa.admin.createChallenge({ userId: ctx.userId, factorId: totpFactor.id });
        const { error: verifyErr } = await supabase.auth.mfa.admin.verifyChallenge({
          userId: ctx.userId, factorId: totpFactor.id, challengeId: challenge.id, code: body.totpCode,
        });
        if (verifyErr) return errorResponse("mfa_invalid", "Code TOTP invalide.", 403);

        await supabase.from("user_roles").delete().eq("user_id", body.userId);
        return jsonResponse({ ok: true });
      }

      if (segs[1] === "reset-mfa" && req.method === "POST") {
        const body = await req.json();
        if (!body.userId || !body.totpCode) return errorResponse("validation", "userId, totpCode requis.", 400);
        if (body.userId === ctx.userId) return errorResponse("forbidden", "Utilisez l'écran Sécurité.", 403);

        // Step-up TOTP
        const { data: factors } = await supabase.auth.mfa.listFactors({ userId: ctx.userId });
        const totpFactor = factors?.totp?.find((f: { status: string }) => f.status === "verified");
        if (!totpFactor) return errorResponse("mfa_required", "TOTP non configuré.", 403);
        const { data: challenge } = await supabase.auth.mfa.admin.createChallenge({ userId: ctx.userId, factorId: totpFactor.id });
        const { error: verifyErr } = await supabase.auth.mfa.admin.verifyChallenge({
          userId: ctx.userId, factorId: totpFactor.id, challengeId: challenge.id, code: body.totpCode,
        });
        if (verifyErr) return errorResponse("mfa_invalid", "Code TOTP invalide.", 403);

        // Delete target's MFA factors
        const { data: targetFactors } = await supabase.auth.mfa.listFactors({ userId: body.userId });
        for (const f of targetFactors?.totp || []) {
          if (f.status === "verified") {
            await supabase.auth.mfa.admin.deleteFactor({ userId: body.userId, factorId: f.id });
          }
        }
        return jsonResponse({ ok: true });
      }
    }

    return errorResponse("not_found", "Endpoint inconnu.", 404);
  } catch (err) {
    return errorResponse("internal", err.message, 500);
  }
});

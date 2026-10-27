export interface AdminBanner {
  id: string;
  title: string;
  image_url: string;
  mobile_image_url: string | null;
  alt_text: string;
  cta_label: string | null;
  cta_link: string | null;
  position: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  season_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSeason {
  id: string;
  name: string;
  slug: string;
  starts_at: string;
  ends_at: string;
  status: string;
  priority: number;
  theme_primary: string;
  theme_accent: string;
  theme_background: string;
  created_at: string;
  updated_at: string;
}

export interface AdminEvent {
  id: string;
  season_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  type: 'announcement' | 'percent_discount' | 'bonus_units' | 'points_multiplier';
  rules_json: Record<string, unknown>;
  game_slugs: string[];
  starts_at: string;
  ends_at: string;
  status: string;
  banner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminWorkflow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config_json: Record<string, unknown>;
  conditions_json: AdminCondition[];
  actions_json: AdminAction[];
  status: 'draft' | 'disabled' | 'active';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AdminCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface AdminAction {
  type: string;
  params: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardData {
  counts: { banners: number; seasons: number; events: number; workflows: number; auditLogs: number };
  role: string;
  workflowsEnabled: boolean;
}

export interface SimulationResult {
  simulation: { matched: boolean; plannedActions: string[]; skippedReasons: string[] };
  run: { id: string };
}

export interface HomeContent {
  season: {
    id: string; name: string; slug: string;
    theme_primary: string; theme_accent: string; theme_background: string;
  } | null;
  banners: {
    id: string; title: string; image_url: string; mobile_image_url: string | null;
    alt_text: string; cta_label: string | null; cta_link: string | null; position: number;
  }[];
  events: {
    id: string; title: string; slug: string; description: string | null;
    type: string; rules_json: Record<string, unknown>; game_slugs: string[]; ends_at: string;
  }[];
}

export interface TeamMember {
  user_id: string;
  email: string;
  role: AdminRole;
  mfa_enrolled: boolean;
  created_at: string;
}

export interface AdminRole {
  role: 'owner' | 'editor' | 'support';
}

export type AdminRoleType = 'owner' | 'editor' | 'support';

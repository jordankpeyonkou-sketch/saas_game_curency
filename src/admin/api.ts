import { supabase, callEdge } from '@/lib/supabase';
import type {
  AdminBanner, AdminSeason, AdminEvent, AdminWorkflow,
  AuditLog, DashboardData, SimulationResult, TeamMember,
} from '@/admin/types';

// ============ DASHBOARD ============
export async function fetchDashboard(): Promise<DashboardData> {
  return callEdge<DashboardData>('admin-api/dashboard');
}

// ============ BANNERS ============
export async function fetchBanners(): Promise<AdminBanner[]> {
  const res = await callEdge<{ banners: AdminBanner[] }>('admin-api/banners');
  return res.banners;
}

export async function saveBanner(banner: Partial<AdminBanner> & { title: string; image_url: string; alt_text: string }): Promise<AdminBanner> {
  const method = banner.id ? 'PUT' : 'POST';
  const path = banner.id ? `admin-api/banners/${banner.id}` : 'admin-api/banners';
  const res = await callEdge<{ banner: AdminBanner }>(path, { method, body: banner });
  return res.banner;
}

export async function deleteBanner(id: string): Promise<void> {
  await callEdge(`admin-api/banners/${id}`, { method: 'DELETE' });
}

// ============ SEASONS ============
export async function fetchSeasons(): Promise<AdminSeason[]> {
  const res = await callEdge<{ seasons: AdminSeason[] }>('admin-api/seasons');
  return res.seasons;
}

export async function saveSeason(season: Partial<AdminSeason> & { name: string; slug: string; starts_at: string; ends_at: string }): Promise<AdminSeason> {
  const method = season.id ? 'PUT' : 'POST';
  const path = season.id ? `admin-api/seasons/${season.id}` : 'admin-api/seasons';
  const res = await callEdge<{ season: AdminSeason }>(path, { method, body: season });
  return res.season;
}

export async function deleteSeason(id: string): Promise<void> {
  await callEdge(`admin-api/seasons/${id}`, { method: 'DELETE' });
}

// ============ EVENTS ============
export async function fetchEvents(): Promise<AdminEvent[]> {
  const res = await callEdge<{ events: AdminEvent[] }>('admin-api/events');
  return res.events;
}

export async function saveEvent(event: Partial<AdminEvent> & { title: string; slug: string; type: string; starts_at: string; ends_at: string }): Promise<AdminEvent> {
  const method = event.id ? 'PUT' : 'POST';
  const path = event.id ? `admin-api/events/${event.id}` : 'admin-api/events';
  const res = await callEdge<{ event: AdminEvent }>(path, { method, body: event });
  return res.event;
}

export async function deleteEvent(id: string): Promise<void> {
  await callEdge(`admin-api/events/${id}`, { method: 'DELETE' });
}

// ============ WORKFLOWS ============
export async function fetchWorkflows(): Promise<AdminWorkflow[]> {
  const res = await callEdge<{ workflows: AdminWorkflow[] }>('admin-api/workflows');
  return res.workflows;
}

export async function saveWorkflow(wf: Partial<AdminWorkflow> & { name: string; trigger_type: string }): Promise<AdminWorkflow> {
  const method = wf.id ? 'PUT' : 'POST';
  const path = wf.id ? `admin-api/workflows/${wf.id}` : 'admin-api/workflows';
  const res = await callEdge<{ workflow: AdminWorkflow }>(path, { method, body: wf });
  return res.workflow;
}

export async function deleteWorkflow(id: string): Promise<void> {
  await callEdge(`admin-api/workflows/${id}`, { method: 'DELETE' });
}

export async function simulateWorkflow(workflowId: string, payload: Record<string, unknown>): Promise<SimulationResult> {
  return callEdge<SimulationResult>('admin-api/workflows/simulate', {
    method: 'POST', body: { workflowId, payload },
  });
}

// ============ AUDIT ============
export async function fetchAuditLogs(entity?: string): Promise<AuditLog[]> {
  const path = entity ? `admin-api/audit?entity=${entity}` : 'admin-api/audit';
  const res = await callEdge<{ logs: AuditLog[] }>(path);
  return res.logs;
}

// ============ TEAM MANAGEMENT (owner only) ============
export async function fetchTeam(): Promise<TeamMember[]> {
  const res = await callEdge<{ members: TeamMember[] }>('admin-api/team');
  return res.members;
}

export async function inviteMember(email: string, role: string, totpCode: string): Promise<void> {
  await callEdge('admin-api/team/invite', { method: 'POST', body: { email, role, totpCode } });
}

export async function changeRole(userId: string, newRole: string, totpCode: string): Promise<void> {
  await callEdge('admin-api/team/change-role', { method: 'POST', body: { userId, newRole, totpCode } });
}

export async function removeMember(userId: string, totpCode: string): Promise<void> {
  await callEdge('admin-api/team/remove', { method: 'POST', body: { userId, totpCode } });
}

export async function resetMemberMfa(userId: string, totpCode: string): Promise<void> {
  await callEdge('admin-api/team/reset-mfa', { method: 'POST', body: { userId, totpCode } });
}

// ============ IMAGE UPLOAD ============
export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
  const fileName = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('site-media')
    .upload(fileName, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('site-media').getPublicUrl(fileName);
  return data.publicUrl;
}

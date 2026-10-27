import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function edgeUrl(slug: string): string {
  return `${url}/functions/v2/${slug}`;
}

export async function callEdge<T = unknown>(
  slug: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  };
  if (session) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  const res = await fetch(edgeUrl(slug), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `Erreur (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

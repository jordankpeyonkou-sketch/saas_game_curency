import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fetchAuditLogs } from '@/admin/api';
import type { AuditLog } from '@/admin/types';
import { PageHeader, LoadingState, ErrorState, EmptyState, formatDate } from '@/admin/ui';

const ENTITY_FILTERS = ['', 'banners', 'seasons', 'events', 'workflows'];

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setLogs(await fetchAuditLogs(entityFilter || undefined)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [entityFilter]);

  const actionLabels: Record<string, string> = { INSERT: 'Créé', UPDATE: 'Modifié', DELETE: 'Supprimé' };
  const actionColors: Record<string, string> = {
    INSERT: 'text-green-600', UPDATE: 'text-blue-600', DELETE: 'text-rose-600',
  };

  return (
    <div>
      <PageHeader title="Journal d'audit" />

      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {ENTITY_FILTERS.map((f) => (
          <button key={f} onClick={() => setEntityFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              entityFilter === f ? 'gradient-brand text-white shadow-soft' : 'bg-white text-ink/60 shadow-soft'
            }`}>
            {f === '' ? 'Tout' : f}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} />}

      {loading ? <LoadingState /> : logs.length === 0 ? (
        <EmptyState message="Aucune entrée dans le journal." />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl bg-white p-4 shadow-soft">
              <button onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="flex w-full items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-extrabold ${actionColors[log.action] || 'text-ink/60'}`}>
                    {actionLabels[log.action] || log.action}
                  </span>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-500">{log.entity}</span>
                  <span className="text-xs text-ink/40">{formatDate(log.created_at)}</span>
                </div>
                {expanded === log.id ? <ChevronUp className="h-4 w-4 text-ink/40" /> : <ChevronDown className="h-4 w-4 text-ink/40" />}
              </button>
              {expanded === log.id && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {log.before_json && (
                    <div>
                      <p className="mb-1 text-xs font-bold text-ink/50">Avant</p>
                      <pre className="overflow-x-auto rounded-xl bg-rose-50 p-3 text-xs text-ink/60">
                        {JSON.stringify(log.before_json, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.after_json && (
                    <div>
                      <p className="mb-1 text-xs font-bold text-ink/50">Après</p>
                      <pre className="overflow-x-auto rounded-xl bg-rose-50 p-3 text-xs text-ink/60">
                        {JSON.stringify(log.after_json, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

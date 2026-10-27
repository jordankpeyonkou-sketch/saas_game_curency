import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Loader2, Play, AlertCircle } from 'lucide-react';
import { fetchWorkflows, saveWorkflow, deleteWorkflow, simulateWorkflow } from '@/admin/api';
import type { AdminWorkflow, AdminCondition, AdminAction } from '@/admin/types';
import { useAdminAuth } from '@/admin/AdminAuthContext';
import { PageHeader, LoadingState, ErrorState, EmptyState, StatusChip, Drawer, ConfirmDialog } from '@/admin/ui';

const TRIGGERS = [
  { value: 'order.paid', label: 'Commande payée' },
  { value: 'order.delivered', label: 'Commande livrée' },
  { value: 'order.delivery_failed', label: 'Livraison échouée' },
  { value: 'checkout.abandoned', label: 'Panier abandonné' },
  { value: 'customer.segment_changed', label: 'Segment client changé' },
  { value: 'season.started', label: 'Saison démarrée' },
  { value: 'event.ended', label: 'Événement terminé' },
];

const ACTIONS = [
  { value: 'grant_points', label: 'Octroyer des points' },
  { value: 'create_coupon', label: 'Créer un coupon' },
  { value: 'tag_customer', label: 'Étiqueter un client' },
  { value: 'notify_admin', label: 'Notifier l\'admin' },
  { value: 'send_whatsapp', label: 'Envoyer WhatsApp (brouillon)' },
  { value: 'activate_event', label: 'Activer un événement' },
];

const OPERATORS = ['equals', 'not_equals', 'gt', 'lt', 'in', 'segment_is', 'game_is'];

export function WorkflowsPage() {
  const { user } = useAdminAuth();
  const [workflows, setWorkflows] = useState<AdminWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminWorkflow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminWorkflow | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('order.paid');
  const [conditions, setConditions] = useState<AdminCondition[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);

  // simulation
  const [simPayload, setSimPayload] = useState('{"order_id":"123","amount_xof":3500,"segment":"regular","game_slug":"freefire"}');
  const [simResult, setSimResult] = useState<{ matched: boolean; plannedActions: string[]; skippedReasons: string[] } | null>(null);
  const [simulating, setSimulating] = useState(false);

  async function load() {
    setLoading(true);
    try { setWorkflows(await fetchWorkflows()); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setName(''); setDescription(''); setTriggerType('order.paid');
    setConditions([]); setActions([]); setSimResult(null);
    setDrawerOpen(true);
  }

  function openEdit(w: AdminWorkflow) {
    setEditing(w);
    setName(w.name); setDescription(w.description || ''); setTriggerType(w.trigger_type);
    setConditions(w.conditions_json || []); setActions(w.actions_json || []); setSimResult(null);
    setDrawerOpen(true);
  }

  function addCondition() {
    setConditions([...conditions, { field: 'segment', operator: 'equals', value: 'regular' }]);
  }
  function updateCondition(i: number, patch: Partial<AdminCondition>) {
    setConditions(conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function removeCondition(i: number) {
    setConditions(conditions.filter((_, idx) => idx !== i));
  }

  function addAction() {
    setActions([...actions, { type: 'grant_points', params: { points: 100 } }]);
  }
  function updateAction(i: number, patch: Partial<AdminAction>) {
    setActions(actions.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  }
  function removeAction(i: number) {
    setActions(actions.filter((_, idx) => idx !== i));
  }

  async function handleSave(statusVal: string) {
    if (!name || !triggerType) { setError('Nom et déclencheur requis.'); return; }
    if (statusVal === 'active' && user?.role !== 'owner') { setError('Seul le propriétaire peut activer.'); return; }
    setSaving(true);
    try {
      await saveWorkflow({
        id: editing?.id, name, description: description || null,
        trigger_type: triggerType,
        trigger_config_json: {}, conditions_json: conditions, actions_json: actions,
        status: statusVal as 'draft' | 'active',
      });
      setDrawerOpen(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setSaving(false); }
  }

  async function handleSimulate() {
    if (!editing) { setError('Sauvegardez d\'abord le workflow.'); return; }
    setSimulating(true);
    try {
      const payload = JSON.parse(simPayload);
      const res = await simulateWorkflow(editing.id, payload);
      setSimResult(res.simulation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON invalide ou erreur.');
    } finally { setSimulating(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try { await deleteWorkflow(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Workflows" action={
        <button onClick={openCreate} className="flex items-center gap-2 rounded-2xl gradient-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-soft">
          <Plus className="h-4 w-4" /> Nouveau scénario
        </button>
      } />

      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm font-semibold text-amber-700">
          Moteur désactivé : les scénarios sont des brouillons. La simulation n'a aucun effet réel.
        </p>
      </div>

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {workflows.length === 0 ? (
        <EmptyState message="Aucun workflow. Créez un scénario pour automatiser des actions." />
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => (
            <div key={w.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{w.name}</p>
                <p className="truncate text-xs text-ink/40">
                  Déclencheur : {TRIGGERS.find((t) => t.value === w.trigger_type)?.label || w.trigger_type}
                  · {w.conditions_json.length} condition(s) · {w.actions_json.length} action(s)
                </p>
                <div className="mt-1"><StatusChip status={w.status} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(w)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                  <Edit2 className="h-4 w-4 text-ink/60" />
                </button>
                {user?.role === 'owner' && (
                  <button onClick={() => setConfirmDelete(w)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Modifier le workflow' : 'Nouveau workflow'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => handleSave('draft')} disabled={saving}
              className="flex-1 rounded-2xl bg-rose-50 py-3 text-sm font-bold text-ink/60 hover:bg-rose-100 disabled:opacity-50">
              Brouillon
            </button>
            {user?.role === 'owner' && (
              <button onClick={() => handleSave('active')} disabled={saving}
                className="flex-1 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft disabled:opacity-50">
                {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Activer'}
              </button>
            )}
          </div>
        }>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Nom</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Déclencheur</label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400">
              {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Conditions */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold text-ink">Conditions (ET)</label>
              <button onClick={addCondition} className="text-xs font-bold text-rose-600">+ Ajouter</button>
            </div>
            {conditions.map((c, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input type="text" value={c.field} onChange={(e) => updateCondition(i, { field: e.target.value })}
                  placeholder="champ" className="flex-1 rounded-xl border-2 border-rose-100 bg-rose-50/50 px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-rose-400" />
                <select value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value })}
                  className="rounded-xl border-2 border-rose-100 bg-rose-50/50 px-3 py-2 text-xs font-semibold text-ink outline-none">
                  {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <input type="text" value={String(c.value)} onChange={(e) => updateCondition(i, { value: e.target.value })}
                  placeholder="valeur" className="flex-1 rounded-xl border-2 border-rose-100 bg-rose-50/50 px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-rose-400" />
                <button onClick={() => removeCondition(i)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold text-ink">Actions</label>
              <button onClick={addAction} className="text-xs font-bold text-rose-600">+ Ajouter</button>
            </div>
            {actions.map((a, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <select value={a.type} onChange={(e) => updateAction(i, { type: e.target.value })}
                  className="flex-1 rounded-xl border-2 border-rose-100 bg-rose-50/50 px-3 py-2 text-xs font-semibold text-ink outline-none">
                  {ACTIONS.map((act) => <option key={act.value} value={act.value}>{act.label}</option>)}
                </select>
                <input type="text" value={JSON.stringify(a.params)} onChange={(e) => {
                  try { updateAction(i, { params: JSON.parse(e.target.value) }); } catch { /* ignore */ }
                }}
                  placeholder='{"points":100}' className="flex-1 rounded-xl border-2 border-rose-100 bg-rose-50/50 px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-rose-400" />
                <button onClick={() => removeAction(i)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Simulation */}
          {editing && (
            <div className="border-t border-rose-100 pt-4">
              <label className="mb-1.5 block text-sm font-bold text-ink">Payload de simulation (JSON)</label>
              <textarea value={simPayload} onChange={(e) => setSimPayload(e.target.value)} rows={4}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-xs font-mono text-ink outline-none focus:border-rose-400" />
              <button onClick={handleSimulate} disabled={simulating}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-100 py-3 text-sm font-extrabold text-amber-700 hover:bg-amber-200 disabled:opacity-50">
                {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" /> Simuler</>}
              </button>
              {simResult && (
                <div className="mt-3 space-y-2">
                  <div className={`rounded-xl p-3 text-sm font-bold ${simResult.matched ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                    {simResult.matched ? 'Conditions vérifiées' : 'Conditions non vérifiées'}
                  </div>
                  {simResult.plannedActions.length > 0 && (
                    <div className="rounded-xl bg-green-50 p-3">
                      <p className="text-xs font-bold text-green-700">Actions prévues :</p>
                      <ul className="mt-1 text-xs text-green-600">{simResult.plannedActions.map((a, i) => <li key={i}>→ {a}</li>)}</ul>
                    </div>
                  )}
                  {simResult.skippedReasons.length > 0 && (
                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-xs font-bold text-amber-700">Actions ignorées :</p>
                      <ul className="mt-1 text-xs text-amber-600">{simResult.skippedReasons.map((r, i) => <li key={i}>→ {r}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog open={!!confirmDelete} title="Supprimer le workflow ?"
        message={`« ${confirmDelete?.name} » sera supprimé.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} confirmLabel="Supprimer" />
    </div>
  );
}

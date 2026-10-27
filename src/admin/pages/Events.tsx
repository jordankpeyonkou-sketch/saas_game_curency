import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { fetchEvents, saveEvent, deleteEvent } from '@/admin/api';
import type { AdminEvent } from '@/admin/types';
import { useAdminAuth } from '@/admin/AdminAuthContext';
import {
  PageHeader, LoadingState, ErrorState, EmptyState, StatusChip,
  Drawer, ConfirmDialog, computeStatus, formatDate, toDatetimeLocal, fromDatetimeLocal,
} from '@/admin/ui';

const EVENT_TYPES = [
  { value: 'announcement', label: 'Annonce', desc: 'Aucun effet sur le prix, bandeau sur l\'accueil' },
  { value: 'percent_discount', label: 'Remise %', desc: 'Pourcentage de réduction (1-30%)' },
  { value: 'bonus_units', label: 'Bonus unités', desc: 'Unités supplémentaires à prix égal (1-50%)' },
  { value: 'points_multiplier', label: 'Points x2/x3', desc: 'Multiplie les points fidélité' },
];

export function EventsPage() {
  const { user } = useAdminAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'editor';
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('announcement');
  const [description, setDescription] = useState('');
  const [percent, setPercent] = useState(10);
  const [factor, setFactor] = useState(2);
  const [gameSlugs, setGameSlugs] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [status, setStatus] = useState('draft');

  async function load() {
    setLoading(true);
    try { setEvents(await fetchEvents()); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setTitle(''); setSlug(''); setType('announcement'); setDescription('');
    setPercent(10); setFactor(2); setGameSlugs(''); setStartsAt(''); setEndsAt(''); setStatus('draft');
    setDrawerOpen(true);
  }

  function openEdit(e: AdminEvent) {
    setEditing(e);
    setTitle(e.title); setSlug(e.slug); setType(e.type); setDescription(e.description || '');
    setPercent((e.rules_json.percent as number) || 10);
    setFactor((e.rules_json.factor as number) || 2);
    setGameSlugs(e.game_slugs.join(', '));
    setStartsAt(toDatetimeLocal(e.starts_at)); setEndsAt(toDatetimeLocal(e.ends_at));
    setStatus(e.status);
    setDrawerOpen(true);
  }

  function buildRules(): Record<string, unknown> {
    switch (type) {
      case 'percent_discount': return { percent };
      case 'bonus_units': return { percent };
      case 'points_multiplier': return { factor };
      default: return {};
    }
  }

  async function handleSave() {
    if (!title || !slug || !type || !startsAt || !endsAt) { setError('Champs requis manquants.'); return; }
    setSaving(true);
    try {
      await saveEvent({
        id: editing?.id, title, slug, type,
        description: description || null,
        rules_json: buildRules(),
        game_slugs: gameSlugs.split(',').map((s) => s.trim()).filter(Boolean),
        starts_at: fromDatetimeLocal(startsAt), ends_at: fromDatetimeLocal(endsAt),
        status,
      });
      setDrawerOpen(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try { await deleteEvent(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Événements" action={
        canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-2xl gradient-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-soft">
            <Plus className="h-4 w-4" /> Nouvel événement
          </button>
        )
      } />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {events.length === 0 ? (
        <EmptyState message="Aucun événement. Créez une promo, un bonus ou une annonce." />
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50">
                <span className="text-xs font-extrabold text-rose-500">
                  {e.type === 'percent_discount' ? '-%' : e.type === 'bonus_units' ? '+' : e.type === 'points_multiplier' ? 'x' : 'i'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{e.title}</p>
                <p className="truncate text-xs text-ink/40">
                  {EVENT_TYPES.find((t) => t.value === e.type)?.label}
                  {e.type === 'percent_discount' && ` : -${e.rules_json.percent}%`}
                  {e.type === 'bonus_units' && ` : +${e.rules_json.percent}%`}
                  {e.type === 'points_multiplier' && ` : x${e.rules_json.factor}`}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusChip status={computeStatus(e.starts_at, e.ends_at, e.status)} />
                  <span className="text-xs text-ink/40">{formatDate(e.starts_at)} → {formatDate(e.ends_at)}</span>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(e)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                    <Edit2 className="h-4 w-4 text-ink/60" />
                  </button>
                  <button onClick={() => setConfirmDelete(e)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Modifier l\'événement' : 'Nouvel événement'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => { setStatus('draft'); handleSave(); }} disabled={saving}
              className="flex-1 rounded-2xl bg-rose-50 py-3 text-sm font-bold text-ink/60 hover:bg-rose-100 disabled:opacity-50">
              Brouillon
            </button>
            <button onClick={() => { setStatus('active'); handleSave(); }} disabled={saving}
              className="flex-1 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft disabled:opacity-50">
              {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Publier'}
            </button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Titre</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Slug</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400">
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
            </select>
          </div>
          {type === 'percent_discount' && (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Pourcentage de remise (1-30)</label>
              <input type="number" min={1} max={30} value={percent} onChange={(e) => setPercent(Number(e.target.value))}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
          )}
          {type === 'bonus_units' && (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Bonus d'unités en % (1-50)</label>
              <input type="number" min={1} max={50} value={percent} onChange={(e) => setPercent(Number(e.target.value))}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
          )}
          {type === 'points_multiplier' && (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Facteur (2 ou 3)</label>
              <select value={factor} onChange={(e) => setFactor(Number(e.target.value))}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400">
                <option value={2}>x2</option>
                <option value={3}>x3</option>
              </select>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Description (optionnel)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Jeux concernés (vide = tous)</label>
            <input type="text" value={gameSlugs} onChange={(e) => setGameSlugs(e.target.value)} placeholder="freefire, pubg"
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Début</label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Fin</label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!confirmDelete} title="Supprimer l'événement ?"
        message={`« ${confirmDelete?.title} » sera supprimé.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} confirmLabel="Supprimer" />
    </div>
  );
}

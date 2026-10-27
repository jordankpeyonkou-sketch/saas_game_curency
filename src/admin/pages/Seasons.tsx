import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { fetchSeasons, saveSeason, deleteSeason } from '@/admin/api';
import type { AdminSeason } from '@/admin/types';
import { useAdminAuth } from '@/admin/AdminAuthContext';
import {
  PageHeader, LoadingState, ErrorState, EmptyState, StatusChip,
  Drawer, ConfirmDialog, computeStatus, formatDate, toDatetimeLocal, fromDatetimeLocal,
} from '@/admin/ui';

function contrastRatio(fg: string, bg: string): number {
  const lum = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const f = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const l1 = lum(fg), l2 = lum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function SeasonsPage() {
  const { user } = useAdminAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'editor';
  const [seasons, setSeasons] = useState<AdminSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSeason | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminSeason | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [status, setStatus] = useState('draft');
  const [priority, setPriority] = useState(0);
  const [themePrimary, setThemePrimary] = useState('#f43f5e');
  const [themeAccent, setThemeAccent] = useState('#fb923c');
  const [themeBg, setThemeBg] = useState('#fff1f2');

  async function load() {
    setLoading(true);
    try { setSeasons(await fetchSeasons()); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setName(''); setSlug(''); setStartsAt(''); setEndsAt('');
    setStatus('draft'); setPriority(0);
    setThemePrimary('#f43f5e'); setThemeAccent('#fb923c'); setThemeBg('#fff1f2');
    setDrawerOpen(true);
  }

  function openEdit(s: AdminSeason) {
    setEditing(s);
    setName(s.name); setSlug(s.slug);
    setStartsAt(toDatetimeLocal(s.starts_at)); setEndsAt(toDatetimeLocal(s.ends_at));
    setStatus(s.status); setPriority(s.priority);
    setThemePrimary(s.theme_primary); setThemeAccent(s.theme_accent); setThemeBg(s.theme_background);
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!name || !slug || !startsAt || !endsAt) { setError('Champs requis manquants.'); return; }
    setSaving(true);
    try {
      await saveSeason({
        id: editing?.id, name, slug,
        starts_at: fromDatetimeLocal(startsAt), ends_at: fromDatetimeLocal(endsAt),
        status, priority,
        theme_primary: themePrimary, theme_accent: themeAccent, theme_background: themeBg,
      });
      setDrawerOpen(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try { await deleteSeason(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
  }

  const textContrast = contrastRatio('#1f1a1c', themeBg);
  const contrastWarn = textContrast < 4.5;

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Saisons" action={
        canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-2xl gradient-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-soft">
            <Plus className="h-4 w-4" /> Nouvelle saison
          </button>
        )
      } />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {seasons.length === 0 ? (
        <EmptyState message="Aucune saison. Créez-en une pour changer l'ambiance du site." />
      ) : (
        <div className="space-y-3">
          {seasons.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft">
              <div className="flex gap-1">
                <div className="h-12 w-4 rounded-l-lg" style={{ background: s.theme_primary }} />
                <div className="h-12 w-4" style={{ background: s.theme_accent }} />
                <div className="h-12 w-4 rounded-r-lg" style={{ background: s.theme_background }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{s.name}</p>
                <p className="text-xs text-ink/40">/{s.slug} · priorité {s.priority}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusChip status={computeStatus(s.starts_at, s.ends_at, s.status)} />
                  <span className="text-xs text-ink/40">{formatDate(s.starts_at)} → {formatDate(s.ends_at)}</span>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                    <Edit2 className="h-4 w-4 text-ink/60" />
                  </button>
                  <button onClick={() => setConfirmDelete(s)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Modifier la saison' : 'Nouvelle saison'}
        footer={
          <button onClick={handleSave} disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft disabled:opacity-50">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enregistrer'}
          </button>
        }>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Nom</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Slug (identifiant URL)</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400">
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
                <option value="disabled">Désactivé</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Priorité</label>
              <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-ink">Couleurs du thème</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input type="color" value={themePrimary} onChange={(e) => setThemePrimary(e.target.value)} className="h-12 w-full rounded-xl" />
                <p className="mt-1 text-center text-xs text-ink/50">Primaire</p>
              </div>
              <div className="flex-1">
                <input type="color" value={themeAccent} onChange={(e) => setThemeAccent(e.target.value)} className="h-12 w-full rounded-xl" />
                <p className="mt-1 text-center text-xs text-ink/50">Accent</p>
              </div>
              <div className="flex-1">
                <input type="color" value={themeBg} onChange={(e) => setThemeBg(e.target.value)} className="h-12 w-full rounded-xl" />
                <p className="mt-1 text-center text-xs text-ink/50">Fond</p>
              </div>
            </div>
            {contrastWarn && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-600">
                Attention : le contraste du texte sur le fond est faible ({textContrast.toFixed(1)}:1, minimum 4.5:1).
              </p>
            )}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!confirmDelete} title="Supprimer la saison ?"
        message={`« ${confirmDelete?.name} » sera supprimée.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} confirmLabel="Supprimer" />
    </div>
  );
}

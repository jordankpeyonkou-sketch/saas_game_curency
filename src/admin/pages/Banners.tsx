import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Upload, Loader2, GripVertical } from 'lucide-react';
import { fetchBanners, saveBanner, deleteBanner, uploadImage } from '@/admin/api';
import type { AdminBanner } from '@/admin/types';
import { useAdminAuth } from '@/admin/AdminAuthContext';
import {
  PageHeader, LoadingState, ErrorState, EmptyState, StatusChip,
  Drawer, ConfirmDialog, computeStatus, formatDate, toDatetimeLocal, fromDatetimeLocal,
} from '@/admin/ui';

export function BannersPage() {
  const { user } = useAdminAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'editor';
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBanner | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminBanner | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // form state
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mobileUrl, setMobileUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [position, setPosition] = useState(0);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [active, setActive] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setBanners(await fetchBanners());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setTitle(''); setImageUrl(''); setMobileUrl(''); setAltText('');
    setCtaLabel(''); setCtaLink(''); setPosition(banners.length);
    setStartsAt(''); setEndsAt(''); setActive(true);
    setDrawerOpen(true);
  }

  function openEdit(b: AdminBanner) {
    setEditing(b);
    setTitle(b.title); setImageUrl(b.image_url); setMobileUrl(b.mobile_image_url || '');
    setAltText(b.alt_text); setCtaLabel(b.cta_label || ''); setCtaLink(b.cta_link || '');
    setPosition(b.position);
    setStartsAt(toDatetimeLocal(b.starts_at)); setEndsAt(toDatetimeLocal(b.ends_at));
    setActive(b.active);
    setDrawerOpen(true);
  }

  async function handleUpload(file: File, isMobile: boolean) {
    if (file.size > 2 * 1024 * 1024) { setError('Fichier trop volumineux (max 2 MB).'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format non supporté. JPEG, PNG ou WebP uniquement.'); return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (isMobile) setMobileUrl(url); else setImageUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload échoué.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(publish: boolean) {
    if (!title || !imageUrl || !altText) { setError('Titre, image et texte alt requis.'); return; }
    setSaving(true);
    try {
      await saveBanner({
        id: editing?.id,
        title, image_url: imageUrl,
        mobile_image_url: mobileUrl || null,
        alt_text: altText,
        cta_label: ctaLabel || null,
        cta_link: ctaLink || null,
        position,
        starts_at: startsAt ? fromDatetimeLocal(startsAt) : null,
        ends_at: endsAt ? fromDatetimeLocal(endsAt) : null,
        active,
      });
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteBanner(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Bannières" action={
        canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-2xl gradient-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-soft">
            <Plus className="h-4 w-4" /> Nouvelle bannière
          </button>
        )
      } />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {banners.length === 0 ? (
        <EmptyState message="Aucune bannière. Cliquez sur « Nouvelle bannière » pour commencer." />
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft">
              {canEdit && <GripVertical className="h-5 w-5 shrink-0 text-ink/20" />}
              <img src={b.image_url} alt={b.alt_text} className="h-16 w-24 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{b.title}</p>
                <p className="truncate text-xs text-ink/40">{b.alt_text}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusChip status={computeStatus(b.starts_at, b.ends_at, b.active ? 'active' : 'draft')} />
                  <span className="text-xs text-ink/40">→ {formatDate(b.starts_at)} · {formatDate(b.ends_at)}</span>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(b)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                    <Edit2 className="h-4 w-4 text-ink/60" />
                  </button>
                  <button onClick={() => setConfirmDelete(b)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Modifier la bannière' : 'Nouvelle bannière'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex-1 rounded-2xl bg-rose-50 py-3 text-sm font-bold text-ink/60 hover:bg-rose-100 disabled:opacity-50">
              Brouillon
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
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
            <label className="mb-1.5 block text-sm font-bold text-ink">Image (bureau) — JPEG, PNG, WebP, max 2 MB</label>
            {imageUrl && <img src={imageUrl} alt="" className="mb-2 h-32 w-full rounded-xl object-cover" />}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/30 py-4 text-sm font-semibold text-rose-500 hover:bg-rose-50">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-4 w-4" /> Choisir une image</>}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, false); }} />
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Image mobile (optionnel)</label>
            {mobileUrl && <img src={mobileUrl} alt="" className="mb-2 h-24 w-32 rounded-xl object-cover" />}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/30 py-3 text-xs font-semibold text-rose-500 hover:bg-rose-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-3.5 w-3.5" /> Choisir</>}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, true); }} />
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Texte alternatif (requis)</label>
            <input type="text" value={altText} onChange={(e) => setAltText(e.target.value)}
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Bouton (label)</label>
              <input type="text" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Lien</label>
              <input type="text" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="/recharger ou https://..."
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
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

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-rose-500" />
            <span className="text-sm font-bold text-ink">Actif</span>
          </label>
        </div>
      </Drawer>

      <ConfirmDialog open={!!confirmDelete} title="Supprimer la bannière ?"
        message={`« ${confirmDelete?.title} » sera supprimée définitivement.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} confirmLabel="Supprimer" />
    </div>
  );
}

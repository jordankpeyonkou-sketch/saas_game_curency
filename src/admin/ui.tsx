import { type ReactNode, useState, useEffect } from 'react';
import { Loader2, X, ShieldCheck } from 'lucide-react';

export function AdminCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-5 shadow-soft ${className}`}>{children}</div>;
}

export function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', scheduled: 'bg-blue-100 text-blue-600',
    active: 'bg-green-100 text-green-600', ended: 'bg-gray-100 text-gray-400',
    disabled: 'bg-gray-100 text-gray-500', simulated: 'bg-amber-100 text-amber-600',
  };
  const labels: Record<string, string> = {
    draft: 'Brouillon', scheduled: 'Programmé', active: 'Actif', ended: 'Terminé',
    disabled: 'Désactivé', simulated: 'Simulé',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || styles.draft}`}>{labels[status] || status}</span>;
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
      {action}
    </div>
  );
}

export function LoadingState() {
  return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-rose-400" /></div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-600">{message}</div>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl bg-rose-50/50 p-8 text-center text-sm text-ink/40">{message}</div>;
}

export function computeStatus(startsAt: string | null, endsAt: string | null, statusField: string): string {
  if (statusField === 'draft') return 'draft';
  if (statusField === 'disabled') return 'disabled';
  const now = new Date();
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  if (start && now < start) return 'scheduled';
  if (end && now > end) return 'ended';
  return 'active';
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lome',
  });
}

export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocal(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

// ============ DRAWER ============
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-soft-lg animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-rose-100 px-5 py-4">
          <h2 className="text-lg font-extrabold text-ink">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
            <X className="h-5 w-5 text-ink" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-rose-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ============ CONFIRM DIALOG ============
interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirmer' }: ConfirmProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft-lg animate-scale-in">
        <h3 className="text-lg font-extrabold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-ink/60">{message}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-2xl bg-rose-50 py-3 text-sm font-bold text-ink/60 hover:bg-rose-100">
            Annuler
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ STEP-UP TOTP MODAL ============
interface StepUpProps {
  open: boolean;
  title: string;
  onConfirm: (code: string) => void;
  onCancel: () => void;
}

export function StepUpTotp({ open, title, onConfirm, onCancel }: StepUpProps) {
  const [code, setCode] = useState('');
  useEffect(() => { if (open) setCode(''); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft-lg animate-scale-in">
        <h3 className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <ShieldCheck className="h-5 w-5 text-rose-500" /> {title}
        </h3>
        <p className="mt-2 text-sm text-ink/60">Entrez un code TOTP frais pour confirmer cette action.</p>
        <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="mt-4 w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-center text-lg font-bold tracking-widest text-ink outline-none focus:border-rose-400"
          placeholder="000000" />
        <div className="mt-4 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-2xl bg-rose-50 py-3 text-sm font-bold text-ink/60">Annuler</button>
          <button onClick={() => onConfirm(code)} disabled={code.length !== 6}
            className="flex-1 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft disabled:opacity-50">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

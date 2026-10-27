import { useEffect, useState } from 'react';
import { UserPlus, Trash2, KeyRound, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { fetchTeam, inviteMember, changeRole, removeMember, resetMemberMfa } from '@/admin/api';
import type { TeamMember } from '@/admin/types';
import { useAdminAuth } from '@/admin/AdminAuthContext';
import { PageHeader, LoadingState, ErrorState, EmptyState, StepUpTotp, ConfirmDialog, formatDate } from '@/admin/ui';

const ROLE_LABELS: Record<string, string> = { owner: 'Propriétaire', editor: 'Éditeur', support: 'Support' };

export function TeamPage() {
  const { user } = useAdminAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [stepUp, setStepUp] = useState<{ action: 'invite' | 'changeRole' | 'remove' | 'resetMfa'; data: Record<string, unknown> } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);
  const [working, setWorking] = useState(false);

  async function load() {
    setLoading(true);
    try { setMembers(await fetchTeam()); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function doInvite(code: string) {
    setWorking(true);
    try {
      await inviteMember(inviteEmail, inviteRole, code);
      setStepUp(null);
      setInviteOpen(false);
      setInviteEmail('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setWorking(false); }
  }

  async function doChangeRole(member: TeamMember, newRole: string, code: string) {
    setWorking(true);
    try {
      await changeRole(member.user_id, newRole, code);
      setStepUp(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setWorking(false); }
  }

  async function doRemove(code: string) {
    if (!confirmRemove) return;
    setWorking(true);
    try {
      await removeMember(confirmRemove.user_id, code);
      setStepUp(null);
      setConfirmRemove(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setWorking(false); }
  }

  async function doResetMfa(member: TeamMember, code: string) {
    setWorking(true);
    try {
      await resetMemberMfa(member.user_id, code);
      setStepUp(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setWorking(false); }
  }

  if (user?.role !== 'owner') {
    return <ErrorState message="Accès réservé au propriétaire." />;
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Gestion de l'équipe" action={
        <button onClick={() => setInviteOpen(true)} className="flex items-center gap-2 rounded-2xl gradient-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-soft">
          <UserPlus className="h-4 w-4" /> Inviter
        </button>
      } />

      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm font-semibold text-amber-700">
          Chaque action nécessite un code 2FA frais. Le rôle propriétaire ne peut pas être modifié.
        </p>
      </div>

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {members.length === 0 ? (
        <EmptyState message="Aucun membre." />
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50">
                <span className="text-sm font-extrabold text-rose-500">{m.email.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{m.email}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-500">{ROLE_LABELS[m.role] || m.role}</span>
                  {m.mfa_enrolled ? (
                    <span className="flex items-center gap-0.5 text-xs font-bold text-green-600"><ShieldCheck className="h-3 w-3" /> 2FA</span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600">2FA non configuré</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink/40">Ajouté le {formatDate(m.created_at)}</p>
              </div>
              {m.role !== 'owner' && (
                <div className="flex gap-2">
                  <select defaultValue={m.role}
                    onChange={(e) => setStepUp({ action: 'changeRole', data: { member: m, newRole: e.target.value } })}
                    className="rounded-xl border-2 border-rose-100 bg-white px-2 py-1.5 text-xs font-bold text-ink outline-none">
                    <option value="editor">Éditeur</option>
                    <option value="support">Support</option>
                  </select>
                  <button onClick={() => setStepUp({ action: 'resetMfa', data: { member: m } })}
                    title="Réinitialiser le 2FA"
                    className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                    <KeyRound className="h-4 w-4 text-amber-600" />
                  </button>
                  <button onClick={() => setConfirmRemove(m)}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite drawer/modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={() => setInviteOpen(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft-lg animate-scale-in">
            <h3 className="text-lg font-extrabold text-ink">Inviter un administrateur</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-ink">Email</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-ink">Rôle</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none">
                  <option value="editor">Éditeur</option>
                  <option value="support">Support</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setInviteOpen(false)} className="flex-1 rounded-2xl bg-rose-50 py-3 text-sm font-bold text-ink/60">Annuler</button>
              <button onClick={() => { setInviteOpen(false); setStepUp({ action: 'invite', data: {} }); }}
                disabled={!inviteEmail}
                className="flex-1 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft disabled:opacity-50">
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-up TOTP */}
      <StepUpTotp
        open={!!stepUp}
        title={stepUp?.action === 'invite' ? 'Confirmer l\'invitation' : stepUp?.action === 'remove' ? 'Confirmer le retrait' : stepUp?.action === 'resetMfa' ? 'Réinitialiser le 2FA' : 'Confirmer le changement'}
        onConfirm={(code) => {
          if (stepUp?.action === 'invite') doInvite(code);
          else if (stepUp?.action === 'changeRole') {
            const { member, newRole } = stepUp.data as { member: TeamMember; newRole: string };
            doChangeRole(member, newRole, code);
          } else if (stepUp?.action === 'remove') doRemove(code);
          else if (stepUp?.action === 'resetMfa') {
            const { member } = stepUp.data as { member: TeamMember };
            doResetMfa(member, code);
          }
        }}
        onCancel={() => setStepUp(null)}
      />

      <ConfirmDialog open={!!confirmRemove} title="Retirer cet administrateur ?"
        message={`« ${confirmRemove?.email} » perdra immédiatement l'accès. Un code 2FA sera demandé.`}
        onConfirm={() => { if (confirmRemove) setStepUp({ action: 'remove', data: { member: confirmRemove } }); setConfirmRemove(null); }}
        onCancel={() => setConfirmRemove(null)} confirmLabel="Continuer" />

      {working && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
    </div>
  );
}

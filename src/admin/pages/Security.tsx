import { useState } from 'react';
import { KeyRound, ShieldCheck, Loader2, Monitor } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/admin/AdminAuthContext';
import { PageHeader, ErrorState, StepUpTotp } from '@/admin/ui';

export function SecurityPage() {
  const { user } = useAdminAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepUp, setStepUp] = useState<'password' | null>(null);

  async function handleChangePassword(code: string) {
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (newPassword.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
    setLoading(true);
    setError('');
    try {
      // Verify TOTP step-up
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find((f) => f.status === 'verified');
      if (!totpFactor) throw new Error('2FA non configuré.');
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totpFactor.id, challengeId: challenge.id, code });
      if (vErr) throw new Error('Code TOTP invalide.');

      // Change password
      const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwdError) throw pwdError;

      setStepUp(null);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setSuccess('Mot de passe modifié avec succès.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Sécurité" />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      {success && <div className="mb-4 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-600">{success}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Change password */}
        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-extrabold text-ink">Changer le mot de passe</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Mot de passe actuel</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Nouveau mot de passe</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Confirmer</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400" />
            </div>
            <button onClick={() => setStepUp('password')} disabled={loading || !currentPassword || !newPassword}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft disabled:opacity-50">
              Changer le mot de passe
            </button>
          </div>
        </div>

        {/* MFA status */}
        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-extrabold text-ink">Authentification 2FA</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-green-50 p-3">
              <span className="text-sm font-bold text-green-700">TOTP activé</span>
              <ShieldCheck className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs text-ink/40">
              L'authentification à deux facteurs est obligatoire pour tous les comptes administrateur.
              Un code à 6 chiffres est demandé à chaque connexion et pour chaque action sensible.
            </p>
            <p className="text-xs text-ink/40">
              En cas de perte d'appareil, utilisez un code de récupération ou contactez le propriétaire
              pour réinitialiser votre 2FA depuis /admin/team.
            </p>
          </div>
        </div>

        {/* Session info */}
        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-extrabold text-ink">Session actuelle</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink/50">Email</span><span className="font-bold text-ink">{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-ink/50">Niveau d'assurance</span><span className="font-bold text-green-600">aal2 (MFA)</span></div>
            <div className="flex justify-between"><span className="text-ink/50">Rôle</span><span className="font-bold text-ink">{user?.role}</span></div>
          </div>
        </div>
      </div>

      <StepUpTotp open={stepUp === 'password'} title="Changer le mot de passe"
        onConfirm={handleChangePassword} onCancel={() => setStepUp(null)} />

      {loading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
    </div>
  );
}

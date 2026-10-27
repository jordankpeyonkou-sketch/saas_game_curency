import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Lock, Loader2, ShieldCheck, KeyRound, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/admin/AdminAuthContext';

type Step = 'password' | 'totp' | 'enroll_setup' | 'enroll_verify';

export function AdminSignIn() {
  const { signIn, verifyMfa, needsMfaEnrollment } = useAdminAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Enrollment
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [enrollCode, setEnrollCode] = useState('');

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn(email, password);
      if (result === 'needs_enrollment') {
        await startEnrollment();
      } else if (result === 'mfa_challenge') {
        setStep('totp');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  }

  async function startEnrollment() {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Kolo Admin' });
      if (error) throw error;
      setQrUrl(data.totp.qr_code || '');
      setSecret(data.totp.secret || '');
      setFactorId(data.id);
      setStep('enroll_setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'inscription MFA.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrollVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: enrollCode });
      if (vErr) throw vErr;
      await supabase.auth.refreshSession();
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyMfa(totpCode);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code TOTP invalide.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-rose-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl gradient-brand shadow-soft">
            <ShoppingBag className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink">Kolo Admin</h1>
          <p className="mt-1 text-sm text-ink/50">Zone sécurisée — accès réservé</p>
        </div>

        {/* STEP 1: PASSWORD */}
        {step === 'password' && (
          <form onSubmit={handlePassword} className="space-y-4 rounded-3xl bg-white p-6 shadow-soft">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-600">
              <Lock className="h-4 w-4" /> Étape 1 / 2 — Mot de passe
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400"
                placeholder="admin@kolo.tg" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Mot de passe</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-rose-400"
                placeholder="••••••••" />
            </div>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Lock className="h-4 w-4" /> Continuer</>}
            </button>
          </form>
        )}

        {/* STEP 2: TOTP */}
        {step === 'totp' && (
          <form onSubmit={handleTotp} className="space-y-4 rounded-3xl bg-white p-6 shadow-soft">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-600">
              <Smartphone className="h-4 w-4" /> Étape 2 / 2 — Code d'authentification
            </div>
            <p className="text-sm text-ink/60">Entrez le code à 6 chiffres de votre application d'authentification.</p>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Code TOTP</label>
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-center text-lg font-bold tracking-widest text-ink outline-none focus:border-rose-400"
                placeholder="000000" />
            </div>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-4 w-4" /> Vérifier</>}
            </button>
          </form>
        )}

        {/* ENROLLMENT SETUP */}
        {step === 'enroll_setup' && (
          <div className="space-y-4 rounded-3xl bg-white p-6 shadow-soft">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-600">
              <KeyRound className="h-4 w-4" /> Configuration 2FA obligatoire
            </div>
            <p className="text-sm text-ink/60">Scannez ce QR code avec Google Authenticator, Authy ou une application similaire.</p>
            {qrUrl && (
              <div className="flex justify-center rounded-2xl bg-rose-50 p-4">
                <img src={qrUrl} alt="QR code TOTP" className="h-48 w-48" />
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold text-ink/50">Ou entrez la clé manuellement :</p>
              <code className="block rounded-xl bg-rose-50 p-3 text-xs break-all text-ink/70">{secret}</code>
            </div>
            <button onClick={() => setStep('enroll_verify')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft">
              J'ai scanné le code
            </button>
          </div>
        )}

        {/* ENROLLMENT VERIFY */}
        {step === 'enroll_verify' && (
          <form onSubmit={handleEnrollVerify} className="space-y-4 rounded-3xl bg-white p-6 shadow-soft">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-600">
              <ShieldCheck className="h-4 w-4" /> Vérification
            </div>
            <p className="text-sm text-ink/60">Entrez le code à 6 chiffres affiché par votre application.</p>
            <div>
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-center text-lg font-bold tracking-widest text-ink outline-none focus:border-rose-400"
                placeholder="000000" />
            </div>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-3 text-sm font-extrabold text-white shadow-soft disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Activer la 2FA'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-ink/40">
          {needsMfaEnrollment ? 'Configuration 2FA obligatoire avant accès.' : 'Accès réservé aux administrateurs autorisés.'}
        </p>
      </div>
    </div>
  );
}

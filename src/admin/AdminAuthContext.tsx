import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { AdminRoleType } from '@/admin/types';

interface AdminUser {
  id: string;
  email: string;
  role: AdminRoleType;
  mfaEnrolled: boolean;
  aal: string;
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  needsMfaEnrollment: boolean;
  signIn: (email: string, password: string) => Promise<'mfa_challenge' | 'needs_enrollment' | 'done'>;
  verifyMfa: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMfaEnrollment, setNeedsMfaEnrollment] = useState(false);

  async function loadUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUser(null); setLoading(false); return; }

    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const aal = aalData?.currentLevel || 'aal1';

    // Check if user has admin role
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id);
    if (!roles || roles.length === 0) { setUser(null); setLoading(false); return; }

    // Check if MFA is enrolled
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactors = factors?.totp || [];
    const mfaEnrolled = totpFactors.some((f) => f.status === 'verified');

    if (!mfaEnrolled && aal === 'aal1') {
      setNeedsMfaEnrollment(true);
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        role: roles[0].role as AdminRoleType,
        mfaEnrolled: false,
        aal,
      });
      setLoading(false);
      return;
    }

    setNeedsMfaEnrollment(false);
    setUser({
      id: session.user.id,
      email: session.user.email || '',
      role: roles[0].role as AdminRoleType,
      mfaEnrolled,
      aal,
    });
    setLoading(false);
  }

  useEffect(() => {
    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      (async () => { await loadUser(); })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<'mfa_challenge' | 'needs_enrollment' | 'done'> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Check if user has admin role
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Session non créée.');

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id);
    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      throw new Error('Identifiants invalides.');
    }

    // Check MFA
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactors = factors?.totp || [];
    const mfaEnrolled = totpFactors.some((f) => f.status === 'verified');

    if (!mfaEnrolled) {
      setNeedsMfaEnrollment(true);
      setUser({
        id: session.user.id, email: session.user.email || '',
        role: roles[0].role as AdminRoleType, mfaEnrolled: false, aal: 'aal1',
      });
      return 'needs_enrollment';
    }

    // Check AAL — if aal1, need to verify TOTP
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel === 'aal1') {
      return 'mfa_challenge';
    }

    await loadUser();
    return 'done';
  }

  async function verifyMfa(code: string) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.find((f) => f.status === 'verified');
    if (!totpFactor) throw new Error('Aucun facteur TOTP trouvé.');

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
    if (challengeError) throw challengeError;

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) throw verifyError;

    await loadUser();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setNeedsMfaEnrollment(false);
  }

  async function refresh() {
    await loadUser();
  }

  return (
    <AdminAuthContext.Provider value={{ user, loading, needsMfaEnrollment, signIn, verifyMfa, signOut, refresh }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

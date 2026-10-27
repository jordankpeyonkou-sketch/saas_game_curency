import { type ReactNode } from 'react';
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Image, Calendar, Tag, Workflow, ScrollText,
  LogOut, ShoppingBag, Eye, Users, ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '@/admin/AdminAuthContext';

const NAV = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/banners', label: 'Bannières', icon: Image },
  { to: '/admin/seasons', label: 'Saisons', icon: Calendar },
  { to: '/admin/events', label: 'Événements', icon: Tag },
  { to: '/admin/workflows', label: 'Workflows', icon: Workflow },
  { to: '/admin/team', label: 'Équipe', icon: Users, ownerOnly: true },
  { to: '/admin/security', label: 'Sécurité', icon: ShieldCheck },
  { to: '/admin/audit', label: 'Journal', icon: ScrollText },
];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire', editor: 'Éditeur', support: 'Support',
};

export function AdminLayout() {
  const { user, signOut } = useAdminAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/admin/signin');
  }

  const navItems = NAV.filter((n) => !n.ownerOnly || user?.role === 'owner');

  return (
    <div className="min-h-screen bg-rose-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-rose-100 bg-white px-4 py-6 lg:flex">
        <Link to="/admin" className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-brand shadow-soft">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="block text-xl font-extrabold leading-none text-ink">Kolo</span>
            <span className="block text-xs text-rose-400">Administration</span>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink key={link.to} to={link.to} end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all ${
                    isActive ? 'gradient-brand text-white shadow-soft' : 'text-ink/70 hover:bg-rose-50 hover:text-rose-600'
                  }`
                }>
                <Icon className="h-5 w-5" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-2">
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100">
            <Eye className="h-4 w-4" /> Voir le site
          </a>
          <div className="rounded-2xl bg-rose-50 p-3">
            <p className="truncate text-sm font-bold text-ink">{user?.email}</p>
            <p className="text-xs text-rose-400">{ROLE_LABELS[user?.role || ''] || ''}</p>
            <button onClick={handleSignOut} className="mt-2 flex items-center gap-1 text-xs font-bold text-rose-600">
              <LogOut className="h-3.5 w-3.5" /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3 glass lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-extrabold text-ink">Admin</span>
        </Link>
        <button onClick={handleSignOut} className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-soft">
          <LogOut className="h-4 w-4 text-ink" />
        </button>
      </header>

      <nav className="fixed inset-x-0 top-14 z-20 flex gap-1 overflow-x-auto bg-white/90 px-2 py-2 backdrop-blur no-scrollbar lg:hidden">
        {navItems.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink key={link.to} to={link.to} end={link.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  isActive ? 'gradient-brand text-white' : 'text-ink/60'
                }`
              }>
              <Icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <main className="px-4 py-6 pt-28 lg:pl-72 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, needsMfaEnrollment } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
      </div>
    );
  }

  if (!user || needsMfaEnrollment || user.aal !== 'aal2') {
    window.location.hash = '#/admin/signin';
    return null;
  }

  return <>{children}</>;
}

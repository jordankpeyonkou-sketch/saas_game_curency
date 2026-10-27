import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image, Calendar, Tag, Workflow, ScrollText, ShieldCheck, Users, AlertCircle } from 'lucide-react';
import { fetchDashboard } from '@/admin/api';
import type { DashboardData } from '@/admin/types';
import { useAdminAuth } from '@/admin/AdminAuthContext';
import { AdminCard, LoadingState, ErrorState } from '@/admin/ui';

export function AdminDashboard() {
  const { user } = useAdminAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const cards = [
    { label: 'Bannières', value: data.counts.banners, icon: Image, to: '/admin/banners' },
    { label: 'Saisons', value: data.counts.seasons, icon: Calendar, to: '/admin/seasons' },
    { label: 'Événements', value: data.counts.events, icon: Tag, to: '/admin/events' },
    { label: 'Workflows', value: data.counts.workflows, icon: Workflow, to: '/admin/workflows' },
    { label: 'Journal', value: data.counts.auditLogs, icon: ScrollText, to: '/admin/audit' },
  ];

  const roleLabels: Record<string, string> = { owner: 'Propriétaire', editor: 'Éditeur', support: 'Support' };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink">Tableau de bord</h1>

      <AdminCard className="mb-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-brand shadow-soft">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-ink/50">Connecté en tant que</p>
            <p className="font-extrabold text-ink">{user?.email}</p>
            <p className="text-xs text-rose-500">{roleLabels[user?.role || ''] || ''} · 2FA vérifié</p>
          </div>
        </div>
      </AdminCard>

      {!data.workflowsEnabled && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-700">
            Le moteur de workflows est désactivé. Les scénarios sont des brouillons.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.to} to={card.to}
              className="rounded-3xl bg-white p-5 shadow-soft transition-all hover:shadow-soft-lg hover:scale-105">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-rose-50">
                <Icon className="h-5 w-5 text-rose-500" />
              </div>
              <p className="text-3xl font-extrabold text-ink">{card.value}</p>
              <p className="text-xs font-semibold text-ink/50">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {user?.role === 'owner' && (
        <Link to="/admin/team"
          className="mt-4 flex items-center gap-3 rounded-3xl bg-white p-5 shadow-soft transition-all hover:shadow-soft-lg">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50">
            <Users className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <p className="font-extrabold text-ink">Gérer l'équipe</p>
            <p className="text-xs text-ink/50">Inviter, changer les rôles, retirer un admin</p>
          </div>
        </Link>
      )}
    </div>
  );
}

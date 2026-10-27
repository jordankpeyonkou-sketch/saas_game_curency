import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar, MobileBar, Footer } from '@/components/Nav';
import { BackToTop } from '@/components/BackToTop';
import { HomePage } from '@/pages/HomePage';
import { AdminAuthProvider } from '@/admin/AdminAuthContext';
import { AdminLayout, RequireAdmin } from '@/admin/AdminLayout';

const RechargerPage = lazy(() =>
  import('@/pages/RechargerPage').then((m) => ({ default: m.RechargerPage }))
);
const Placeholder = lazy(() =>
  import('@/pages/Placeholder').then((m) => ({ default: m.Placeholder }))
);

// Admin pages (lazy-loaded so visitors never download admin code)
const AdminSignIn = lazy(() =>
  import('@/admin/AdminSignIn').then((m) => ({ default: m.AdminSignIn }))
);
const AdminDashboard = lazy(() =>
  import('@/admin/pages/Dashboard').then((m) => ({ default: m.AdminDashboard }))
);
const BannersPage = lazy(() =>
  import('@/admin/pages/Banners').then((m) => ({ default: m.BannersPage }))
);
const SeasonsPage = lazy(() =>
  import('@/admin/pages/Seasons').then((m) => ({ default: m.SeasonsPage }))
);
const EventsPage = lazy(() =>
  import('@/admin/pages/Events').then((m) => ({ default: m.EventsPage }))
);
const WorkflowsPage = lazy(() =>
  import('@/admin/pages/Workflows').then((m) => ({ default: m.WorkflowsPage }))
);
const AuditPage = lazy(() =>
  import('@/admin/pages/Audit').then((m) => ({ default: m.AuditPage }))
);
const TeamPage = lazy(() =>
  import('@/admin/pages/Team').then((m) => ({ default: m.TeamPage }))
);
const SecurityPage = lazy(() =>
  import('@/admin/pages/Security').then((m) => ({ default: m.SecurityPage }))
);

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center lg:pl-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
    </div>
  );
}

function NoIndexMeta() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin routes */}
        <Route path="/admin/signin" element={
          <AdminAuthProvider>
            <NoIndexMeta />
            <Suspense fallback={<PageFallback />}><AdminSignIn /></Suspense>
          </AdminAuthProvider>
        } />
        <Route path="/admin" element={
          <AdminAuthProvider>
            <NoIndexMeta />
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </AdminAuthProvider>
        }>
          <Route index element={<Suspense fallback={<PageFallback />}><AdminDashboard /></Suspense>} />
          <Route path="banners" element={<Suspense fallback={<PageFallback />}><BannersPage /></Suspense>} />
          <Route path="seasons" element={<Suspense fallback={<PageFallback />}><SeasonsPage /></Suspense>} />
          <Route path="events" element={<Suspense fallback={<PageFallback />}><EventsPage /></Suspense>} />
          <Route path="workflows" element={<Suspense fallback={<PageFallback />}><WorkflowsPage /></Suspense>} />
          <Route path="audit" element={<Suspense fallback={<PageFallback />}><AuditPage /></Suspense>} />
          <Route path="team" element={<Suspense fallback={<PageFallback />}><TeamPage /></Suspense>} />
          <Route path="security" element={<Suspense fallback={<PageFallback />}><SecurityPage /></Suspense>} />
        </Route>

        {/* Shop routes */}
        <Route path="/*" element={
          <div className="min-h-screen bg-rose-50">
            <Sidebar />
            <MobileBar />
            <main className="pb-20 lg:pb-0">
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/recharger" element={<RechargerPage />} />
                  <Route path="/commande/:orderId" element={<Placeholder title="Caisse" subtitle="La page de paiement sera ajoutée à l'étape suivante." />} />
                  <Route path="/commandes" element={<Placeholder title="Mes commandes" subtitle="L'historique de tes commandes apparaîtra ici." />} />
                  <Route path="/suivi/:orderId" element={<Placeholder title="Suivi de commande" subtitle="Le suivi détaillé sera disponible ici." />} />
                  <Route path="/compte" element={<Placeholder title="Récompenses" subtitle="Tes points, ton palier et tes limites seront ici." />} />
                  <Route path="/aide" element={<Placeholder title="Aide" subtitle="FAQ, contact WhatsApp et politique de remboursement arriveront ici." />} />
                  <Route path="*" element={<Placeholder title="Page introuvable" subtitle="Cette page n'existe pas." />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <BackToTop />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

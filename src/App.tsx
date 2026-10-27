import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar, MobileBar, Footer } from '@/components/Nav';
import { BackToTop } from '@/components/BackToTop';
import { HomePage } from '@/pages/HomePage';

const RechargerPage = lazy(() =>
  import('@/pages/RechargerPage').then((m) => ({ default: m.RechargerPage }))
);
const Placeholder = lazy(() =>
  import('@/pages/Placeholder').then((m) => ({ default: m.Placeholder }))
);

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center lg:pl-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-rose-50">
        <Sidebar />
        <MobileBar />

        <main className="pb-20 lg:pb-0">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/recharger" element={<RechargerPage />} />
              <Route
                path="/commande/:orderId"
                element={
                  <Placeholder
                    title="Caisse"
                    subtitle="La page de paiement sera ajoutée à l'étape suivante : résumé de commande, paiement Flooz / Mix by Yas et suivi en temps réel."
                  />
                }
              />
              <Route
                path="/commandes"
                element={
                  <Placeholder
                    title="Mes commandes"
                    subtitle="L'historique de tes commandes et leur suivi apparaîtront ici."
                  />
                }
              />
              <Route
                path="/suivi/:orderId"
                element={
                  <Placeholder
                    title="Suivi de commande"
                    subtitle="Le suivi détaillé de ta commande avec la timeline de livraison sera disponible ici."
                  />
                }
              />
              <Route
                path="/compte"
                element={
                  <Placeholder
                    title="Récompenses"
                    subtitle="Tes points, ton palier, ta série de visites et tes limites de dépense seront ici."
                  />
                }
              />
              <Route
                path="/aide"
                element={
                  <Placeholder
                    title="Aide"
                    subtitle="FAQ, contact WhatsApp, délais de livraison et politique de remboursement arriveront ici."
                  />
                }
              />
              <Route
                path="*"
                element={
                  <Placeholder
                    title="Page introuvable"
                    subtitle="Cette page n'existe pas encore."
                  />
                }
              />
            </Routes>
          </Suspense>
        </main>

        <Footer />
        <BackToTop />
      </div>
    </BrowserRouter>
  );
}

export default App;

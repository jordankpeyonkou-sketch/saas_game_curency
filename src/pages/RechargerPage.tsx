import { useEffect, useState } from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { getCatalog, formatXof } from '@/api/client';
import { PurchaseModal } from '@/components/PurchaseModal';
import { Reveal } from '@/components/Reveal';
import type { Game } from '@/data/types';

export function RechargerPage() {
  const [catalog, setCatalog] = useState<Game[]>([]);
  const [modalGame, setModalGame] = useState<Game | null>(null);

  useEffect(() => {
    getCatalog().then(setCatalog);
  }, []);

  return (
    <div className="lg:pl-64">
      <div className="px-4 py-10 pt-24 lg:pt-10">
        <Reveal>
          <h1 className="text-3xl font-extrabold text-ink">Recharger</h1>
          <p className="mt-1 text-ink/50">Choisis ton jeu et ton pack pour recharger en un éclair.</p>
        </Reveal>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((game) => (
            <Reveal key={game.id} index={catalog.indexOf(game)}>
              <div className="overflow-hidden rounded-3xl bg-white shadow-soft transition-all hover:shadow-soft-lg">
                <img src={game.image} alt={game.name} className="h-40 w-full object-cover" />
                <div className="p-4">
                  <h3 className="text-xl font-extrabold text-ink">{game.name}</h3>
                  <div className="mt-3 space-y-2">
                    {game.packs.map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => setModalGame(game)}
                        className="flex w-full items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-left transition-colors hover:bg-rose-100"
                      >
                        <span className="text-sm font-bold text-ink">{pack.label}</span>
                        <span className="flex items-center gap-1 text-sm font-extrabold text-rose-600">
                          {formatXof(pack.priceXof)} <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                  {game.customEnabled && (
                    <button
                      onClick={() => setModalGame(game)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl gradient-brand py-2.5 text-sm font-extrabold text-white shadow-soft"
                    >
                      <Zap className="h-4 w-4" /> Montant libre
                    </button>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {modalGame && (
        <PurchaseModal game={modalGame} onClose={() => setModalGame(null)} />
      )}
    </div>
  );
}

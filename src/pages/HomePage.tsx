import { useEffect, useState } from 'react';
import {
  Zap, Gift, Trophy, Flame, ArrowRight, CheckCircle2,
  MousePointerClick, Smartphone, Rocket, Star, MessageCircle,
} from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { PurchaseModal } from '@/components/PurchaseModal';
import {
  getCatalog, loadLastPurchase, formatXof, getGameById,
} from '@/api/client';
import { getPopularPacks } from '@/data/catalog';
import type { Game } from '@/data/types';

const FALLBACK_STATS = [
  { label: 'Commandes livrées', value: 12840, suffix: '+' },
  { label: 'Temps moyen de livraison', value: 1.8, suffix: ' min', decimals: 1 },
  { label: 'Joueurs satisfaits', value: 98, suffix: '%' },
];

const TESTIMONIALS = [
  { name: 'Awa K.', text: 'Reçu mes diamants en moins de 2 minutes. Trop rapide !', rating: 5 },
  { name: 'Kossi M.', text: 'Le paiement Mix by Yas passe nickel. Je recommande à 100%.', rating: 5 },
  { name: 'Delali A.', text: 'Service au top, et les points fidélité c\'est un vrai plus.', rating: 4 },
  { name: 'Yao G.', text: 'Premier achat sans souci. Le pseudo s\'affiche avant de payer, sécurisant.', rating: 5 },
];

export function HomePage() {
  const [catalog, setCatalog] = useState<Game[]>([]);
  const [modalGame, setModalGame] = useState<Game | null>(null);
  const [modalPackId, setModalPackId] = useState<string | undefined>();
  const [lastPurchase, setLastPurchase] = useState(loadLastPurchase());

  useEffect(() => {
    getCatalog().then(setCatalog);
  }, []);

  function openModal(game: Game, packId?: string) {
    setModalPackId(packId);
    setModalGame(game);
  }

  function closeModal() {
    setModalGame(null);
    setModalPackId(undefined);
  }

  const quickBuyGame = lastPurchase ? getGameById(lastPurchase.gameId) : undefined;

  return (
    <div className="lg:pl-64">
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden px-4 pb-20 pt-28 lg:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-bold text-rose-600 shadow-soft backdrop-blur">
              <Flame className="h-4 w-4" /> Livraison en moins de 2 minutes
            </span>
          </Reveal>
          <Reveal index={1}>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-ink text-balance sm:text-5xl lg:text-6xl">
              Recharge tes jeux <span className="gradient-text">en un éclair</span>
            </h1>
          </Reveal>
          <Reveal index={2}>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink/60">
              Diamants Free Fire, UC PUBG. Paie avec Flooz ou Mix by Yas, reçois instantanément.
            </p>
          </Reveal>
          <Reveal index={3}>
            <button
              onClick={() => catalog[0] && openModal(catalog[0])}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl gradient-brand px-8 py-4 text-lg font-extrabold text-white shadow-soft-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Zap className="h-6 w-6" /> Recharger maintenant
            </button>
          </Reveal>
        </div>

        {/* Quick-buy strip */}
        <Reveal index={4}>
          <div className="mx-auto mt-10 max-w-3xl rounded-3xl bg-white/70 p-4 shadow-soft backdrop-blur">
            {quickBuyGame && lastPurchase ? (
              <button
                onClick={() => openModal(quickBuyGame, lastPurchase.packId || undefined)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 transition-colors hover:bg-rose-100"
              >
                <div className="flex items-center gap-3 text-left">
                  <Rocket className="h-5 w-5 text-rose-500" />
                  <div>
                    <span className="block text-xs font-bold text-rose-500">Racheter en 1 tap</span>
                    <span className="block text-sm font-bold text-ink">
                      {quickBuyGame.name} — {lastPurchase.label}
                    </span>
                  </div>
                </div>
                <span className="text-lg font-extrabold gradient-text">{formatXof(lastPurchase.priceXof)}</span>
              </button>
            ) : (
              <div>
                <p className="mb-3 text-center text-sm font-bold text-ink/50">Packs populaires</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {getPopularPacks(3).map(({ game, pack }) => (
                    <button
                      key={pack.id}
                      onClick={() => openModal(game, pack.id)}
                      className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-left transition-colors hover:bg-rose-100"
                    >
                      <div>
                        <span className="block text-xs text-ink/50">{game.name}</span>
                        <span className="block text-sm font-bold text-ink">{pack.label}</span>
                      </div>
                      <span className="font-extrabold text-rose-600">{formatXof(pack.priceXof)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {/* Game cards */}
      <section className="px-4 py-16">
        <Reveal className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-extrabold text-ink">Choisis ton jeu</h2>
          <p className="mt-2 text-center text-ink/50">Sélectionne et recharge en quelques secondes</p>
        </Reveal>
        <div className="mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-2">
          {catalog.map((game, i) => (
            <Reveal key={game.id} index={i}>
              <button
                onClick={() => openModal(game)}
                className="group relative w-full overflow-hidden rounded-3xl bg-white shadow-soft transition-all hover:shadow-soft-lg"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={game.image}
                    alt={game.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <h3 className="text-2xl font-extrabold text-white">{game.name}</h3>
                    <p className="text-sm text-white/80">
                      Dès {formatXof(Math.min(...game.packs.map((p) => p.priceXof)))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {game.packs.slice(0, 3).map((p) => (
                      <span key={p.id} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600">
                        {p.label}
                      </span>
                    ))}
                    {game.customEnabled && (
                      <span className="rounded-full bg-coral-100 px-2.5 py-1 text-xs font-bold text-coral-600">
                        Montant libre
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-rose-500 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white/50 px-4 py-16">
        <Reveal className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-extrabold text-ink">Comment ça marche</h2>
        </Reveal>
        <div className="mx-auto mt-10 max-w-5xl space-y-12">
          {[
            { icon: MousePointerClick, title: '1. Choisis', text: 'Sélectionne ton jeu et ton pack. Entre ton identifiant joueur, on vérifie ton pseudo automatiquement.', img: 'https://placehold.co/500x300/f43f5e/ffffff?text=Choisis' },
            { icon: Smartphone, title: '2. Paie avec Flooz ou Mix by Yas', text: 'Règle en mobile money directement depuis ton téléphone. Sécurisé, sans inscription.', img: 'https://placehold.co/500x300/fb923c/ffffff?text=Paie' },
            { icon: Rocket, title: '3. Reçois en moins de 2 minutes', text: 'Tes diamants ou UC sont livrés automatiquement sur ton compte de jeu. Tu reçois une confirmation.', img: 'https://placehold.co/500x300/f43f5e/ffffff?text=Recus' },
          ].map((step, i) => (
            <Reveal key={step.title} index={i}>
              <div className={`flex flex-col items-center gap-6 md:flex-row ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                <img src={step.img} alt="" className="w-full rounded-3xl shadow-soft md:w-1/2" />
                <div className="flex-1 text-center md:text-left">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl gradient-brand shadow-soft md:mx-0">
                    <step.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-ink">{step.title}</h3>
                  <p className="mt-2 text-ink/60">{step.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-16">
        <Reveal className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-6 rounded-3xl gradient-brand p-8 text-white shadow-soft-lg sm:grid-cols-3">
            {FALLBACK_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-extrabold">
                  <AnimatedCounter to={stat.value} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
                </div>
                <p className="mt-1 text-sm text-white/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonials */}
      <section className="bg-white/50 px-4 py-16">
        <Reveal className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-extrabold text-ink">Ils nous font confiance</h2>
        </Reveal>
        <Reveal index={1}>
          <div className="mx-auto mt-8 flex max-w-5xl snap-x snap-mandatory gap-4 overflow-x-auto pb-4 no-scrollbar">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="min-w-[280px] flex-1 snap-center rounded-3xl bg-white p-6 shadow-soft"
              >
                <div className="mb-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < t.rating ? 'fill-coral-400 text-coral-400' : 'text-rose-100'}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-ink/70">"{t.text}"</p>
                <p className="mt-3 font-bold text-ink">— {t.name}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Rewards teaser */}
      <section className="px-4 py-16">
        <Reveal className="mx-auto max-w-4xl">
          <div className="grid gap-6 rounded-3xl bg-white p-8 shadow-soft sm:grid-cols-3">
            {[
              { icon: Trophy, title: 'Paliers', text: 'Plus tu recharges, plus tu montes : Bronze, Argent, Or.' },
              { icon: Gift, title: 'Points', text: '1 point pour chaque 100 FCFA. Échange contre des recharges.' },
              { icon: Flame, title: 'Série de visites', text: 'Reviens chaque jour pour gagner des points bonus.' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-rose-50">
                  <item.icon className="h-7 w-7 text-rose-500" />
                </div>
                <h3 className="text-lg font-extrabold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm text-ink/60">{item.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Newsletter / WhatsApp */}
      <section className="px-4 pb-20">
        <Reveal className="mx-auto max-w-2xl">
          <div className="rounded-3xl gradient-brand p-8 text-center text-white shadow-soft-lg">
            <MessageCircle className="mx-auto h-10 w-10" />
            <h2 className="mt-3 text-2xl font-extrabold">Reste informé</h2>
            <p className="mt-1 text-white/80">Reçois les nouveautés et offres par WhatsApp ou email.</p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mx-auto mt-5 flex max-w-sm flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                placeholder="ton@email.com"
                className="flex-1 rounded-2xl border-0 px-4 py-3 text-sm font-semibold text-ink outline-none"
              />
              <button
                type="submit"
                className="rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-rose-600 transition-transform hover:scale-105 active:scale-95"
              >
                S'inscrire
              </button>
            </form>
            <p className="mt-3 flex items-center justify-center gap-1 text-xs text-white/70">
              <CheckCircle2 className="h-3.3 w-3.3" /> Pas de spam. Désinscription en 1 clic.
            </p>
          </div>
        </Reveal>
      </section>

      {modalGame && (
        <PurchaseModal
          game={modalGame}
          initialPackId={modalPackId}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

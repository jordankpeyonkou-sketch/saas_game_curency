import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Loader2, Zap, Package, Sliders } from 'lucide-react';
import type { Game, GamePack, ActiveEvent } from '@/data/types';
import { formatXof, getQuote, verifyPlayer, loadPlayerId, savePlayerId, computeQuoteSync, createOrder } from '@/api/client';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface PurchaseModalProps {
  game: Game;
  initialPackId?: string;
  events?: ActiveEvent[];
  onClose: () => void;
}

type VerifyState = 'idle' | 'loading' | 'ok' | 'error';
type Tab = 'packs' | 'custom';

export function PurchaseModal({ game, initialPackId, events = [], onClose }: PurchaseModalProps) {
  const navigate = useNavigate();
  const trapRef = useFocusTrap(true);

  const [tab, setTab] = useState<Tab>(game.customEnabled && !initialPackId ? 'packs' : 'packs');
  const [selectedPack, setSelectedPack] = useState<GamePack | undefined>(
    initialPackId ? game.packs.find((p) => p.id === initialPackId) : undefined
  );
  const [customUnits, setCustomUnits] = useState<number>(game.customMinUnits);
  const [playerId, setPlayerId] = useState(loadPlayerId());
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [pseudo, setPseudo] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [phone, setPhone] = useState('');
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [points, setPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const relevantEvents = useMemo(
    () => events.filter((ev) => ev.game_slugs.length === 0 || ev.game_slugs.includes(game.slug)),
    [events, game.slug],
  );

  const liveQuote = useMemo(() => {
    try {
      return computeQuoteSync(
        game.slug,
        selectedPack?.id,
        tab === 'custom' ? customUnits : undefined,
        relevantEvents,
      );
    } catch {
      return null;
    }
  }, [game.slug, selectedPack, tab, customUnits, relevantEvents]);

  useEffect(() => {
    if (!liveQuote) return;
    setQuoteTotal(liveQuote.totalXof);
    setPoints(liveQuote.pointsEarned);
    const id = setTimeout(() => {
      getQuote(game.slug, {
        packId: selectedPack?.id,
        customUnits: tab === 'custom' ? customUnits : undefined,
        events: relevantEvents,
      }).then((q) => {
        setQuoteTotal(q.totalXof);
        setPoints(q.pointsEarned);
      }).catch(() => {});
    }, 150);
    return () => clearTimeout(id);
  }, [liveQuote, game.slug, selectedPack, tab, customUnits, relevantEvents]);

  async function handleVerify() {
    if (!playerId.trim()) {
      setVerifyState('idle');
      return;
    }
    setVerifyState('loading');
    setVerifyError('');
    try {
      const res = await verifyPlayer(game.slug, playerId.trim());
      setPseudo(res.pseudo);
      setVerifyState('ok');
    } catch (e) {
      setVerifyState('error');
      setVerifyError(e instanceof Error ? e.message : 'Erreur de vérification');
    }
  }

  function handleCheckout() {
    setSubmitError('');
    if (verifyState !== 'ok') {
      setSubmitError('Vérifie ton identifiant joueur d\'abord.');
      return;
    }
    if (!phone.trim()) {
      setSubmitError('Entre ton numéro de téléphone.');
      return;
    }
    setSubmitting(true);
    createOrder({
        gameSlug: game.slug,
        packId: selectedPack?.id,
        customUnits: tab === 'custom' ? customUnits : undefined,
        playerId: playerId.trim(),
        phone: phone.trim(),
      })
        .then((order) => {
          savePlayerId(playerId.trim());
          navigate(`/commande/${order.orderId}`);
        })
        .catch((e) => {
          setSubmitError(e instanceof Error ? e.message : 'Erreur lors de la commande');
          setSubmitting(false);
        });
  }

  const quickChips = useMemo(() => {
    if (!game.customEnabled) return [];
    const steps = [game.customMinUnits, 500, 1000, 2000, game.customMaxUnits];
    return [...new Set(steps)].filter((s) => s >= game.customMinUnits && s <= game.customMaxUnits);
  }, [game]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={onClose} />

      <div
        ref={trapRef}
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-soft-lg animate-slide-up sm:max-w-lg sm:rounded-3xl sm:animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <img src={game.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <h2 className="font-extrabold text-ink leading-tight">{game.name}</h2>
              <p className="text-xs text-ink/50">Recharge en 2 minutes</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 hover:bg-rose-100">
            <X className="h-5 w-5 text-ink" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Player ID */}
          <label className="mb-1.5 block text-sm font-bold text-ink">Identifiant joueur</label>
          <div className="relative">
            <input
              type="text"
              value={playerId}
              onChange={(e) => {
                setPlayerId(e.target.value);
                setVerifyState('idle');
                setPseudo('');
              }}
              onBlur={handleVerify}
              placeholder="Ex: 123456789"
              className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 pr-10 text-sm font-semibold text-ink outline-none transition-colors focus:border-rose-400"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {verifyState === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-rose-400" />}
              {verifyState === 'ok' && <Check className="h-5 w-5 text-green-500" />}
            </div>
          </div>
          {verifyState === 'ok' && (
            <p className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-green-600">
              <Check className="h-4 w-4" /> Pseudo : {pseudo}
            </p>
          )}
          {verifyState === 'error' && (
            <p className="mt-1.5 text-sm font-semibold text-rose-500">{verifyError}</p>
          )}

          {/* Tabs */}
          {game.customEnabled && (
            <div className="mt-5 flex gap-2 rounded-2xl bg-rose-50 p-1">
              <button
                onClick={() => setTab('packs')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                  tab === 'packs' ? 'bg-white text-rose-600 shadow-soft' : 'text-ink/50'
                }`}
              >
                <Package className="h-4 w-4" /> Packs
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                  tab === 'custom' ? 'bg-white text-rose-600 shadow-soft' : 'text-ink/50'
                }`}
              >
                <Sliders className="h-4 w-4" /> Montant libre
              </button>
            </div>
          )}

          {/* Packs grid */}
          {tab === 'packs' && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {game.packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPack(pack)}
                  className={`relative flex flex-col items-start rounded-2xl border-2 p-4 text-left transition-all ${
                    selectedPack?.id === pack.id
                      ? 'border-rose-500 bg-rose-50 shadow-soft'
                      : 'border-rose-100 bg-white hover:border-rose-300'
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2 left-3 rounded-full gradient-brand px-2 py-0.5 text-[10px] font-bold text-white shadow-soft">
                      Populaire
                    </span>
                  )}
                  {pack.bonusLabel && (
                    <span className="mb-1 rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-bold text-coral-600">
                      {pack.bonusLabel}
                    </span>
                  )}
                  <span className="font-extrabold text-ink">{pack.label}</span>
                  <span className="mt-1 text-lg font-extrabold gradient-text">{formatXof(pack.priceXof)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Custom amount */}
          {tab === 'custom' && game.customEnabled && (
            <div className="mt-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm font-bold text-ink">Quantité</span>
                <span className="text-2xl font-extrabold gradient-text">{customUnits.toLocaleString('fr-FR')}</span>
              </div>
              <input
                type="range"
                min={game.customMinUnits}
                max={game.customMaxUnits}
                step={game.customStep}
                value={customUnits}
                onChange={(e) => setCustomUnits(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
              <div className="mt-1 flex justify-between text-xs text-ink/40">
                <span>{game.customMinUnits}</span>
                <span>{game.customMaxUnits}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setCustomUnits(chip)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      customUnits === chip
                        ? 'gradient-brand text-white shadow-soft'
                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    }`}
                  >
                    {chip.toLocaleString('fr-FR')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phone */}
          <label className="mt-5 mb-1.5 block text-sm font-bold text-ink">Téléphone (Flooz / Mix)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+228 90 00 00 00"
            className="w-full rounded-2xl border-2 border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-ink outline-none transition-colors focus:border-rose-400"
          />

          {liveQuote?.discounts.length ? (
            <div className="mt-3 space-y-1 rounded-2xl bg-green-50 p-3">
              {liveQuote.discounts.map((d) => (
                <div key={d.label} className="flex justify-between text-xs font-semibold text-green-700">
                  <span>{d.label}</span>
                  <span>-{formatXof(d.amountXof)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {submitError && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{submitError}</p>
          )}
        </div>

        {/* Sticky total bar */}
        <div className="border-t border-rose-100 bg-white px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="block text-xs text-ink/50">Total</span>
              <span className="text-2xl font-extrabold gradient-text">
                {quoteTotal != null ? formatXof(quoteTotal) : '...'}
              </span>
            </div>
            {points > 0 && (
              <span className="rounded-full bg-coral-100 px-3 py-1 text-xs font-bold text-coral-600">
                +{points} pts
              </span>
            )}
          </div>
          <button
            onClick={handleCheckout}
            disabled={submitting || !liveQuote}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand py-3.5 text-base font-extrabold text-white shadow-soft transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Passer à la caisse • {quoteTotal != null ? formatXof(quoteTotal) : '...'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

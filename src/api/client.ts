import { games, getGameBySlug, getGameById } from '@/data/catalog';
import type {
  Game,
  GamePack,
  Order,
  PlayerVerify,
  Quote,
  QuoteDiscount,
  ActiveEvent,
} from '@/data/types';

const STORAGE_KEYS = {
  catalog: 'kolo:catalog',
  lastOrder: 'kolo:lastOrder',
  phone: 'kolo:phone',
  playerId: 'kolo:playerId',
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatXof(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export function loadCatalogFromCache(): Game[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.catalog);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: Game[]; ts: number };
    const age = Date.now() - parsed.ts;
    const MAX_AGE = 1000 * 60 * 60;
    if (age > MAX_AGE) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function saveCatalogToCache(data: Game[]) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.catalog,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    /* ignore quota errors */
  }
}

export async function getCatalog(): Promise<Game[]> {
  const cached = loadCatalogFromCache();
  if (cached) {
    refreshCatalogInBackground();
    return cached;
  }
  await delay(250);
  saveCatalogToCache(games);
  return games;
}

function refreshCatalogInBackground() {
  setTimeout(() => saveCatalogToCache(games), 50);
}

const pseudoPool = [
  'ProGamer_TG', 'XxSniperxX', 'KingLion228', 'DarkAngel', 'FireBlaze',
  'NoobMaster', 'ShadowHunter', 'GoldenEagle', 'TogoWarrior', 'MysticWolf',
];

export async function verifyPlayer(gameSlug: string, playerId: string): Promise<PlayerVerify> {
  await delay(400);
  if (!playerId || playerId.trim().length < 4) {
    throw new Error('Identifiant joueur invalide. Vérifie et réessaie.');
  }
  void gameSlug;
  const seed = playerId
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pseudo = pseudoPool[seed % pseudoPool.length];
  savePlayerId(playerId);
  return { pseudo };
}

export function savePlayerId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.playerId, id);
  } catch {
    /* ignore */
  }
}

export function loadPlayerId(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.playerId) ?? '';
  } catch {
    return '';
  }
}

export function savePhone(phone: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.phone, phone);
  } catch {
    /* ignore */
  }
}

export function loadPhone(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.phone) ?? '';
  } catch {
    return '';
  }
}

interface SavedPurchase {
  gameId: string;
  packId: string;
  label: string;
  priceXof: number;
}

export function saveLastPurchase(p: SavedPurchase) {
  try {
    localStorage.setItem(STORAGE_KEYS.lastOrder, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function loadLastPurchase(): SavedPurchase | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.lastOrder);
    return raw ? (JSON.parse(raw) as SavedPurchase) : null;
  } catch {
    return null;
  }
}

const MAX_TOTAL_DISCOUNT_PERCENT = 30;

function eventLabel(ev: ActiveEvent): string {
  switch (ev.type) {
    case 'percent_discount': {
      const pct = ev.rules_json.percent as number;
      return `Événement : -${pct} %`;
    }
    case 'bonus_units': {
      const pct = ev.rules_json.percent as number;
      return `Événement : +${pct} % unités`;
    }
    case 'points_multiplier': {
      const factor = ev.rules_json.factor as number;
      return `Événement : ${factor}× points`;
    }
    default:
      return ev.title;
  }
}

function computeDiscounts(
  gameSlug: string,
  units: number,
  subtotal: number,
  events: ActiveEvent[] = [],
): { discounts: QuoteDiscount[]; bonusUnits: number; pointsMultiplier: number } {
  void gameSlug;
  const discounts: QuoteDiscount[] = [];
  if (units >= 1000) {
    discounts.push({ label: 'Bonus volume -5%', amountXof: Math.round(subtotal * 0.05) });
  }

  let bonusUnits = 0;
  let pointsMultiplier = 1;

  for (const ev of events) {
    if (ev.game_slugs.length > 0 && !ev.game_slugs.includes(gameSlug)) continue;
    if (ev.type === 'percent_discount') {
      const pct = Math.min(Math.max(ev.rules_json.percent as number, 1), 30);
      const amount = Math.round(subtotal * (pct / 100));
      discounts.push({ label: eventLabel(ev), amountXof: amount });
    } else if (ev.type === 'bonus_units') {
      const pct = Math.min(Math.max(ev.rules_json.percent as number, 1), 50);
      bonusUnits += Math.round(units * (pct / 100));
    } else if (ev.type === 'points_multiplier') {
      const factor = ev.rules_json.factor as number;
      if (factor === 2 || factor === 3) pointsMultiplier *= factor;
    }
  }

  const maxDiscount = Math.round(subtotal * (MAX_TOTAL_DISCOUNT_PERCENT / 100));
  let discountTotal = discounts.reduce((s, d) => s + d.amountXof, 0);
  if (discountTotal > maxDiscount) {
    const scale = maxDiscount / discountTotal;
    discounts.forEach((d) => (d.amountXof = Math.round(d.amountXof * scale)));
    discountTotal = maxDiscount;
  }

  return { discounts, bonusUnits, pointsMultiplier };
}

export function computeQuoteSync(
  gameSlug: string,
  packId?: string,
  customUnits?: number,
  events: ActiveEvent[] = [],
): Quote {
  const game = getGameBySlug(gameSlug);
  if (!game) throw new Error('Jeu introuvable.');

  let units: number;
  let subtotalXof: number;

  if (packId) {
    const pack = game.packs.find((p) => p.id === packId);
    if (!pack) throw new Error('Pack introuvable.');
    units = pack.units;
    subtotalXof = pack.priceXof;
  } else if (customUnits != null && game.customEnabled) {
    const step = game.customStep || 1;
    units = Math.round(customUnits / step) * step;
    units = Math.max(game.customMinUnits, Math.min(game.customMaxUnits, units));
    subtotalXof = units * game.customPricePerUnitXof;
  } else {
    throw new Error('Sélection invalide.');
  }

  const { discounts, bonusUnits, pointsMultiplier } = computeDiscounts(gameSlug, units, subtotalXof, events);
  const discountTotal = discounts.reduce((s, d) => s + d.amountXof, 0);
  const totalXof = subtotalXof - discountTotal;
  const pointsEarned = Math.floor((totalXof / 100) * pointsMultiplier);

  return { units, subtotalXof, discounts, totalXof, pointsEarned, bonusUnits: bonusUnits || undefined };
}

export async function getQuote(
  gameSlug: string,
  opts: { packId?: string; customUnits?: number; events?: ActiveEvent[] },
): Promise<Quote> {
  await delay(150);
  return computeQuoteSync(gameSlug, opts.packId, opts.customUnits, opts.events ?? []);
}

export async function createOrder(input: {
  gameSlug: string;
  packId?: string;
  customUnits?: number;
  playerId: string;
  phone: string;
  events?: ActiveEvent[];
}): Promise<Order> {
  await delay(300);
  const game = getGameBySlug(input.gameSlug);
  if (!game) throw new Error('Jeu introuvable.');

  const quote = computeQuoteSync(input.gameSlug, input.packId, input.customUnits, input.events ?? []);

  const orderId = 'demo-' + Math.random().toString(36).slice(2, 10);
  const publicToken = Math.random().toString(36).slice(2, 16);

  const packLabel = input.packId
    ? (game.packs.find((p) => p.id === input.packId)?.label ?? `${quote.units} unités`)
    : `${quote.units} unités`;

  saveLastPurchase({
    gameId: game.id,
    packId: input.packId ?? '',
    label: packLabel,
    priceXof: quote.totalXof,
  });
  savePhone(input.phone);

  return { orderId, publicToken };
}

export { games, getGameBySlug, getGameById };
export type { Game, GamePack };

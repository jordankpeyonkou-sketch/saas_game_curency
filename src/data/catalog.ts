import type { Game, GamePack } from './types';

export const games: Game[] = [
  {
    id: 'g-freefire',
    slug: 'freefire',
    name: 'Free Fire',
    image: 'https://placehold.co/600x400/f43f5e/ffffff?text=Free+Fire',
    accent: '#f43f5e',
    customEnabled: true,
    customMinUnits: 100,
    customMaxUnits: 8000,
    customStep: 100,
    customPricePerUnitXof: 7,
    packs: [
      { id: 'ff-100', label: '100 diamants', units: 100, priceXof: 700 },
      { id: 'ff-310', label: '310 diamants', units: 310, priceXof: 2100, bonusLabel: '+5% bonus' },
      { id: 'ff-520', label: '520 diamants', units: 520, priceXof: 3500, popular: true },
      { id: 'ff-1060', label: '1060 diamants', units: 1060, priceXof: 7000, bonusLabel: 'Meilleure valeur' },
    ],
  },
  {
    id: 'g-pubg',
    slug: 'pubg',
    name: 'PUBG Mobile',
    image: 'https://placehold.co/600x400/fb923c/ffffff?text=PUBG+Mobile',
    accent: '#fb923c',
    customEnabled: false,
    customMinUnits: 0,
    customMaxUnits: 0,
    customStep: 0,
    customPricePerUnitXof: 0,
    packs: [
      { id: 'pubg-60', label: '60 UC', units: 60, priceXof: 800 },
      { id: 'pubg-325', label: '325 UC', units: 325, priceXof: 4200, popular: true },
      { id: 'pubg-660', label: '660 UC', units: 660, priceXof: 8300, bonusLabel: '+10% bonus' },
      { id: 'pubg-1800', label: '1800 UC', units: 1800, priceXof: 21000, bonusLabel: 'Meilleure valeur' },
    ],
  },
];

export function getGameBySlug(slug: string): Game | undefined {
  return games.find((g) => g.slug === slug);
}

export function getPopularPacks(limit = 3): { game: Game; pack: GamePack }[] {
  return games
    .flatMap((g) => g.packs.filter((p) => p.popular).map((p) => ({ game: g, pack: p })))
    .slice(0, limit);
}

export function getGameById(id: string): Game | undefined {
  return games.find((g) => g.id === id);
}

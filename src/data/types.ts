export interface GamePack {
  id: string;
  label: string;
  units: number;
  priceXof: number;
  bonusLabel?: string;
  popular?: boolean;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  image: string;
  accent: string;
  customEnabled: boolean;
  customMinUnits: number;
  customMaxUnits: number;
  customStep: number;
  customPricePerUnitXof: number;
  packs: GamePack[];
}

export interface QuoteDiscount {
  label: string;
  amountXof: number;
}

export interface Quote {
  units: number;
  subtotalXof: number;
  discounts: QuoteDiscount[];
  totalXof: number;
  pointsEarned: number;
  bonusUnits?: number;
}

export interface ActiveEvent {
  id: string;
  title: string;
  slug: string;
  type: string;
  rules_json: Record<string, unknown>;
  game_slugs: string[];
  ends_at: string;
}

export interface Order {
  orderId: string;
  publicToken: string;
}

export interface PlayerVerify {
  pseudo: string;
}

export enum CardPoolType {
  Sealed = 'sealed',
  Draft = 'draft',
  Prerelease = 'prerelease',
}

export const CARD_POOL_BOOSTER_COUNTS = [6, 8] as const;
export type CardPoolBoosterCount = (typeof CARD_POOL_BOOSTER_COUNTS)[number];

export const DEFAULT_CARD_POOL_BOOSTER_COUNT: CardPoolBoosterCount = 6;
export const MAX_CUSTOM_CARD_POOL_SIZE = 250;

export enum CardPoolLocation {
  Deck = 'deck',
  Pool = 'pool',
  Trash = 'trash',
}

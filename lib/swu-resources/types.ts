import { SwuArena, SwuAspect, SwuRarity, SwuSet } from '../../types/enums.ts';

export interface ParsedCardData {
  swuId: number;
  cardId: string;
  updatedAt: string;
  title: string;
  subtitle?: string;
  name: string;
  artist: string;
  cardNo: number;
  thumbnail: string;
  hp: number | null;
  power: number | null;
  upgradeHp: number | null;
  upgradePower: number | null;
  text: string | null;
  rules: string | null;
  deployBox: string | null;
  epicAction: string | null;
  front: {
    horizontal?: boolean;
    image: string;
  };
  back: {
    horizontal?: boolean;
    image: string;
    type: string;
  } | null;
  set: SwuSet;
  aspects: SwuAspect[];
  type: string;
  cost: number | null;
  traits: string[];
  keywords: string[];
  arenas: SwuArena[];
  rarity: SwuRarity;
}

export interface CardVariant {
  variantId: string;
  swuId: number;
  set: SwuSet;
  fullSetName: string;
  cardNo: number;
  baseSet: boolean;
  hasNonfoil: boolean;
  hasFoil: boolean;
  variantName: string;
  artist: string;
  image: {
    front: string;
    back: string | null;
  };
}

export interface CardDataWithVariants<T = CardVariant[]> {
  cardId: string;
  updatedAt: string;
  variants: T;
  title: string;
  subtitle?: string;
  name: string;
  hp: number | null;
  power: number | null;
  upgradeHp: number | null;
  upgradePower: number | null;
  text: string | null;
  rules: string | null;
  deployBox: string | null;
  epicAction: string | null;
  front: {
    horizontal?: boolean;
  };
  back: {
    horizontal?: boolean;
    type: string;
  } | null;
  aspects: SwuAspect[];
  type: string;
  cost: number | null;
  traits: string[];
  keywords: string[];
  arenas: SwuArena[];
  rarity: SwuRarity;
}

export type CardListVariants = Record<string, CardVariant | undefined>;
export type CardList = Record<string, CardDataWithVariants<CardListVariants> | undefined>;

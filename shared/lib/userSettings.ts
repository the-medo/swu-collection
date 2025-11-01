import { DeckGroupBy, DeckLayout } from '../../types/enums.ts';
import { CardPriceSourceType } from '../../types/CardPrices.ts';
import { z } from 'zod';
import {
  type DeckImagePresets,
  DeckImagePresetVariant,
} from '../../types/DeckImageCustomization.tsx';
import { booleanPreprocessor } from './zod/booleanPreprocessor.ts';

export interface UserSettings {
  deckLayout: DeckLayout; // default: DeckLayout.TEXT
  deckGroupBy: DeckGroupBy; // default: DeckGroupBy.CARD_TYPE
  deckPrices: boolean; // default: false
  priceSourceType: CardPriceSourceType; // default CardPriceSourceType.CARDMARKET
  collectionInfoInDecks: boolean;
  // DeckImagePresets
  deckImage_showNoisyBackground: DeckImagePresets['showNoisyBackground'];
  deckImage_showcaseLeader: DeckImagePresets['showcaseLeader'];
  deckImage_hyperspaceBase: DeckImagePresets['hyperspaceBase'];
  deckImage_defaultVariantName: DeckImagePresets['defaultVariantName'];
  deckImage_groupBy: DeckImagePresets['groupBy'];
  deckImage_cardVariants: string;
  deckImage_exportWidth: number;
}

export const userSettingsSchema = z.object({
  deckLayout: z.enum(DeckLayout).default(DeckLayout.TEXT),
  deckGroupBy: z.enum(DeckGroupBy).default(DeckGroupBy.CARD_TYPE),
  deckPrices: booleanPreprocessor.default(false),
  priceSourceType: z.enum(CardPriceSourceType).default(CardPriceSourceType.CARDMARKET),
  collectionInfoInDecks: booleanPreprocessor.default(false),
  // DeckImagePresets
  deckImage_showNoisyBackground: booleanPreprocessor.default(true),
  deckImage_showcaseLeader: booleanPreprocessor.default(false),
  deckImage_hyperspaceBase: booleanPreprocessor.default(false),
  deckImage_defaultVariantName: z
    .enum(DeckImagePresetVariant)
    .default(DeckImagePresetVariant.Standard),
  deckImage_groupBy: z.enum(DeckGroupBy).default(DeckGroupBy.CARD_TYPE),
  deckImage_cardVariants: z.string().default('{}'),
  deckImage_exportWidth: z.number().default(2200),
});

export type UserSettingsSchema = z.infer<typeof userSettingsSchema>;

// Returns the default value for a property key as defined in the Zod schema
export function getDefaultSettingValue<K extends keyof UserSettings>(key: K): UserSettings[K] {
  // .parse({}) fills in all default values from the schema
  const defaults = userSettingsSchema.parse({});
  return defaults[key];
}

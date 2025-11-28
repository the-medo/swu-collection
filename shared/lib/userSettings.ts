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
  // Card Pool Layout options
  cpLayout_boxLayout: 'grid' | 'row';
  cpLayout_cardPreview: 'static' | 'hover';
  cpLayout_imageSize: 'big' | 'small';
  cpLayout_catPosition: 'top' | 'left'; // Cost/Aspect/Type position
  cpLayout_displayBoxTitles: boolean;
  cpLayout_displayStackTitles: boolean;
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
  // Card Pool Layout options
  cpLayout_boxLayout: z.union([z.literal('grid'), z.literal('row')]).default('grid'),
  cpLayout_cardPreview: z.union([z.literal('static'), z.literal('hover')]).default('static'),
  cpLayout_imageSize: z.union([z.literal('big'), z.literal('small')]).default('big'),
  cpLayout_deckInfoPosition: z.union([z.literal('top'), z.literal('left')]).default('top'),
  cpLayout_catPosition: z.union([z.literal('top'), z.literal('left')]).default('top'),
  cpLayout_displayBoxTitles: booleanPreprocessor.default(true),
  cpLayout_displayStackTitles: booleanPreprocessor.default(true),
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

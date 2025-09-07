import { DeckGroupBy, DeckLayout } from '../../types/enums.ts';
import { CardPriceSourceType } from '../../types/CardPrices.ts';
import { z } from 'zod';
import {
  type DeckImagePresets,
  DeckImagePresetVariant,
} from '../../frontend/src/components/app/decks/DeckContents/DeckImage/DeckImageCustomization/deckImageCustomizationLib.tsx';

export interface UserSettings {
  deckLayout: DeckLayout; // default: DeckLayout.TEXT
  deckGroupBy: DeckGroupBy; // default: DeckGroupBy.CARD_TYPE
  deckPrices: boolean; // default: false
  priceSourceType: CardPriceSourceType; // default CardPriceSourceType.CARDMARKET
  // DeckImagePresets
  deckImage_showNoisyBackground: DeckImagePresets['showNoisyBackground'];
  deckImage_showcaseLeader: DeckImagePresets['showcaseLeader'];
  deckImage_hyperspaceBase: DeckImagePresets['hyperspaceBase'];
  deckImage_defaultVariantName: DeckImagePresets['defaultVariantName'];
  deckImage_groupBy: DeckImagePresets['groupBy'];
  deckImage_cardVariants: string;
}

export const userSettingsSchema = z.object({
  deckLayout: z.nativeEnum(DeckLayout).default(DeckLayout.TEXT),
  deckGroupBy: z.nativeEnum(DeckGroupBy).default(DeckGroupBy.CARD_TYPE),
  deckPrices: z.boolean().default(false),
  priceSourceType: z.nativeEnum(CardPriceSourceType).default(CardPriceSourceType.CARDMARKET),
  // DeckImagePresets
  deckImage_showNoisyBackground: z.boolean().default(true),
  deckImage_showcaseLeader: z.boolean().default(false),
  deckImage_hyperspaceBase: z.boolean().default(false),
  deckImage_defaultVariantName: z
    .nativeEnum(DeckImagePresetVariant)
    .default(DeckImagePresetVariant.Standard),
  deckImage_groupBy: z.nativeEnum(DeckGroupBy).default(DeckGroupBy.CARD_TYPE),
  deckImage_cardVariants: z.string().default('{}'),
});

export type UserSettingsSchema = z.infer<typeof userSettingsSchema>;

// Returns the default value for a property key as defined in the Zod schema
export function getDefaultSettingValue<K extends keyof UserSettings>(key: K): UserSettings[K] {
  // .parse({}) fills in all default values from the schema
  const defaults = userSettingsSchema.parse({});
  return defaults[key];
}

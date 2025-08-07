import { DeckGroupBy, DeckLayout } from '../../types/enums.ts';
import { CardPriceSourceType } from '../../types/CardPrices.ts';
import { z } from 'zod';

export interface UserSettings {
  deckLayout: DeckLayout; // default: DeckLayout.TEXT
  deckGroupBy: DeckGroupBy; // default: DeckGroupBy.CARD_TYPE
  deckPrices: boolean; // default: false
  priceSourceType: CardPriceSourceType; // default CardPriceSourceType.CARDMARKET
}

export const userSettingsSchema = z.object({
  deckLayout: z.nativeEnum(DeckLayout).default(DeckLayout.TEXT),
  deckGroupBy: z.nativeEnum(DeckGroupBy).default(DeckGroupBy.CARD_TYPE),
  deckPrices: z.boolean().default(false),
  priceSourceType: z.nativeEnum(CardPriceSourceType).default(CardPriceSourceType.CARDMARKET),
});

export type UserSettingsSchema = z.infer<typeof userSettingsSchema>;

// Returns the default value for a property key as defined in the Zod schema
export function getDefaultSettingValue<K extends keyof UserSettings>(key: K): UserSettings[K] {
  // .parse({}) fills in all default values from the schema
  const defaults = userSettingsSchema.parse({});
  return defaults[key];
}

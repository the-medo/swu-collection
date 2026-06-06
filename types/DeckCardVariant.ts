import { z } from 'zod';

export const zDeckCardVariantCardId = z.string().trim().min(1);
export const zDeckCardVariantId = z.string().trim().min(1);
export const zDeckCardVariantMap = z.record(z.string(), z.string());

export const zDeckCardVariantMaps = z.object({
  deckOverrides: zDeckCardVariantMap.default({}),
  showEverywhereDefaults: zDeckCardVariantMap.default({}),
  cardVariants: zDeckCardVariantMap.default({}),
});

export const zDeckCardVariantMutation = z.object({
  cardId: zDeckCardVariantCardId,
  variantId: zDeckCardVariantId,
});

export const zDeckCardVariantDefaultMutation = zDeckCardVariantMutation.extend({
  showEverywhere: z.boolean().default(false),
});

export const zDeckCardVariantDefault = z.object({
  cardId: zDeckCardVariantCardId,
  variantId: zDeckCardVariantId,
  showEverywhere: z.boolean(),
});

export const zDeckCardVariantDefaultsMap = z.record(
  z.string(),
  z.object({
    variantId: zDeckCardVariantId,
    showEverywhere: z.boolean(),
  }),
);

export type DeckCardVariantMap = z.infer<typeof zDeckCardVariantMap>;
export type DeckCardVariantMaps = z.infer<typeof zDeckCardVariantMaps>;
export type DeckCardVariantMutation = z.infer<typeof zDeckCardVariantMutation>;
export type DeckCardVariantDefaultMutation = z.infer<typeof zDeckCardVariantDefaultMutation>;
export type DeckCardVariantDefault = z.infer<typeof zDeckCardVariantDefault>;
export type DeckCardVariantDefaultsMap = z.infer<typeof zDeckCardVariantDefaultsMap>;

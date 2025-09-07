import { DeckCardVariantMap } from '@/components/app/decks/DeckContents/DeckImage/deckImageLib.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useMemo } from 'react';

export function useDeckImageVariants(deckCardVariants: DeckCardVariantMap | undefined): {
  finalVariantMap: DeckCardVariantMap;
  cardIds: string[];
  variantOverrides: DeckCardVariantMap;
} {
  const { data: variantOverridesString } = useGetUserSetting('deckImage_cardVariants');

  const variantOverrides = useMemo(
    () => (variantOverridesString ? JSON.parse(variantOverridesString) : {}) as DeckCardVariantMap,
    [variantOverridesString],
  );

  return useMemo(() => {
    if (!deckCardVariants) return { finalVariantMap: {}, cardIds: [], variantOverrides };
    return {
      finalVariantMap: Object.fromEntries(
        Object.entries(deckCardVariants).map(([cardId, variantId]) => [
          cardId,
          variantOverrides[cardId] || variantId || undefined,
        ]),
      ) as DeckCardVariantMap,
      cardIds: Object.keys(deckCardVariants),
      variantOverrides,
    };
  }, [deckCardVariants, variantOverrides]);
}

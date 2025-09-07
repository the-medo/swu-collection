import * as React from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.tsx';
import { DeckCardVariantMap } from '@/components/app/decks/DeckContents/DeckImage/deckImageLib.ts';
import { useCallback } from 'react';
import { loadUserSetting } from '@/dexie/userSettings.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { DeckCardsUsed } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import CardVariantDialogSelector from './CardVariantDialogSelector.tsx';
import { useDeckImageVariants } from '@/components/app/decks/DeckContents/DeckImage/DeckImageCustomization/useDeckImageVariants.ts';

interface DeckImageCardVariantsProps {
  usedCards: DeckCardsUsed;
  deckCardVariants: DeckCardVariantMap | undefined;
}

const DeckImageCardVariants: React.FC<DeckImageCardVariantsProps> = ({
  usedCards,
  deckCardVariants,
}) => {
  const { finalVariantMap, cardIds, variantOverrides } = useDeckImageVariants(deckCardVariants);
  const { mutate: setVariantOverride } = useSetUserSetting('deckImage_cardVariants');

  const saveVariantOverride = useCallback(async (cardId: string, variantId: string | undefined) => {
    // we want to always check indexed DB for actual value, in case user works with multiple tabs (settings could be overwritten because of that from one tab value to another tab value)
    const currentValueString = await loadUserSetting('deckImage_cardVariants');
    if (currentValueString && typeof currentValueString === 'string') {
      const currentValue = JSON.parse(currentValueString);

      if (!variantId) {
        if (currentValue[cardId]) delete currentValue[cardId];
      } else {
        currentValue[cardId] = variantId;
      }

      setVariantOverride(JSON.stringify(currentValue));
    } else {
      throw new Error('Invalid user setting value');
    }
  }, []);

  return (
    <AccordionItem value="card-variants">
      <AccordionTrigger right className="font-semibold">
        Card variant overrides
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-3 gap-1 p-0">
          {cardIds.map(cardId => {
            const card = usedCards[cardId];
            const isOverride = !!variantOverrides?.[cardId];
            const variantId = finalVariantMap[cardId];
            return (
              <CardVariantDialogSelector
                key={cardId}
                cardId={cardId}
                variantId={variantId}
                card={card}
                saveVariantOverride={saveVariantOverride}
                setVariantOverride={setVariantOverride as unknown as (value: string) => void}
                isOverride={isOverride}
              />
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default DeckImageCardVariants;

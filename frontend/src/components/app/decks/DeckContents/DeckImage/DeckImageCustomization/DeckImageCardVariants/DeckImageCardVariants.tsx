import * as React from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.tsx';
import { DeckCardVariantMap } from '@/components/app/decks/DeckContents/DeckImage/deckImageLib.ts';
import { useCallback } from 'react';
import { loadUserSetting } from '@/dexie/userSettings.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { DeckCardsUsed } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import CardVariantDialogSelector from './CardVariantDialogSelector.tsx';
import { useDeckImageVariants } from '@/components/app/decks/DeckContents/DeckImage/DeckImageCustomization/useDeckImageVariants.ts';
import { Button } from '@/components/ui/button.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';

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
  const overridesCount = Object.keys(variantOverrides).filter(cid => !!finalVariantMap[cid]).length;

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

  const clearVariantOverrides = useCallback(async () => {
    const currentValueString = await loadUserSetting('deckImage_cardVariants');
    const usedCardIds = usedCards ? Object.keys(usedCards) : [];

    if (currentValueString && typeof currentValueString === 'string') {
      const currentValue = JSON.parse(currentValueString);

      usedCardIds.forEach(cid => {
        if (currentValue[cid]) delete currentValue[cid];
      });

      setVariantOverride(JSON.stringify(currentValue));
    } else {
      throw new Error('Invalid user setting value');
    }
  }, [usedCards]);

  return (
    <AccordionItem value="card-variants">
      <AccordionTrigger right className="font-semibold">
        Card variant overrides ({overridesCount || 0})
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2">
        <Alert variant="info">
          <AlertDescription className="text-xs flex flex-col gap-2">
            Card overrides are also saved for user and will be used for all deck images containing
            these cards.
            <div className="w-full flex justify-around">
              <Button
                variant="outline"
                size="sm"
                disabled={!overridesCount}
                onClick={e => {
                  e.preventDefault();
                  void clearVariantOverrides();
                }}
              >
                {`Clear overrides from this deck (${overridesCount || 0})`}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
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

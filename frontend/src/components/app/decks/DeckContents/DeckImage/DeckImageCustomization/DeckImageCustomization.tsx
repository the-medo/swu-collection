import * as React from 'react';
import { Accordion } from '@/components/ui/accordion';
import DeckImageCustomizationDefaults from './DeckImageCustomizationDefaults';
import DeckImageCardVariants from './DeckImageCardVariants/DeckImageCardVariants.tsx';
import { DeckCardVariantMap } from '@/components/app/decks/DeckContents/DeckImage/deckImageLib.ts';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';
import { useEffect } from 'react';
import { selectDefaultVariant } from '../../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

interface DeckImageCustomizationProps {
  deckId: string;
  open: boolean;
  deckCardVariants: DeckCardVariantMap | undefined;
  setDeckCardVariants: React.Dispatch<React.SetStateAction<DeckCardVariantMap | undefined>>;
}

const DeckImageCustomization: React.FC<DeckImageCustomizationProps> = ({
  deckId,
  open,
  deckCardVariants,
  setDeckCardVariants,
}) => {
  const {
    deckCardsForLayout,
    deckMeta: { leader1, leader2, base },
    isLoading,
  } = useDeckData(deckId);

  const { data: showcaseLeader } = useGetUserSetting('deckImage_showcaseLeader');
  const { data: hyperspaceBase } = useGetUserSetting('deckImage_hyperspaceBase');
  const { data: defaultVariantName } = useGetUserSetting('deckImage_defaultVariantName');

  useEffect(() => {
    if (isLoading) return;
    const baseMap: DeckCardVariantMap = Object.fromEntries(
      Object.entries(deckCardsForLayout.usedCards).map(([k, card]) => {
        return [k, card ? selectDefaultVariant(card) : undefined];
      }),
    );

    setDeckCardVariants(baseMap);
  }, [deckCardsForLayout.usedCards]);

  useEffect(() => {
    setDeckCardVariants(prev => {
      const newMap = { ...prev };
      if (leader1) {
        newMap[leader1.cardId] = selectDefaultVariant(
          leader1,
          showcaseLeader ? 'Showcase' : 'Standard',
        );
      }
      if (leader2) {
        newMap[leader2.cardId] = selectDefaultVariant(
          leader2,
          showcaseLeader ? 'Showcase' : 'Standard',
        );
      }
      return newMap;
    });
  }, [showcaseLeader, leader1, leader2]);

  useEffect(() => {
    setDeckCardVariants(prev => {
      const newMap = { ...prev };
      if (base) {
        newMap[base.cardId] = selectDefaultVariant(
          base,
          hyperspaceBase ? 'Hyperspace' : 'Standard',
        );
      }
      return newMap;
    });
  }, [hyperspaceBase, base]);

  useEffect(() => {
    setDeckCardVariants(prev => {
      const newMap = { ...prev };

      Object.entries(deckCardsForLayout.usedCards).forEach(([k, card]) => {
        if (!card || card.type === 'Leader' || card.type === 'Base') return;
        newMap[k] = selectDefaultVariant(card, defaultVariantName);
      });

      return newMap;
    });
  }, [defaultVariantName]);

  if (!open) return null;
  return (
    <div className="flex flex-1 flex-col w-full overflow-y-auto p-2 text-sm">
      <Accordion type="multiple" className="w-full mt-4" defaultValue={['defaults']}>
        <DeckImageCustomizationDefaults />
        <DeckImageCardVariants
          usedCards={deckCardsForLayout.usedCards}
          deckCardVariants={deckCardVariants}
        />
      </Accordion>
    </div>
  );
};

export default DeckImageCustomization;

import AdvancedCardSearch from '@/components/app/cards/AdvancedCardSearch/AdvancedCardSearch.tsx';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { useCallback, useEffect, useMemo } from 'react';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { SearchFrom } from '@/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts';
import { Link } from '@tanstack/react-router';
import DeckGradientButton from '@/components/app/decks/DeckContents/DeckImage/DeckGradientButton.tsx';
import { X } from 'lucide-react';
import * as React from 'react';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import DeckbuilderCardMenu from '@/components/app/decks/Deckbuilder/DeckbuilderCardMenu.tsx';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';

interface DeckbuilderProps {
  deckId: string;
}

const Deckbuilder: React.FC<DeckbuilderProps> = ({ deckId }) => {
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();

  const {
    deckCardsForLayout: { usedCardsInBoards },
  } = useDeckData(deckId);

  /**
   *  sidebarOpen is not in dependencies:
   *  - we take the first value from the store to know the initial state
   *  - when component unmounts, we set the sidebar back to the initial state
   *  */
  useEffect(() => {
    setSidebarOpen(false);
    return () => {
      setSidebarOpen(sidebarOpen);
    };
  }, []);

  const filtersFooterElement = useMemo(() => {
    return (
      <Link to="/decks/$deckId" params={{ deckId }} className="flex mt-2 w-full">
        <DeckGradientButton deckId={deckId} variant="outline" size="lg" className="w-full">
          <X />
          <h5 className="mb-0">Close deckbuilder</h5>
        </DeckGradientButton>
      </Link>
    );
  }, [deckId]);

  const cardSubcomponent = useCallback(
    (card: CardDataWithVariants<CardListVariants> | undefined) => {
      if (!card) return null;
      const cardId = card.cardId;

      const deckCard = {
        deckId,
        cardId,
        board: 1,
        quantity: usedCardsInBoards?.[cardId]?.[1] ?? 0,
      };

      return (
        <DeckbuilderCardMenu
          deckId={deckId}
          deckCard={deckCard}
          card={card}
          cardInBoards={usedCardsInBoards?.[cardId] ?? undefined}
        />
      );
    },
    [deckId, usedCardsInBoards],
  );

  return (
    <AdvancedCardSearch
      searchFrom={SearchFrom.DECKBUILDER}
      childrenTitleButtonText="Decklist"
      filtersFooterElement={filtersFooterElement}
      cardSubcomponent={cardSubcomponent}
    >
      <div className="flex flex-1 flex-col">
        <DeckDetail adminEdit={true} deckId={deckId} deckbuilder={true} />
      </div>
    </AdvancedCardSearch>
  );
};

export default Deckbuilder;

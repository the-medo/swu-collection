import AdvancedCardSearch from '@/components/app/cards/AdvancedCardSearch/AdvancedCardSearch.tsx';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useDeckInfo } from '@/components/app/decks/DeckContents/useDeckInfoStore.ts';
import { AdvancedCardSearchContextConfig } from '@/components/app/cards/AdvancedCardSearch/advancedSearchContext.ts';

interface DeckbuilderProps {
  deckId: string;
}

const Deckbuilder: React.FC<DeckbuilderProps> = ({ deckId }) => {
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const initialSidebarOpen = useRef(sidebarOpen);

  const {
    deckCardsForLayout: { usedCardsInBoards },
  } = useDeckData(deckId);

  const { editable } = useDeckInfo(deckId);

  useEffect(() => {
    const previousSidebarOpen = initialSidebarOpen.current;
    setSidebarOpen(false);
    return () => {
      setSidebarOpen(previousSidebarOpen);
    };
  }, [setSidebarOpen]);

  const filtersFooterElement = useMemo(() => {
    return (
      <Link to="/decks/$deckId" params={{ deckId }} className="flex mt-2 w-full">
        <DeckGradientButton deckId={deckId} variant="outline" size="lg" className="w-full">
          <X />
          <h5 className="mb-0!">Close deckbuilder</h5>
        </DeckGradientButton>
      </Link>
    );
  }, [deckId]);

  const searchContext = useMemo<AdvancedCardSearchContextConfig>(
    () => ({
      availableCardTypes: {
        Unit: true,
        Event: true,
        Upgrade: true,
      },
      excludedCardTypes: {
        Leader: true,
        Base: true,
      },
      defaultValues: {
        sortField: 'relevance',
        sortOrder: 'asc',
      },
    }),
    [],
  );

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
          editable={editable}
          cardInBoards={usedCardsInBoards?.[cardId] ?? undefined}
        />
      );
    },
    [deckId, usedCardsInBoards, editable],
  );

  return (
    <AdvancedCardSearch
      searchFrom={SearchFrom.DECKBUILDER}
      childrenTitleButtonText="Decklist"
      filtersFooterElement={filtersFooterElement}
      cardSubcomponent={cardSubcomponent}
      searchContext={searchContext}
    >
      <div className="flex flex-1 flex-col">
        <DeckDetail adminEdit={true} deckId={deckId} deckbuilder={true} />
      </div>
    </AdvancedCardSearch>
  );
};

export default Deckbuilder;

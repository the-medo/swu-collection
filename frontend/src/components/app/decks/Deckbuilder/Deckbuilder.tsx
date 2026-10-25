import AdvancedCardSearch from '@/components/app/cards/AdvancedCardSearch/AdvancedCardSearch.tsx';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { SearchFrom } from '@/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
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
import MostPlayedCards from './MostPlayedCards.tsx';
import MostPlayedCardsToggle from './MostPlayedCardsToggle.tsx';

interface DeckbuilderProps {
  deckId: string;
}

const Deckbuilder: React.FC<DeckbuilderProps> = ({ deckId }) => {
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const initialSidebarOpen = useRef(sidebarOpen);
  const [mostPlayedOpen, setMostPlayedOpen] = useState(false);

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
      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full border-[var(--workspace-border)]"
        asChild
      >
        <Link to="/decks/$deckId" params={{ deckId }}>
          <X className="size-3.5" /> Close deckbuilder
        </Link>
      </Button>
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
      resultsHeader={
        <MostPlayedCardsToggle
          active={mostPlayedOpen}
          onClick={() => setMostPlayedOpen(open => !open)}
        />
      }
      alternativeResults={
        mostPlayedOpen
          ? {
              title: 'Most played cards',
              content: <MostPlayedCards deckId={deckId} cardSubcomponent={cardSubcomponent} />,
            }
          : undefined
      }
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <DeckDetail adminEdit={true} deckId={deckId} deckbuilder={true} />
      </div>
    </AdvancedCardSearch>
  );
};

export default Deckbuilder;

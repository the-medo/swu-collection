import AdvancedCardSearch from '@/components/app/cards/AdvancedCardSearch/AdvancedCardSearch.tsx';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { useEffect, useMemo } from 'react';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { SearchFrom } from '@/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts';
import { Link } from '@tanstack/react-router';
import DeckGradientButton from '@/components/app/decks/DeckContents/DeckImage/DeckGradientButton.tsx';
import { X } from 'lucide-react';
import * as React from 'react';

interface DeckbuilderProps {
  deckId: string;
}

const Deckbuilder: React.FC<DeckbuilderProps> = ({ deckId }) => {
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();

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

  return (
    <AdvancedCardSearch
      searchFrom={SearchFrom.DECKBUILDER}
      childrenTitleButtonText="Decklist"
      filtersFooterElement={filtersFooterElement}
    >
      <div className="flex flex-1 flex-col">
        <DeckDetail adminEdit={true} deckId={deckId} deckbuilder={true} />
      </div>
    </AdvancedCardSearch>
  );
};

export default Deckbuilder;

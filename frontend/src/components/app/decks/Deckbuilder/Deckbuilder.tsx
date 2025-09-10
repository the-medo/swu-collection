import AdvancedCardSearch from '@/components/app/cards/AdvancedCardSearch/AdvancedCardSearch.tsx';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { useEffect } from 'react';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { SearchFrom } from '@/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts';

interface DeckbuilderProps {
  deckId: string;
}

const Deckbuilder: React.FC<DeckbuilderProps> = ({ deckId }) => {
  const { setOpen: setSidebarOpen } = useSidebar();

  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <AdvancedCardSearch searchFrom={SearchFrom.DECKBUILDER} childrenTitleButtonText="Decklist">
      <div className="flex flex-1 flex-col">
        <DeckDetail adminEdit={true} deckId={deckId} deckbuilder={true} />
      </div>
    </AdvancedCardSearch>
  );
};

export default Deckbuilder;

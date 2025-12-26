import * as React from 'react';
import DeckAvatar from '@/components/app/global/DeckAvatar/DeckAvatar.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Swords } from 'lucide-react';
import DeckMatches from '@/components/app/decks/DeckContents/DeckMatches/DeckMatches.tsx';

interface DeckTitleBarCompactProps {
  deckId: string;
  setDeckId?: (id: string) => void;
}

const DeckTitleBarCompact: React.FC<DeckTitleBarCompactProps> = ({ deckId, setDeckId }) => {
  const { data } = useGetDeck(deckId);

  const name = (data?.deck.name ?? '').replace(/\s*\[[^[\]]*\]\s*$/, '');

  return (
    <div className="w-full flex items-center justify-between gap-3 py-1 -mt-3 pr-10">
      <div className="flex items-center gap-3 py-1">
        <DeckAvatar deck={data?.deck} size="50" />
        <h6 className="mb-0! truncate">{name}</h6>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8">
            <Swords className="h-4 w-4" />
            <span>Matches</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <DeckMatches deckId={deckId} setDeckId={setDeckId} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DeckTitleBarCompact;

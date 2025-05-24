import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Button } from '@/components/ui/button.tsx';
import { MoreHorizontal, Crown, X, ExternalLink } from 'lucide-react';
import { queryClient } from '@/queryClient.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useComparerStoreActions } from '@/components/app/comparer/useComparerStore.ts';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';

interface DeckColumnMenuProps {
  deckId: string;
  isMainDeck: boolean;
}

/**
 * Popover menu for deck columns in the comparer
 */
const DeckColumnMenu: React.FC<DeckColumnMenuProps> = ({ deckId, isMainDeck }) => {
  const { setMainId, removeComparerEntry } = useComparerStoreActions();
  const { data: cardList } = useCardList();

  // Get deck data from cache
  const deckData = queryClient.getQueryData<any>(['deck', deckId]);

  // Get leader and base card IDs
  const leaderCardId1 = deckData?.deck?.leaderCardId1;
  const leaderCardId2 = deckData?.deck?.leaderCardId2;
  const baseCardId = deckData?.deck?.baseCardId;

  // Get leader and base card data
  const leaderCard1 = leaderCardId1 ? cardList?.cards[leaderCardId1] : null;
  const leaderCard2 = leaderCardId2 ? cardList?.cards[leaderCardId2] : null;
  const baseCard = baseCardId ? cardList?.cards[baseCardId] : null;

  // Handle actions
  const handleSetAsMain = () => {
    setMainId(deckId);
  };

  const handleRemoveFromComparer = () => {
    removeComparerEntry(deckId);
  };

  const handleOpenDeckList = () => {
    window.open(`/decks/${deckId}`, '_blank');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col gap-4">
          <div className="text-center font-medium">{deckData?.deck?.name || 'Deck'}</div>

          <div className="flex gap-2 justify-center">
            {leaderCard1 && (
              <CardImage
                card={leaderCard1}
                cardVariantId={selectDefaultVariant(leaderCard1)}
                forceHorizontal={true}
                size="w100"
              />
            )}
            {leaderCard2 && (
              <CardImage
                card={leaderCard2}
                cardVariantId={selectDefaultVariant(leaderCard2)}
                forceHorizontal={true}
                size="w100"
              />
            )}
            {baseCard && (
              <CardImage
                card={baseCard}
                cardVariantId={selectDefaultVariant(baseCard)}
                forceHorizontal={true}
                size="w100"
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            {!isMainDeck && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleSetAsMain}
              >
                <Crown className="mr-2 h-4 w-4" />
                Mark as main entry
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleRemoveFromComparer}
            >
              <X className="mr-2 h-4 w-4" />
              Remove from comparer
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleOpenDeckList}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open decklist in new tab
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DeckColumnMenu;

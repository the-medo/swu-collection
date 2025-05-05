import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { formatDataById } from '../../../../../../types/Format.ts';
import DeckCards from '@/components/app/decks/DeckContents/DeckCards/DeckCards.tsx';
import DeckInputCommand from '@/components/app/decks/DeckContents/DeckInputCommand/DeckInputCommand.tsx';
import { useDeckInfo } from './useDeckLayoutStore.ts';
import { usePutDeck } from '@/api/decks/usePutDeck.ts';
import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast.ts';
import DeckActions from '@/components/app/decks/DeckActions/DeckActions.tsx';
import DeckLayoutSelector from '@/components/app/decks/DeckContents/DeckLayoutSelector/DeckLayoutSelector.tsx';
import DeckBoardCardCounts from '@/components/app/decks/DeckContents/DeckBoardCardCounts/DeckBoardCardCounts.tsx';
import DeckMatches from '@/components/app/decks/DeckContents/DeckMatches/DeckMatches.tsx';

interface DeckContentsProps {
  deckId: string;
}

const DeckContents: React.FC<DeckContentsProps> = ({ deckId }) => {
  const { data } = useGetDeck(deckId);
  const { format, owned } = useDeckInfo(deckId);
  const putDeckMutation = usePutDeck(deckId);

  const updateDeck = useCallback(
    (data: {
      leaderCardId1?: string | null;
      leaderCardId2?: string | null;
      baseCardId?: string | null;
    }) => {
      putDeckMutation.mutate(data, {
        onSuccess: () => {
          toast({
            title: `Deck updated!`,
          });
        },
      });
    },
    [],
  );

  const deckFormatInfo = formatDataById[format];

  return (
    <div className="flex max-xl:flex-col justify-center flex-wrap sm:flex-nowrap gap-2 w-full">
      <div className="flex max-xl:flex-row max-xl:flex-wrap max-xl:justify-center flex-col gap-2">
        <LeaderSelector
          trigger={null}
          leaderCardId={data?.deck.leaderCardId1 ?? undefined}
          onLeaderSelected={(cardId: string | undefined) =>
            updateDeck({ leaderCardId1: cardId ?? null })
          }
          editable={owned}
          size="w300"
        />
        {deckFormatInfo.leaderCount === 2 && (
          <LeaderSelector
            trigger={null}
            leaderCardId={data?.deck.leaderCardId2 ?? undefined}
            onLeaderSelected={(cardId: string | undefined) =>
              updateDeck({ leaderCardId2: cardId ?? null })
            }
            editable={owned}
            size="w300"
          />
        )}
        <BaseSelector
          trigger={null}
          baseCardId={data?.deck.baseCardId ?? undefined}
          onBaseSelected={(cardId: string | undefined) =>
            updateDeck({ baseCardId: cardId ?? null })
          }
          editable={owned}
          size="w300"
        />

        <DeckActions deckId={deckId} />
        <DeckMatches deckId={deckId} />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-wrap justify-between gap-4 max-lg:justify-center max-lg:border-t max-lg:pt-2 border-b pb-2">
          {owned && <DeckInputCommand deckId={deckId} />}
          <div className="flex flex-wrap gap-4 items-center max-lg:justify-center">
            <DeckBoardCardCounts deckId={deckId} />
            <DeckLayoutSelector />
          </div>
        </div>
        <DeckCards deckId={deckId} />
      </div>
    </div>
  );
};

export default DeckContents;

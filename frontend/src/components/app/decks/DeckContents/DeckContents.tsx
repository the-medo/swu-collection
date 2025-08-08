import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { formatDataById } from '../../../../../../types/Format.ts';
import DeckCards from '@/components/app/decks/DeckContents/DeckCards/DeckCards.tsx';
import DeckInputCommand from '@/components/app/decks/DeckContents/DeckInputCommand/DeckInputCommand.tsx';
import { useDeckInfo } from './useDeckInfoStore.ts';
import { usePutDeck } from '@/api/decks/usePutDeck.ts';
import { useCallback, useState } from 'react';
import { toast } from '@/hooks/use-toast.ts';
import DeckActionsMenu from '@/components/app/decks/DeckContents/DeckActionsMenu/DeckActionsMenu.tsx';
import DeckBoardCardCounts from '@/components/app/decks/DeckContents/DeckBoardCardCounts/DeckBoardCardCounts.tsx';
import DeckMatches from '@/components/app/decks/DeckContents/DeckMatches/DeckMatches.tsx';
import DeckStats from '@/components/app/decks/DeckContents/DeckStats/DeckStats.tsx';

interface DeckContentsProps {
  deckId: string;
  setDeckId?: (id: string) => void;
  highlightedCardId?: string;
}

const DeckContents: React.FC<DeckContentsProps> = ({ deckId, setDeckId, highlightedCardId }) => {
  const { data } = useGetDeck(deckId);
  const { format, owned } = useDeckInfo(deckId);
  const putDeckMutation = usePutDeck(deckId);
  const [tabsValue, setTabsValue] = useState('decklist');

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
    <>
      <DeckActionsMenu deckId={deckId} tabsValue={tabsValue} onTabsValueChange={setTabsValue} />
      <div className="flex max-xl:flex-col justify-center flex-wrap sm:flex-nowrap gap-2 w-full">
        <div className="flex max-xl:flex-row max-xl:flex-wrap max-xl:justify-center max-xl:w-auto w-[350px] flex-col gap-2">
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

          <DeckMatches deckId={deckId} setDeckId={setDeckId} />
        </div>
        <div className="w-full">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-wrap justify-between gap-4 max-lg:justify-center max-lg:border-t max-lg:pt-2 border-b pb-2">
              {owned && <DeckInputCommand deckId={deckId} />}
              <div className="flex flex-wrap gap-4 items-center max-lg:justify-center w-full">
                <DeckBoardCardCounts deckId={deckId} />
              </div>
            </div>

            {tabsValue === 'decklist' && (
              <DeckCards deckId={deckId} highlightedCardId={highlightedCardId} />
            )}
            {tabsValue === 'charts' && <DeckStats deckId={deckId} />}
          </div>
        </div>
      </div>
    </>
  );
};

export default DeckContents;

import * as React from 'react';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { formatDataById } from '../../../../../../types/Format.ts';
import { usePutDeck } from '@/api/decks/usePutDeck.ts';
import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast.ts';
import { CardImageVariantProps } from '@/components/app/global/CardImage.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useDeckInfo } from '@/components/app/decks/DeckContents/useDeckInfoStore.ts';

interface DeckLeaderBaseProps {
  deckId: string;
  size?: CardImageVariantProps['size'];
}

const DeckLeaderBase: React.FC<DeckLeaderBaseProps> = ({ deckId, size = 'w200' }) => {
  const { data } = useGetDeck(deckId);
  const { format, owned } = useDeckInfo(deckId);
  const deckFormatInfo = formatDataById[format];

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

  return (
    <>
      <LeaderSelector
        trigger={null}
        leaderCardId={data?.deck.leaderCardId1 ?? undefined}
        onLeaderSelected={(cardId: string | undefined) =>
          updateDeck({ leaderCardId1: cardId ?? null })
        }
        editable={owned}
        size={size}
      />
      {deckFormatInfo.leaderCount === 2 && (
        <LeaderSelector
          trigger={null}
          leaderCardId={data?.deck.leaderCardId2 ?? undefined}
          onLeaderSelected={(cardId: string | undefined) =>
            updateDeck({ leaderCardId2: cardId ?? null })
          }
          editable={owned}
          size={size}
        />
      )}
      <BaseSelector
        trigger={null}
        baseCardId={data?.deck.baseCardId ?? undefined}
        onBaseSelected={(cardId: string | undefined) => updateDeck({ baseCardId: cardId ?? null })}
        editable={owned}
        size={size}
      />
    </>
  );
};

export default DeckLeaderBase;

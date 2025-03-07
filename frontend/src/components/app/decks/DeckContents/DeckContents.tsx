import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { formatDataById } from '../../../../../../types/Format.ts';
import DeckCards from '@/components/app/decks/DeckContents/DeckCards/DeckCards.tsx';
import DeckInputCommand from '@/components/app/decks/DeckContents/DeckInputCommand/DeckInputCommand.tsx';

interface DeckContentsProps {
  deckId: string;
}

const DeckContents: React.FC<DeckContentsProps> = ({ deckId }) => {
  const user = useUser();
  const { data } = useGetDeck(deckId);
  const owned = user?.id === data?.user?.id;

  const deckFormatInfo = formatDataById[data?.deck.format ?? 1];

  return (
    <div className="flex max-xl:flex-col justify-center flex-wrap sm:flex-nowrap gap-2 w-full">
      <div className="flex max-xl:flex-row max-xl:flex-wrap max-xl:justify-center flex-col gap-2">
        <LeaderSelector
          trigger={null}
          leaderCardId={data?.deck.leaderCardId1 ?? undefined}
          editable={owned}
          size="w300"
        />
        {deckFormatInfo.leaderCount === 2 && (
          <LeaderSelector
            trigger={null}
            leaderCardId={data?.deck.leaderCardId2 ?? undefined}
            editable={owned}
            size="w300"
          />
        )}
        <BaseSelector
          trigger={null}
          baseCardId={data?.deck.baseCardId ?? undefined}
          editable={owned}
          size="w300"
        />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <DeckInputCommand deckId={deckId} />
        <DeckCards deckId={deckId} />
      </div>
    </div>
  );
};

export default DeckContents;

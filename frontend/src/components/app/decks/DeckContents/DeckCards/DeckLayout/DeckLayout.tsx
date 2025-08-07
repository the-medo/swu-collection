import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import DeckLayoutText from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutText/DeckLayoutText.tsx';
import DeckLayoutVisualGrid from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutVisualGrid/DeckLayoutVisualGrid.tsx';
import DeckLayoutVisualStacks from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutVisualGrid/DeckLayoutVisualStacks.tsx';
import { DeckLayout as DeckLayoutEnum } from '../../../../../../../../types/enums.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

interface DeckLayoutProps {
  deckId: string;
  deckCardsForLayout: DeckCardsForLayout;
  highlightedCardId?: string;
}

const DeckLayout: React.FC<DeckLayoutProps> = ({
  deckId,
  deckCardsForLayout,
  highlightedCardId,
}) => {
  const { data: layout } = useGetUserSetting('deckLayout');

  switch (layout) {
    case DeckLayoutEnum.TEXT:
      return (
        <DeckLayoutText
          variant="normal"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
          highlightedCardId={highlightedCardId}
        />
      );
    case DeckLayoutEnum.TEXT_CONDENSED:
      return (
        <DeckLayoutText
          variant="compact"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
          highlightedCardId={highlightedCardId}
        />
      );
    case DeckLayoutEnum.VISUAL_GRID_OVERLAP:
      return (
        <DeckLayoutVisualGrid
          variant="overlap"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
          highlightedCardId={highlightedCardId}
        />
      );
    case DeckLayoutEnum.VISUAL_GRID:
      return (
        <DeckLayoutVisualGrid
          variant="no-overlap"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
          highlightedCardId={highlightedCardId}
        />
      );
    case DeckLayoutEnum.VISUAL_STACKS:
      return (
        <DeckLayoutVisualStacks
          variant="normal"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
          highlightedCardId={highlightedCardId}
        />
      );
    case DeckLayoutEnum.VISUAL_STACKS_SPLIT:
      return (
        <DeckLayoutVisualStacks
          variant="split"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
          highlightedCardId={highlightedCardId}
        />
      );
    default:
      return null;
  }
};

export default DeckLayout;

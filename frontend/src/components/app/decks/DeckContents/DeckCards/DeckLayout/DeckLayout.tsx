import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import {
  DeckLayout as DeckLayoutEnum,
  useDeckLayoutStore,
} from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import DeckLayoutText from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutText/DeckLayoutText.tsx';
import DeckLayoutVisualGrid from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutVisualGrid/DeckLayoutVisualGrid.tsx';
import DeckLayoutVisualStacks from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutVisualGrid/DeckLayoutVisualStacks.tsx';

interface DeckLayoutProps {
  deckId: string;
  deckCardsForLayout: DeckCardsForLayout;
}

const DeckLayout: React.FC<DeckLayoutProps> = ({ deckId, deckCardsForLayout }) => {
  const { layout } = useDeckLayoutStore();

  switch (layout) {
    case DeckLayoutEnum.TEXT:
      return (
        <DeckLayoutText variant="normal" deckId={deckId} deckCardsForLayout={deckCardsForLayout} />
      );
    case DeckLayoutEnum.TEXT_CONDENSED:
      return (
        <DeckLayoutText variant="compact" deckId={deckId} deckCardsForLayout={deckCardsForLayout} />
      );
    case DeckLayoutEnum.VISUAL_GRID_OVERLAP:
      return (
        <DeckLayoutVisualGrid
          variant="overlap"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
        />
      );
    case DeckLayoutEnum.VISUAL_GRID:
      return (
        <DeckLayoutVisualGrid
          variant="no-overlap"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
        />
      );
    case DeckLayoutEnum.VISUAL_STACKS:
      return (
        <DeckLayoutVisualStacks
          variant="normal"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
        />
      );
    case DeckLayoutEnum.VISUAL_STACKS_SPLIT:
      return (
        <DeckLayoutVisualStacks
          variant="split"
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
        />
      );
    default:
      return null;
  }
};

export default DeckLayout;

import React from 'react';
import {
  DeckMissingCountKey,
  useDeckMissingCardsStore,
} from '@/components/app/decks/DeckContents/DeckCollection/useDeckMissingCardsStore.ts';
import CircledNumberValue from '@/components/app/global/CircledNumberValue.tsx';

interface NumericCellProps {
  val?: number;
  k: DeckMissingCountKey;
}

const NumericCell: React.FC<NumericCellProps> = ({ val, k }) => {
  const enabled = useDeckMissingCardsStore(k);
  const v = val ?? 0;

  const bg = v > 0 ? (enabled ? 'green' : 'muted') : 'none';
  const strong = v > 0;

  return (
    <div
      className={`w-full h-full hidden @[550px]/missing-cards-table:flex items-center justify-end px-1`}
    >
      <CircledNumberValue val={v} strong={strong} background={bg} />
    </div>
  );
};

export default NumericCell;

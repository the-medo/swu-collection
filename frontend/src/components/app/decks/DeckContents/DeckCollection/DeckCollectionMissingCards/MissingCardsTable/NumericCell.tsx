import React from 'react';
import { DeckMissingCountKey, useDeckMissingCardsStore } from '@/components/app/decks/DeckContents/DeckCollection/useDeckMissingCardsStore.ts';

interface NumericCellProps {
  val?: number;
  k: DeckMissingCountKey;
}

const NumericCell: React.FC<NumericCellProps> = ({ val, k }) => {
  const enabled = useDeckMissingCardsStore(k);
  const v = val ?? 0;

  // Background styling rules based on value and toggle
  // Using Tailwind palette: light green when enabled & >0, muted when disabled & >0, none when 0
  const bg = v > 0 ? (enabled ? 'bg-emerald-200/70 dark:bg-emerald-300/30' : 'bg-muted') : '';
  const strong = v > 0 ? 'font-semibold' : '';

  return (
    <div className={`w-full h-full hidden @[550px]/missing-cards-table:flex items-center justify-end px-1`}>
      <div className={`h-7 w-7 rounded-full ${bg} ${strong} text-foreground flex items-center justify-center`}>{v}</div>
    </div>
  );
};

export default NumericCell;

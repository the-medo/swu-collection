import * as React from 'react';
import ComparisonTable from './ComparisonTable.tsx';
import { comparerTableStyles as styles } from './comparerTableStyles.ts';
import { useState } from 'react';
import { ComparerSettings } from '@/components/app/comparer/useComparerStore.ts';
import { CardComparisonData } from '../types.ts';
import { CardListResponse } from '@/api/lists/useCardList.ts';
import {
  DeckComparerCardGroup,
  DeckComparerDeck,
  DeckComparerTotals,
  DeckComparerTotalsMap,
} from '@/components/app/comparer/ComparerPage/DeckComparer/types.ts';
import ViewRowDeckHeader from './ViewRowDeck/ViewRowDeckHeader.tsx';
import ViewRowDeckRow from './ViewRowDeck/ViewRowDeckRow.tsx';
import ViewRowDeckAverageRow from './ViewRowDeck/ViewRowDeckAverageRow.tsx';

interface ViewRowDeckProps {
  allDecks: DeckComparerDeck[];
  allCardGroups: DeckComparerCardGroup[];
  cardListData: CardListResponse | undefined;
  cardComparisons: CardComparisonData[];
  groupTotals:
    | {
        mainDeck: DeckComparerTotalsMap;
        sideboard: DeckComparerTotalsMap;
      }
    | undefined;
  deckTotals: DeckComparerTotals | undefined;
  settings: ComparerSettings;
}

const ViewRowDeck: React.FC<ViewRowDeckProps> = ({
  allDecks,
  allCardGroups,
  cardListData,
  cardComparisons,
  groupTotals,
  deckTotals,
  settings,
}) => {
  // State for tracking hovered row and column
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  return (
    <ComparisonTable deckCount={allDecks.length}>
      <table className={styles.table}>
        <caption className="sr-only">Deck quantities and differences by card</caption>
        <ViewRowDeckHeader
          allCardGroups={allCardGroups}
          cardListData={cardListData}
          setHoveredColumn={setHoveredColumn}
        />
        <tbody>
          {/* One row per deck */}
          {allDecks.map(deck => (
            <ViewRowDeckRow
              key={deck.id}
              deck={deck}
              allCardGroups={allCardGroups}
              cardComparisons={cardComparisons}
              groupTotals={groupTotals}
              deckTotals={deckTotals}
              hoveredRow={hoveredRow}
              setHoveredRow={setHoveredRow}
              hoveredColumn={hoveredColumn}
              setHoveredColumn={setHoveredColumn}
              diffDisplayMode={settings.diffDisplayMode}
            />
          ))}

          {/* Average row */}
          <ViewRowDeckAverageRow
            allDecks={allDecks}
            allCardGroups={allCardGroups}
            cardComparisons={cardComparisons}
            groupTotals={groupTotals}
            deckTotals={deckTotals}
            hoveredRow={hoveredRow}
            setHoveredRow={setHoveredRow}
            hoveredColumn={hoveredColumn}
            setHoveredColumn={setHoveredColumn}
            diffDisplayMode={settings.diffDisplayMode}
          />
        </tbody>
      </table>
    </ComparisonTable>
  );
};

export default ViewRowDeck;

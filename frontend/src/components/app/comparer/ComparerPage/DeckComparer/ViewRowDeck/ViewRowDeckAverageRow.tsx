import * as React from 'react';
import QuantityValue from '../QuantityValue.tsx';
import { comparerTableStyles as styles } from '../comparerTableStyles.ts';
import { cn } from '@/lib/utils.ts';
import { CardComparisonData } from '../../types.ts';
import { calculateAverage } from '../ViewRowCard/lib.ts';
import {
  DeckComparerCardGroup,
  DeckComparerDeck,
  DeckComparerTotals,
  DeckComparerTotalsMap,
} from '../types.ts';
import { DiffDisplayMode } from '../../../../../../../../types/enums.ts';

interface ViewRowDeckAverageRowProps {
  allDecks: DeckComparerDeck[];
  allCardGroups: DeckComparerCardGroup[];
  cardComparisons: CardComparisonData[];
  groupTotals:
    | {
        mainDeck: DeckComparerTotalsMap;
        sideboard: DeckComparerTotalsMap;
      }
    | undefined;
  deckTotals: DeckComparerTotals | undefined;
  hoveredRow: string | null;
  setHoveredRow: (rowId: string | null) => void;
  hoveredColumn: number | null;
  setHoveredColumn: (columnIndex: number | null) => void;
  diffDisplayMode?: DiffDisplayMode;
}

const ViewRowDeckAverageRow: React.FC<ViewRowDeckAverageRowProps> = ({
  allDecks,
  allCardGroups,
  cardComparisons,
  groupTotals,
  deckTotals,
  hoveredRow,
  setHoveredRow,
  hoveredColumn,
  setHoveredColumn,
  diffDisplayMode = DiffDisplayMode.COUNT_AND_DIFF,
}) => {
  const otherDeckIds = allDecks.filter(deck => !deck.isMain).map(deck => deck.id);
  const average = (values: number[]) => (values.length ? calculateAverage(values).avg : 0);

  return (
    <tr
      className="bg-muted/50 font-medium"
      onMouseEnter={() => setHoveredRow('average-row')}
      onMouseLeave={() => setHoveredRow(null)}
    >
      <th
        scope="row"
        className={cn(styles.name, 'border-t bg-muted')}
        onMouseEnter={() => setHoveredColumn(null)}
      >
        Average{' '}
        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
          {allDecks.length} decks
        </span>
      </th>
      {allCardGroups.map((group, groupIndex) => {
        const cardIds = [...new Set(group.cards.map(card => card.cardId))];
        if (!cardIds.length) return null;
        const totals = groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id];
        return (
          <React.Fragment key={`${group.board}-${group.id}`}>
            <td
              className={cn(styles.number, styles.summary, 'border-t')}
              onMouseEnter={() => setHoveredColumn(null)}
            >
              <QuantityValue
                quantity={average(totals?.allTotals || [])}
                mainQuantity={totals?.mainDeckTotal || 0}
                mode={diffDisplayMode}
                average
              />
            </td>
            {cardIds.map((cardId, cardIndex) => {
              const columnIndex = groupIndex * 100 + cardIndex + 1;
              const card = cardComparisons.find(
                c => c.cardId === cardId && c.board === group.board,
              );
              const mainQty = card?.mainDeckQuantity || 0;
              const quantities = [
                mainQty,
                ...otherDeckIds.map(id => card?.otherDecksQuantities[id] || 0),
              ];
              return (
                <td
                  key={cardId}
                  className={cn(
                    styles.number,
                    'border-t',
                    (hoveredRow === 'average-row' || hoveredColumn === columnIndex) && styles.hover,
                  )}
                  onMouseEnter={() => setHoveredColumn(columnIndex)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <QuantityValue
                    quantity={average(quantities)}
                    mainQuantity={mainQty}
                    mode={diffDisplayMode}
                    average
                  />
                </td>
              );
            })}
          </React.Fragment>
        );
      })}
      <td
        className={cn(styles.number, styles.summary, 'border-t')}
        onMouseEnter={() => setHoveredColumn(null)}
      >
        <QuantityValue
          quantity={average(deckTotals?.allTotals || [])}
          mainQuantity={deckTotals?.mainDeckTotal || 0}
          mode={diffDisplayMode}
          average
        />
      </td>
    </tr>
  );
};

export default ViewRowDeckAverageRow;

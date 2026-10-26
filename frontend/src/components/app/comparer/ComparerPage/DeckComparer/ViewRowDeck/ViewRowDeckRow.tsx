import * as React from 'react';
import { Crown } from 'lucide-react';
import QuantityValue from '../QuantityValue.tsx';
import { comparerTableStyles as styles } from '../comparerTableStyles.ts';
import { cn } from '@/lib/utils.ts';
import { CardComparisonData } from '../../types.ts';
import DeckColumnMenu from '@/components/app/comparer/ComparerPage/DeckComparer/DeckColumnMenu.tsx';
import { DeckComparerCardGroup, DeckComparerDeck, DeckComparerTotalsMap } from '../types.ts';
import { DiffDisplayMode } from '../../../../../../../../types/enums.ts';

interface ViewRowDeckRowProps {
  deck: DeckComparerDeck;
  allCardGroups: DeckComparerCardGroup[];
  cardComparisons: CardComparisonData[];
  groupTotals:
    | {
        mainDeck: DeckComparerTotalsMap;
        sideboard: DeckComparerTotalsMap;
      }
    | undefined;
  deckTotals:
    | {
        mainDeckTotal: number;
        otherDeckTotals: Record<string, number>;
        allTotals: number[];
      }
    | undefined;
  hoveredRow: string | null;
  setHoveredRow: (rowId: string | null) => void;
  hoveredColumn: number | null;
  setHoveredColumn: (columnIndex: number | null) => void;
  diffDisplayMode?: DiffDisplayMode;
}

const ViewRowDeckRow: React.FC<ViewRowDeckRowProps> = ({
  deck,
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
  return (
    <tr
      className={hoveredRow === deck.id || deck.isMain ? styles.hover : 'even:bg-muted/20'}
      onMouseEnter={() => setHoveredRow(deck.id)}
      onMouseLeave={() => setHoveredRow(null)}
    >
      <th
        scope="row"
        className={cn(
          styles.name,
          'border-b border-border/40',
          deck.isMain && styles.group,
          hoveredRow === deck.id && styles.hover,
        )}
        onMouseEnter={() => setHoveredColumn(-1)}
        onMouseLeave={() => setHoveredColumn(null)}
      >
        <div className="flex items-center gap-1.5">
          {deck.isMain && (
            <Crown
              className="size-3 shrink-0 text-[var(--workspace-accent)]"
              aria-label="Main deck"
            />
          )}
          <span className="min-w-0 flex-1 truncate" title={deck.name}>
            {deck.name}
          </span>
          <DeckColumnMenu deckId={deck.id} isMainDeck={deck.isMain} deckName={deck.name} />
        </div>
      </th>
      {allCardGroups.map((group, groupIndex) => {
        const cardIds = [...new Set(group.cards.map(card => card.cardId))];
        if (!cardIds.length) return null;
        const totals = groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id];
        const mainTotal = totals?.mainDeckTotal || 0;
        const total = deck.isMain ? mainTotal : totals?.otherDeckTotals[deck.id] || 0;
        return (
          <React.Fragment key={`${group.board}-${group.id}`}>
            <td
              className={cn(styles.number, styles.summary)}
              onMouseEnter={() => setHoveredColumn(null)}
            >
              <QuantityValue quantity={total} mainQuantity={mainTotal} mode={diffDisplayMode} />
            </td>
            {cardIds.map((cardId, cardIndex) => {
              const columnIndex = groupIndex * 100 + cardIndex + 1;
              const card = cardComparisons.find(
                c => c.cardId === cardId && c.board === group.board,
              );
              const mainQty = card?.mainDeckQuantity || 0;
              const quantity = deck.isMain ? mainQty : card?.otherDecksQuantities[deck.id] || 0;
              return (
                <td
                  key={cardId}
                  className={cn(styles.number, hoveredColumn === columnIndex && styles.hover)}
                  onMouseEnter={() => setHoveredColumn(columnIndex)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <QuantityValue
                    quantity={quantity}
                    mainQuantity={mainQty}
                    mode={diffDisplayMode}
                  />
                </td>
              );
            })}
          </React.Fragment>
        );
      })}
      <td className={cn(styles.number, styles.summary)} onMouseEnter={() => setHoveredColumn(null)}>
        {deck.isMain ? deckTotals?.mainDeckTotal || 0 : deckTotals?.otherDeckTotals[deck.id] || 0}
      </td>
    </tr>
  );
};

export default ViewRowDeckRow;

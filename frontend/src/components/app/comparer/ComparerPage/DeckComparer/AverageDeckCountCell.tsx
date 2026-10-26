import { Input } from '@/components/ui/input.tsx';
import { cn } from '@/lib/utils.ts';
import type { CardComparisonData } from '../types.ts';
import { averageDeckRowKey, isValidDeckCount, type AverageDeckEditor } from './averageDeckDraft.ts';
import type { DeckBoard } from '../../../../../../../types/DeckFromList.ts';
import { comparerTableStyles as styles } from './comparerTableStyles.ts';

const AverageDeckCountCell = ({
  card,
  cardName,
  editor,
}: {
  card: CardComparisonData;
  cardName: string;
  editor: AverageDeckEditor;
}) => {
  const key = averageDeckRowKey(card);
  const entry = editor.entries[key];
  const label = `${cardName} (${card.board === 1 ? 'main deck' : 'sideboard'})`;
  return (
    <td
      className={cn(
        styles.number,
        'border-l border-[var(--workspace-border)] bg-[var(--workspace-soft)]',
      )}
    >
      <div className="flex items-center justify-center gap-1">
        <Input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          aria-label={`Deck count for ${label}`}
          aria-invalid={!isValidDeckCount(entry.quantity)}
          value={entry.quantity}
          disabled={editor.disabled}
          onChange={event => editor.update(key, { ...entry, quantity: event.target.value })}
          className="h-6 w-12 rounded-sm bg-card px-1 text-center text-xs md:text-xs aria-invalid:border-destructive"
        />
        <select
          aria-label={`Board for ${label}`}
          title="MD: Main deck · SB: Sideboard · MB: Maybeboard"
          value={entry.board}
          disabled={editor.disabled}
          onChange={event =>
            editor.update(key, { ...entry, board: Number(event.target.value) as DeckBoard })
          }
          className="h-6 w-12 rounded-sm border border-input bg-card px-0.5 text-[10px] font-medium focus-visible:outline-2 focus-visible:outline-ring"
        >
          <option value={1}>MD</option>
          <option value={2}>SB</option>
          <option value={3}>MB</option>
        </select>
      </div>
    </td>
  );
};

export default AverageDeckCountCell;

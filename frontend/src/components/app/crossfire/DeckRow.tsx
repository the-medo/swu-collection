import { Check, Eye } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button.tsx';
import DeckPreviewDialog from '@/components/app/decks/DeckPreviewDialog.tsx';
import type { CrossfireDeckSummary } from '../../../../../shared/types/crossfire-decks.ts';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import { MatchupArtwork } from '@/components/app/global/MatchupCard.tsx';
import { deckCardName } from './presentation.ts';

export function DeckRow({
  deck,
  selected,
  disabled,
  catalog,
  onSelect,
  appearance = 'crossfire',
}: {
  deck: CrossfireDeckSummary;
  selected: boolean;
  disabled: boolean;
  catalog?: CardList;
  onSelect: (id: string) => void;
  appearance?: 'crossfire' | 'connection';
}) {
  const connection = appearance === 'connection';
  const descriptionId = useId();
  return (
    <div className={connection ? '@container relative min-w-0' : 'cf-deck-option'}>
      <button
        type="button"
        className={
          connection
            ? 'relative isolate flex min-h-28 w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-border bg-background py-3 pl-24 pr-12 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-[var(--creator-accent)] aria-pressed:bg-[var(--creator-soft)] disabled:opacity-60 [&_[data-matchup-side]]:scale-55 @min-[440px]:pl-40 @min-[440px]:[&_[data-matchup-side]]:scale-100'
            : 'cf-deck-row'
        }
        aria-label={
          connection
            ? `${selected ? 'Connected' : 'Connect'} deck: ${deck.name || 'Untitled deck'}`
            : undefined
        }
        aria-pressed={selected}
        aria-describedby={connection ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onSelect(deck.id)}
      >
        <MatchupArtwork leaderCardId={deck.leaderId} baseCardKey={deck.baseId} />
        <span
          className={
            connection
              ? 'relative z-10 min-w-0 flex-1 [&>strong]:block [&>strong]:break-words [&>strong]:text-[13px] [&>span]:mt-1 [&>span]:block [&>span]:text-[11px] [&>span]:text-muted-foreground [&>small]:mt-1 [&>small]:block [&>small]:text-[10px] [&>small]:text-muted-foreground'
              : 'cf-deck-row-copy'
          }
        >
          <strong>{deck.name || 'Untitled deck'}</strong>
          <span id={descriptionId}>
            {deckCardName(catalog, deck.leaderId) || 'No leader'} ·{' '}
            {deckCardName(catalog, deck.baseId) || 'No base'}
          </span>
          <small>By {deck.author}</small>
        </span>
        <span
          className={
            connection
              ? 'absolute bottom-3 right-3 z-10 grid size-5 shrink-0 place-items-center rounded-full border border-border text-[var(--creator-accent)]'
              : 'cf-deck-row-check'
          }
        >
          {selected && <Check size={13} />}
        </span>
      </button>
      <DeckPreviewDialog
        deckId={deck.id}
        compact={false}
        trigger={
          <Button
            type="button"
            size="iconSmall"
            variant="ghost"
            className={
              connection
                ? 'absolute right-2 top-3 z-20 text-muted-foreground'
                : 'cf-deck-preview-button'
            }
            aria-label={`View decklist: ${deck.name || 'Untitled deck'}`}
            title="View decklist"
          >
            <Eye size={15} />
          </Button>
        }
      />
    </div>
  );
}

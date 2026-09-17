import { Check, Eye } from 'lucide-react';
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
}: {
  deck: CrossfireDeckSummary;
  selected: boolean;
  disabled: boolean;
  catalog?: CardList;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="cf-deck-option">
      <button
        type="button"
        className="cf-deck-row"
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onSelect(deck.id)}
      >
        <MatchupArtwork leaderCardId={deck.leaderId} baseCardKey={deck.baseId} />
        <span className="cf-deck-row-copy">
          <strong>{deck.name || 'Untitled deck'}</strong>
          <span>
            {deckCardName(catalog, deck.leaderId) || 'No leader'} ·{' '}
            {deckCardName(catalog, deck.baseId) || 'No base'}
          </span>
          <small>By {deck.author}</small>
        </span>
        <span className="cf-deck-row-check">{selected && <Check size={13} />}</span>
      </button>
      <DeckPreviewDialog
        deckId={deck.id}
        compact={false}
        trigger={
          <Button
            type="button"
            size="iconSmall"
            variant="ghost"
            className="cf-deck-preview-button"
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

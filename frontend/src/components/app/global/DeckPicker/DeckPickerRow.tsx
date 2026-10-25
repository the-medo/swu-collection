import { Check, Eye } from 'lucide-react';
import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork.tsx';
import DeckPreviewDialog from '@/components/app/decks/DeckPreviewDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';

export type DeckPickerChoice = {
  id: string;
  name: string;
  leaderId?: string | null;
  baseId?: string | null;
  author?: string;
};

export function DeckPickerRow({
  deck,
  selected,
  disabled,
  onSelect,
}: {
  deck: DeckPickerChoice;
  selected?: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  const name = deck.name || 'Untitled deck';
  return (
    <div
      className={cn(
        'relative min-w-0 rounded-lg border bg-card transition-colors hover:border-primary/40',
        selected && 'border-primary/60 bg-primary/5',
      )}
    >
      <button
        type="button"
        aria-label={`Select deck: ${name}`}
        aria-pressed={!!selected}
        disabled={disabled}
        onClick={() => onSelect(deck.id)}
        className="flex min-h-14 w-full min-w-0 items-center gap-2 rounded-lg py-1 pl-2 pr-18 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50"
      >
        <LeaderBaseArtwork leaderId={deck.leaderId} baseKey={deck.baseId} size="compact" />
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-[13px] font-semibold" title={name}>
            {name}
          </strong>
          {deck.author && (
            <span className="block truncate text-[11px] text-muted-foreground">{deck.author}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-3 grid size-4 place-items-center rounded-full border',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30',
          )}
        >
          {selected && <Check className="size-3" />}
        </span>
      </button>
      <DeckPreviewDialog
        deckId={deck.id}
        compact={false}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="iconSmall"
            className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={`View decklist: ${name}`}
            title="View decklist"
          >
            <Eye size={15} />
          </Button>
        }
      />
    </div>
  );
}
